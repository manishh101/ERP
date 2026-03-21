import { PrismaClient } from '@prisma/client';
import { getCurrentFiscalYear, getBsDate } from '../shared/fiscal-year.util';
import { ApiError } from '../utils/api-error';
import { toNumber } from '../utils/number';
import { postSalesOrderJournalEntry } from './accounting.service';

const prisma = new PrismaClient();

function calculateTotals(lineItems: any[]) {
  const subtotal = lineItems.reduce((sum: number, item: any) => {
     const lineTotal = item.quantity * item.unitPrice;
     return sum + lineTotal - lineTotal * ((item.discountPct || 0) / 100);
  }, 0);
  return subtotal;
}

export const salesOrderService = {
  createOrder: async (data: any, userId?: string) => {
    const result = await prisma.$transaction(async (tx) => {
      const orderAmount = calculateTotals(data.lineItems);
      const depositAmount = data.depositAmount || 0;
      const balanceDue = Math.max(orderAmount - depositAmount, 0);

      const fiscalYear = getCurrentFiscalYear();
      const bsDate = getBsDate();

      const order = await tx.salesOrder.create({
        data: {
          customerId: data.customerId,
          assignedWarehouseId: data.assignedWarehouseId,
          salespersonId: data.salespersonId ?? userId,
          status: data.status,
          orderAmount,
          depositAmount,
          balanceDue,
          deliveryDate: data.deliveryDate,
          fiscalYear,
          bsDate,
          notes: data.notes,
          lineItems: {
            create: data.lineItems.map((item: any) => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: item.discountPct,
            })),
          },
        },
        include: {
          customer: true,
          lineItems: true,
        },
      });

      // Post to AR Ledger (Debit)
      const lastEntry = await tx.arLedger.findFirst({
        where: { customerId: data.customerId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });
      const newBalance = (lastEntry?.runningBalance ? Number(lastEntry.runningBalance) : 0) + orderAmount;

      await tx.arLedger.create({
        data: {
          customerId: data.customerId,
          salesOrderId: order.id,
          entryType: 'DEBIT',
          amount: orderAmount,
          runningBalance: newBalance,
          fiscalYear,
          bsDate,
          entryDate: new Date(),
          narration: `Sales Order`
        }
      });

      // Update Customer running balance
      await tx.customer.update({
        where: { id: data.customerId },
        data: { outstandingBalance: newBalance }
      });

      return { order, orderAmount };
    });

    // Add Sales Order entry to general ledger
    await postSalesOrderJournalEntry({
      salesOrderId: result.order.id,
      total: result.orderAmount,
      createdById: data.salespersonId ?? userId,
    });

    return result;
  },

  confirmOrder: async (id: string, userId?: string) => {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lineItems: true },
    });

    if (!order) throw new ApiError(404, "Sales order not found");

    const confirmedStatus = toNumber(order.depositAmount) > 0 ? "DEPOSIT_PAID" : "CONFIRMED";

    return prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: confirmedStatus },
      });

      if (order.assignedWarehouseId) {
        for (const item of order.lineItems) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.productVariantId } });
          if (!variant) continue;

          await tx.stockMovement.create({
            data: {
              productVariantId: item.productVariantId,
              warehouseId: order.assignedWarehouseId,
              userId,
              type: "RESERVATION",
              quantity: -item.quantity,
              balanceAfter: variant.stockQuantity - item.quantity, // Reservation reduces available stock
              source: `SO:${order.id}`,
            }
          });
        }
      }
      return updated;
    });
  },

  cancelOrder: async (id: string, userId?: string) => {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { lineItems: true, arLedger: true },
    });

    if (!order) throw new ApiError(404, "Sales order not found");
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new ApiError(400, "Cannot cancel order in current status");
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.salesOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });

      // Release stock if reserved
      if (["CONFIRMED", "DEPOSIT_PAID", "IN_WAREHOUSE", "PAID"].includes(order.status) && order.assignedWarehouseId) {
        for (const item of order.lineItems) {
          const variant = await tx.productVariant.findUnique({ where: { id: item.productVariantId } });
          if (!variant) continue;

          await tx.stockMovement.create({
            data: {
              productVariantId: item.productVariantId,
              warehouseId: order.assignedWarehouseId,
              userId,
              type: "RELEASE",
              quantity: item.quantity,
              balanceAfter: variant.stockQuantity + item.quantity,
              source: `CANCELLED:SO:${order.id}`,
            }
          });
        }
      }

      // Reverse AR Ledger entry if not already reversed
      const lastEntry = await tx.arLedger.findFirst({
        where: { customerId: order.customerId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });
      const reversalAmount = Number(order.orderAmount);
      const newBalance = (lastEntry?.runningBalance ? Number(lastEntry.runningBalance) : 0) - reversalAmount;

      await tx.arLedger.create({
        data: {
          customerId: order.customerId,
          salesOrderId: order.id,
          entryType: 'CREDIT',
          amount: reversalAmount,
          runningBalance: newBalance,
          fiscalYear: getCurrentFiscalYear(),
          bsDate: getBsDate(),
          entryDate: new Date(),
          narration: `Order Cancelled Reversal: ${order.id}`
        }
      });

      await tx.customer.update({
        where: { id: order.customerId },
        data: { outstandingBalance: newBalance }
      });

      return updated;
    });
  }
};
