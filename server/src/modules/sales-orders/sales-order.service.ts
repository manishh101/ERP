import { prisma } from "../../config/prisma";
import { Prisma, SalesOrderStatus } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { postDebit } from "../ar-ledger/ar-ledger.service";
import { createTaxInvoice } from "../tax-invoices/tax-invoice.service";
import { postSalesOrderJournalEntry, reverseJournalEntry } from "../../services/accounting.service";

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
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    });

    if (latestBalance) {
      await tx.customer.update({
        where: { id: input.customerId },
        data: { outstandingBalance: latestBalance.runningBalance },
      });
    }

    // 5. If depositAmount > 0, record the payment inline
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

    // 6. Post GL journal (Sales Order commercial revenue entry)
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

    // Stock Reservation Logic
    for (const item of order.lineItems) {
      if (!item.productVariantId) continue;
      const variant = await tx.productVariant.findUnique({
        where: { id: item.productVariantId }
      });

      if (!variant) throw new ApiError(404, `Variant ${item.productVariantId} not found`);

      await tx.productVariant.update({
        where: { id: item.productVariantId },
        data: { stockQuantity: { decrement: item.quantity } }
      });

      await tx.stockMovement.create({
        data: {
          tenantId: order.tenantId,
          productVariantId: item.productVariantId,
          warehouseId: order.assignedWarehouseId || "system",
          type: "RESERVATION",
          quantity: item.quantity,
          balanceAfter: variant.stockQuantity - item.quantity,
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
      include: { lineItems: true, taxInvoices: true }
    });

    if (!order) throw new ApiError(404, "Order not found");
    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new ApiError(400, `Cannot cancel order in status ${order.status}`);
    }

    if (order.status === "CONFIRMED" || order.status === "IN_WAREHOUSE" || order.status === "DISPATCHED" || order.status === "OUT_FOR_DELIVERY") {
      // 1. Revert stock reservation
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

    // 2. Revert AR Ledger entry (post CREDIT entry to offset initial DEBIT)
    const orderAmountNum = Number(order.orderAmount);
    const lastArEntry = await tx.arLedger.findFirst({
      where: { customerId: order.customerId },
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    });
    const currentBalance = lastArEntry ? Number(lastArEntry.runningBalance) : 0;

    await tx.arLedger.create({
      data: {
        tenantId: order.tenantId,
        customerId: order.customerId,
        salesOrderId: order.id,
        entryType: "CREDIT",
        amount: orderAmountNum,
        runningBalance: currentBalance - orderAmountNum,
        fiscalYear: order.fiscalYear ?? "",
        bsDate: order.bsDate ?? "",
        entryDate: new Date(),
        narration: `Reversal for Cancelled Order ${order.id}`,
      },
    });

    // Sync Customer balance
    const latestArEntry = await tx.arLedger.findFirst({
      where: { customerId: order.customerId },
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    });
    if (latestArEntry) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { outstandingBalance: latestArEntry.runningBalance },
      });
    }

    // 3. Revert GL journal entries for Sales Order
    await reverseJournalEntry({
      tenantId: order.tenantId,
      sourceType: "sales_order",
      sourceId: order.id,
      reason: `Order ${order.id} cancelled`,
    }, tx);

    // 4. Cancel and revert GL entries for linked tax invoices
    for (const inv of order.taxInvoices) {
      await tx.taxInvoice.update({
        where: { id: inv.id },
        data: { status: "CANCELLED" }
      });
      await reverseJournalEntry({
        tenantId: order.tenantId,
        sourceType: "tax_invoice",
        sourceId: inv.id,
        reason: `Order ${order.id} cancelled`,
      }, tx);
    }

    return tx.salesOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED" }
    });
  });
}
