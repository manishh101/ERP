import { prisma } from "../../config/prisma";
import { Prisma, SalesOrderStatus } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { postCredit, postDebit } from "../ar-ledger/ar-ledger.service";
import { createTaxInvoice } from "../tax-invoices/tax-invoice.service";
import { reverseJournalEntry } from "../../services/accounting.service";

/**
 * Sales Order Service
 * Responsible for commercial truth (quoted amount, actual items).
 */

export async function createOrder(input: {
  tenantId: string;
  customerId: string;
  status?: SalesOrderStatus;
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

    const initialStatus: SalesOrderStatus = (input.status === "QUOTE" || (input.status as string) === "DRAFT")
      ? "QUOTE"
      : (deposit >= orderAmount ? "PAID" : deposit > 0 ? "DEPOSIT_PAID" : "CONFIRMED");

    // 1b. Pre-validate stock availability for all line items if order is confirmed / paid immediately
    if (initialStatus !== "QUOTE") {
      const insufficientStockItems: string[] = [];
      for (const item of input.lineItems) {
        if (!item.productVariantId) continue; // Skip custom items without inventory tracking
        
        const variant = await tx.productVariant.findUnique({
          where: { id: item.productVariantId },
          include: { product: true }
        });

        if (!variant) {
          throw new ApiError(404, `Product variant ${item.productVariantId} not found`);
        }

        if (variant.stockQuantity < Number(item.quantity)) {
          const productName = `${variant.product.name} / ${variant.variantName}`;
          insufficientStockItems.push(
            `${productName} (Required: ${item.quantity}, Available: ${variant.stockQuantity})`
          );
        }
      }

      if (insufficientStockItems.length > 0) {
        throw new ApiError(
          400,
          `Insufficient stock for the following items:\n${insufficientStockItems.join('\n')}`,
          { insufficientItems: insufficientStockItems }
        );
      }
    }

    // Resolve assigned warehouse or fallback to tenant's first active warehouse
    let targetWarehouseId = input.assignedWarehouseId;
    if (!targetWarehouseId && initialStatus !== "QUOTE") {
      const defaultWh = await tx.warehouse.findFirst({
        where: { tenantId: input.tenantId, isActive: true },
        select: { id: true }
      });
      targetWarehouseId = defaultWh?.id;
    }

    // 2. Create SalesOrder with correct initial financial state
    const order = await tx.salesOrder.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        status: initialStatus,
        orderAmount: orderAmount,
        paidAmount: deposit,
        balanceDue: Math.max(orderAmount - deposit, 0),
        orderDate: new Date(),
        deliveryDate: input.deliveryDate,
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear,
        notes: input.notes,
        assignedWarehouseId: targetWarehouseId,
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

    // 2b. Stock Reservation Logic if order is confirmed/paid upon creation
    if (initialStatus !== "QUOTE" && targetWarehouseId) {
      for (const item of input.lineItems) {
        if (!item.productVariantId) continue;

        const updatedVariant = await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stockQuantity: { decrement: Number(item.quantity) } },
          select: { stockQuantity: true }
        });

        await tx.stockMovement.create({
          data: {
            tenantId: input.tenantId,
            productVariantId: item.productVariantId,
            warehouseId: targetWarehouseId,
            type: "RESERVATION",
            quantity: Number(item.quantity),
            balanceAfter: updatedVariant.stockQuantity,
            source: `Order ${order.id} confirmed`,
          }
        });
      }
    }

    // 3. Post ArLedger DEBIT for full orderAmount only if confirmed/paid right away
    if (initialStatus !== "QUOTE") {
      await postDebit(tx, {
        tenantId: input.tenantId,
        customerId: input.customerId,
        salesOrderId: order.id,
        amount: orderAmount,
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear,
        narration: `Sales Order ${order.id} confirmed`,
      });
    }

    // 4. If depositAmount > 0, record the payment inline
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

      // Post the AR credit for the deposit using centralized ar-ledger service
      await postCredit(tx, {
        tenantId: input.tenantId,
        customerId: input.customerId,
        salesOrderId: order.id,
        paymentId: payment.id,
        amount: deposit,
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear,
        narration: "Initial deposit",
      });
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
    if (order.status !== "QUOTE" && (order.status as string) !== "DRAFT") throw new ApiError(400, "Only quotes or draft orders can be confirmed");

    // FIX #1: Pre-validate stock availability for all line items before any updates
    const insufficientStockItems: string[] = [];
    for (const item of order.lineItems) {
      if (!item.productVariantId) continue; // Skip custom items without inventory tracking
      
      const variant = await tx.productVariant.findUnique({
        where: { id: item.productVariantId },
        include: { product: true }
      });

      if (!variant) {
        throw new ApiError(404, `Product variant ${item.productVariantId} not found`);
      }

      // Validate sufficient stock exists before reservation
      if (variant.stockQuantity < item.quantity) {
        const productName = `${variant.product.name} / ${variant.variantName}`;
        insufficientStockItems.push(
          `${productName} (Required: ${item.quantity}, Available: ${variant.stockQuantity})`
        );
      }
    }

    // If any items have insufficient stock, reject the entire order confirmation
    if (insufficientStockItems.length > 0) {
      throw new ApiError(
        400,
        `Insufficient stock for the following items:\n${insufficientStockItems.join('\n')}`,
        { insufficientItems: insufficientStockItems }
      );
    }

    // Resolve assigned warehouse or fallback to tenant's first active warehouse
    let targetWarehouseId = order.assignedWarehouseId;
    if (!targetWarehouseId) {
      const defaultWh = await tx.warehouse.findFirst({
        where: { tenantId: order.tenantId, isActive: true },
        select: { id: true }
      });
      targetWarehouseId = defaultWh?.id ?? null;
      if (targetWarehouseId) {
        await tx.salesOrder.update({
          where: { id: order.id },
          data: { assignedWarehouseId: targetWarehouseId }
        });
      }
    }

    // Stock Reservation Logic - all validations passed, safe to proceed
    for (const item of order.lineItems) {
      if (!item.productVariantId) continue;

      // Update stock quantity and capture the post-update value for accurate balanceAfter
      const updatedVariant = await tx.productVariant.update({
        where: { id: item.productVariantId },
        data: { stockQuantity: { decrement: item.quantity } },
        select: { stockQuantity: true, variantName: true }
      });

      if (targetWarehouseId) {
        // Create stock movement log with accurate balanceAfter from the updated record
        await tx.stockMovement.create({
          data: {
            tenantId: order.tenantId,
            productVariantId: item.productVariantId,
            warehouseId: targetWarehouseId,
            type: "RESERVATION",
            quantity: item.quantity,
            balanceAfter: updatedVariant.stockQuantity, // FIX: Use actual post-update value
            source: `Order ${order.id} confirmed`,
          }
        });
      }
    }

    // Post AR Ledger DEBIT for full orderAmount upon confirmation
    await postDebit(tx, {
      tenantId: order.tenantId,
      customerId: order.customerId,
      salesOrderId: order.id,
      amount: Number(order.orderAmount),
      bsDate: order.bsDate ?? "",
      fiscalYear: order.fiscalYear ?? "",
      narration: `Sales Order ${order.id} confirmed`,
    });

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
      include: { lineItems: true, taxInvoices: true, payments: true }
    });

    if (!order) throw new ApiError(404, "Order not found");
    
    // FIX #2: Prevent cancellation of orders that have received payments
    // Financial integrity: Cancelling a paid order would reverse AR but not cash, creating GL imbalance
    const orderPaidAmount = Number(order.paidAmount);
    if (orderPaidAmount > 0 || order.payments.length > 0) {
      throw new ApiError(
        400,
        `Cannot cancel order ${order.id} with ${order.payments.length} payment(s) totaling Rs. ${orderPaidAmount.toFixed(2)}. ` +
        `Please issue a refund instead of canceling the order to maintain financial integrity.`,
        { 
          paidAmount: orderPaidAmount,
          paymentCount: order.payments.length,
          suggestion: "Use refund process to reverse payments before cancellation"
        }
      );
    }

    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new ApiError(400, `Cannot cancel order in status ${order.status}`);
    }

    // Revert stock reservation for confirmed/dispatched orders
    if (order.status === "CONFIRMED" || order.status === "IN_WAREHOUSE" || order.status === "DISPATCHED" || order.status === "OUT_FOR_DELIVERY") {
      // 1. Revert stock reservation
      for (const item of order.lineItems) {
        if (!item.productVariantId) continue;
        
        // Update stock and capture post-update value for accurate balanceAfter
        const updatedVariant = await tx.productVariant.update({
          where: { id: item.productVariantId },
          data: { stockQuantity: { increment: item.quantity } },
          select: { stockQuantity: true }
        });

        await tx.stockMovement.create({
          data: {
            tenantId: order.tenantId,
            productVariantId: item.productVariantId,
            warehouseId: order.assignedWarehouseId || "system",
            type: "RELEASE",
            quantity: item.quantity,
            balanceAfter: updatedVariant.stockQuantity, // Use actual post-update value
            source: `Cancelled Order ${order.id}`,
          }
        });
      }
    }

    // 2. Revert AR Ledger entry & GL entries only if order was previously confirmed (and thus had an AR Debit posted)
    if (order.status !== "QUOTE" && (order.status as string) !== "DRAFT") {
      const orderAmountNum = Number(order.orderAmount);
      await postCredit(tx, {
        tenantId: order.tenantId,
        customerId: order.customerId,
        salesOrderId: order.id,
        amount: orderAmountNum,
        bsDate: order.bsDate ?? "",
        fiscalYear: order.fiscalYear ?? "",
        narration: `Reversal for Cancelled Order ${order.id}`,
      });

      // 3. Revert GL journal entries for Sales Order
      await reverseJournalEntry({
        tenantId: order.tenantId,
        sourceType: "sales_order",
        sourceId: order.id,
        reason: `Order ${order.id} cancelled`,
      }, tx);
    }

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

    // 5. Cancel any active linked delivery records
    await tx.delivery.updateMany({
      where: { soId: orderId, tenantId: order.tenantId, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      data: { status: "CANCELLED" },
    });

    return tx.salesOrder.update({
      where: { id: orderId },
      data: { status: "CANCELLED" }
    });
  });
}
