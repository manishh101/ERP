import { prisma } from "../../config/prisma";
import { Prisma, SalesOrderStatus } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { postDebit } from "../ar-ledger/ar-ledger.service";
import { recordPayment } from "../payments/payment.service";

/**
 * Sales Order Service
 * Responsible for commercial truth (quoted amount, actual items).
 */

export async function createOrder(input: {
  customerId: string;
  lineItems: Array<{ 
    productVariantId: string; 
    quantity: number; 
    unitPrice: number; 
    discountPct?: number 
  }>;
  depositAmount?: number;
  paymentMethod?: any; // Required if depositAmount > 0
  deliveryDate?: Date;
  notes?: string;
  bsDate: string;
  fiscalYear: string;
  assignedWarehouseId?: string;
  salespersonId?: string;
  // Furniture specific
  isCustomOrder?: boolean;
  expectedReadyDate?: Date;
  assemblyNotes?: string;
  deliveryFloor?: number;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Compute orderAmount = sum of line items
    let orderAmount = 0;
    for (const item of input.lineItems) {
      const price = Number(item.unitPrice);
      const discount = item.discountPct ? Number(item.discountPct) : 0;
      orderAmount += item.quantity * price * (1 - discount / 100);
    }

    const deposit = input.depositAmount ? Number(input.depositAmount) : 0;
    const balanceDue = orderAmount - deposit;

    // 2. Create SalesOrder
    const order = await tx.salesOrder.create({
      data: {
        customerId: input.customerId,
        status: "CONFIRMED", // Start as confirmed if created with items
        orderAmount: orderAmount,
        paidAmount: 0, // Will be updated by recordPayment if deposit > 0
        balanceDue: orderAmount, // Will be updated by recordPayment if deposit > 0
        orderDate: new Date(),
        deliveryDate: input.deliveryDate,
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear,
        notes: input.notes,
        assignedWarehouseId: input.assignedWarehouseId,
        salespersonId: input.salespersonId,
        // Furniture
        isCustomOrder: input.isCustomOrder ?? false,
        expectedReadyDate: input.expectedReadyDate,
        assemblyNotes: input.assemblyNotes,
        deliveryFloor: input.deliveryFloor,
        lineItems: {
          create: input.lineItems.map(item => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct ?? 0,
          }))
        }
      }
    });

    // 3. Post ArLedger DEBIT for full orderAmount
    await postDebit(tx, {
      customerId: input.customerId,
      salesOrderId: order.id,
      amount: orderAmount,
      bsDate: input.bsDate,
      fiscalYear: input.fiscalYear,
      narration: `Sales Order ${order.id} confirmed`,
    });

    // 4. Update Customer Balance
    const latestBalance = await tx.arLedger.findFirst({
      where: { customerId: input.customerId },
      orderBy: { entryDate: "desc" },
    });

    if (latestBalance) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { outstandingBalance: latestBalance.runningBalance },
      });
    }

    // 5. If depositAmount > 0, record the payment
    if (deposit > 0) {
      await recordPayment({
        salesOrderId: order.id,
        amount: deposit,
        method: input.paymentMethod || "CASH",
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear,
        note: "Initial deposit",
      });
    }

    // 6. Post GL journal (Placeholder)
    // Dr Accounts Receivable (1100) / Cr Sales Revenue (4000)

    return order;
  });
}

export async function confirmOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      include: { lineItems: true }
    });

    if (!order) throw new ApiError(404, "Order not found");
    if (order.status !== "QUOTE") throw new ApiError(400, "Only quotes can be confirmed");

    // Stock Reservation Logic (Bug 6 fix)
    for (const item of order.lineItems) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.productVariantId }
      });

      if (!variant) throw new ApiError(404, `Variant ${item.productVariantId} not found`);

      // Update stock and record movement
      await tx.productVariant.update({
        where: { id: item.productVariantId },
        data: { stockQuantity: { decrement: item.quantity } }
      });

      await tx.stockMovement.create({
        data: {
          productVariantId: item.productVariantId,
          warehouseId: order.assignedWarehouseId || "system", // Should ideally have a default or picked warehouse
          type: "RESERVATION",
          quantity: item.quantity,
          balanceAfter: variant.stockQuantity - item.quantity, // BUG 6 FIX
          source: `Order ${order.id}`,
        }
      });
    }

    return tx.salesOrder.update({
      where: { id: orderId },
      data: { status: "CONFIRMED" }
    });
  });
}

export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      include: { lineItems: true }
    });

    if (!order) throw new ApiError(404, "Order not found");
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new ApiError(400, `Cannot cancel order in status ${order.status}`);
    }

    if (order.status === "CONFIRMED" || order.status === "IN_WAREHOUSE" || order.status === "DISPATCHED" || order.status === "OUT_FOR_DELIVERY") {
      // Revert stock reservation
      for (const item of order.lineItems) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.productVariantId }
        });
  
        if (variant) {
          await tx.productVariant.update({
            where: { id: item.productVariantId },
            data: { stockQuantity: { increment: item.quantity } }
          });
  
          await tx.stockMovement.create({
            data: {
              productVariantId: item.productVariantId,
              warehouseId: order.assignedWarehouseId || "system",
              type: "RELEASE",
              quantity: item.quantity,
              balanceAfter: variant.stockQuantity + item.quantity,
              source: `Cancelled Order ${order.id}`,
            }
          });
        }
      }
    }

    return tx.salesOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED" }
    });
  });
}
