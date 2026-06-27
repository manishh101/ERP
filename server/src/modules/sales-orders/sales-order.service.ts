import { prisma } from "../../config/prisma";
import { Prisma, SalesOrderStatus } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { postDebit } from "../ar-ledger/ar-ledger.service";
import { createTaxInvoice } from "../tax-invoices/tax-invoice.service";
import { postSalesOrderJournalEntry } from "../../services/accounting.service";

/**
 * Sales Order Service
 * Responsible for commercial truth (quoted amount, actual items).
 */

export async function createOrder(input: {
  tenantId: string;
  customerId: string;
  lineItems: Array<{ 
    productVariantId?: string; 
    customProductName?: string;
    quantity: number; 
    unitPrice: number; 
    discountPct?: number;
    discountAmount?: number;
    isCustom?: boolean;
    fabricColor?: string;
    woodFinish?: string;
    customizationNotes?: string;
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
      const qty = Number(item.quantity);
      
      if (item.discountAmount !== undefined) {
        orderAmount += (qty * price) - Number(item.discountAmount);
      } else {
        const discount = item.discountPct ? Number(item.discountPct) : 0;
        orderAmount += qty * price * (1 - discount / 100);
      }
    }

    const deposit = input.depositAmount ? Number(input.depositAmount) : 0;
    const balanceDue = orderAmount - deposit;

    // 2. Create SalesOrder with correct initial financial state
    const order = await tx.salesOrder.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        status: deposit >= orderAmount ? "PAID" : deposit > 0 ? "DEPOSIT_PAID" : "CONFIRMED",
        orderAmount: orderAmount,
        paidAmount: deposit,
        balanceDue: Math.max(orderAmount - deposit, 0),
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
            tenantId: input.tenantId,
            productVariantId: item.productVariantId || null,
            customProductName: item.customProductName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct ?? 0,
            discountAmount: item.discountAmount ?? 0,
            isCustom: item.isCustom ?? false,
            fabricColor: item.fabricColor,
            woodFinish: item.woodFinish,
            customizationNotes: item.customizationNotes,
          }))
        }
      }
    });

    // 3. Post ArLedger DEBIT for full orderAmount
    await postDebit(tx, {
      tenantId: input.tenantId,
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

    // 5. If depositAmount > 0, record the payment inline (cannot call recordPayment here
    //    because that opens its own prisma.$transaction, which can't see the uncommitted order)
    if (deposit > 0) {
      const payment = await tx.payment.create({
        data: {
          tenantId: input.tenantId,
          salesOrderId: order.id,
          amount: deposit,
          method: input.paymentMethod || "CASH",
          note: "Initial deposit",
          bsDate: input.bsDate,
          paymentDate: new Date(),
        },
      });

      // No need to update salesOrder paidAmount/balanceDue/status — already set correctly at creation

      // Post the AR credit for the deposit
      const lastArEntry = await tx.arLedger.findFirst({
        where: { customerId: input.customerId },
        orderBy: [{ entryDate: "desc" }, { id: "desc" }],
      });
      const lastBalance = lastArEntry ? Number(lastArEntry.runningBalance) : 0;

      await tx.arLedger.create({
        data: {
          tenantId: input.tenantId,
          customerId: input.customerId,
          salesOrderId: order.id,
          paymentId: payment.id,
          entryType: "CREDIT",
          amount: deposit,
          runningBalance: lastBalance - deposit,
          fiscalYear: input.fiscalYear,
          bsDate: input.bsDate,
          entryDate: new Date(),
          narration: "Initial deposit",
        },
      });

      // Sync customer outstanding balance
      const latestEntry = await tx.arLedger.findFirst({
        where: { customerId: input.customerId },
        orderBy: [{ entryDate: "desc" }, { id: "desc" }],
      });
      if (latestEntry) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: { outstandingBalance: latestEntry.runningBalance },
        });
      }
    }

    // 6. Post GL journal
    // Dr Accounts Receivable (1100) / Cr Sales Revenue (4000)
    try {
      await postSalesOrderJournalEntry({
        tenantId: input.tenantId,
        salesOrderId: order.id,
        total: orderAmount,
      }, tx);
    } catch (err) {
      console.warn(`[SalesOrder] Journal entry skipped: ${(err as Error).message}`);
    }

    // 7. AUTOMATIC ESTIMATE CREATION
    // Ensure every new order has an Estimate Bill (non-tax invoice) created automatically
    await createTaxInvoice({
      tenantId: input.tenantId,
      salesOrderId: order.id,
      lineItems: input.lineItems.map(item => ({
        productVariantId: item.productVariantId,
        customProductName: item.customProductName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPct: item.discountPct ?? 0,
      })),
      invoiceType: "ESTIMATE",
      bsDate: input.bsDate,
      fiscalYear: input.fiscalYear,
      notes: "Auto-generated estimate"
    }, tx);

    return order;
  });
}

export async function confirmOrder(tenantId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { lineItems: true }
    });

    if (!order) throw new ApiError(404, "Order not found");
    if (order.status !== "QUOTE") throw new ApiError(400, "Only quotes can be confirmed");

    // Stock Reservation Logic (Bug 6 fix)
    for (const item of order.lineItems) {
      if (!item.productVariantId) continue;
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
          tenantId: order.tenantId,
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

export async function cancelOrder(tenantId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { lineItems: true }
    });

    if (!order) throw new ApiError(404, "Order not found");
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new ApiError(400, `Cannot cancel order in status ${order.status}`);
    }

    if (order.status === "CONFIRMED" || order.status === "IN_WAREHOUSE" || order.status === "DISPATCHED" || order.status === "OUT_FOR_DELIVERY") {
      // Revert stock reservation
      for (const item of order.lineItems) {
        if (!item.productVariantId) continue;
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
              tenantId: order.tenantId,
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
