import { prisma } from "../../config/prisma";
import { Prisma, PaymentMethod, SalesOrderStatus } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { postCredit } from "../ar-ledger/ar-ledger.service";
import { postCustomerPaymentJournalEntry } from "../../services/accounting.service";
import { logAudit } from "../../services/audit.service";

/**
 * Payment Service
 * Responsible for recording payments against Sales Orders
 * and updating the commercial truth (AR Ledger and Order balances).
 *
 * #7 Fix: Uses raw SQL `FOR UPDATE` to prevent concurrent double-payments.
 * #8 Fix: Journal entries are posted inside the same transaction.
 * #9 Fix: Audit logging runs inside the same transaction.
 */

export async function recordPayment(input: {
  tenantId: string;
  salesOrderId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  bsDate: string;
  fiscalYear: string;
  note?: string;
  paymentDate?: Date;
  createdById?: string;
  ipAddress?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // #7 Fix: Lock the sales order row to prevent concurrent double-payments.
    // Two simultaneous payment requests for the same order will now serialize.
    const lockedRows = await tx.$queryRaw<Array<{
      id: string;
      customerId: string;
      status: string;
      paidAmount: any;
      balanceDue: any;
    }>>`
      SELECT id, customer_id AS "customerId", status, paid_amount AS "paidAmount", balance_due AS "balanceDue"
      FROM sales_orders
      WHERE id = ${input.salesOrderId}
      FOR UPDATE
    `;

    const firstOrder = lockedRows[0];
    if (!firstOrder) throw new ApiError(404, "Sales Order not found");

    let remainingAmount = input.amount;
    
    // Fetch all unpaid orders for this customer (excluding the selected one), also locked
    const otherUnpaidOrders = await tx.$queryRaw<Array<{
      id: string;
      customerId: string;
      status: string;
      paidAmount: any;
      balanceDue: any;
      orderDate: Date;
    }>>`
      SELECT id, customer_id AS "customerId", status, paid_amount AS "paidAmount", balance_due AS "balanceDue", order_date AS "orderDate"
      FROM sales_orders
      WHERE customer_id = ${firstOrder.customerId}
        AND balance_due > 0
        AND id != ${firstOrder.id}
      ORDER BY order_date ASC
      FOR UPDATE
    `;

    const ordersToProcess = [firstOrder, ...otherUnpaidOrders];
    let firstPaymentRecord = null;

    for (let i = 0; i < ordersToProcess.length; i++) {
      const order = ordersToProcess[i];
      if (remainingAmount <= 0) break;

      let amountToApply = 0;
      const balanceNum = Number(order.balanceDue);

      if (i === ordersToProcess.length - 1 && remainingAmount > balanceNum) {
        amountToApply = remainingAmount;
      } else {
        amountToApply = Math.min(remainingAmount, balanceNum);
        if (amountToApply <= 0 && i === 0) {
          amountToApply = remainingAmount;
        }
      }

      if (amountToApply <= 0) continue;

      const payment = await tx.payment.create({
        data: {
          tenantId: input.tenantId,
          salesOrderId: order.id,
          amount: amountToApply,
          method: input.method,
          reference: input.reference,
          note: input.note,
          paymentDate: input.paymentDate || new Date(),
          bsDate: input.bsDate,
        },
      });

      if (!firstPaymentRecord) firstPaymentRecord = payment;

      const newPaidAmount = Number(order.paidAmount) + amountToApply;
      // #6 Fix: Ensure balanceDue never goes below 0
      const newBalanceDue = Math.max(Number(order.balanceDue) - amountToApply, 0);
      
      let newStatus: any = order.status;
      if (newBalanceDue <= 0) {
        newStatus = "PAID";
      } else if (newPaidAmount > 0) {
        newStatus = order.status === "QUOTE" ? "DEPOSIT_PAID" : order.status;
      }

      await tx.salesOrder.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          status: newStatus,
        },
      });

      await postCredit(tx, {
        tenantId: input.tenantId,
        customerId: order.customerId,
        salesOrderId: order.id,
        paymentId: payment.id,
        amount: amountToApply,
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear,
        narration: input.note || `Payment`,
      });

      remainingAmount -= amountToApply;
    }

    // SYNC CUSTOMER BALANCE
    const latestBalance = await tx.arLedger.findFirst({
      where: { customerId: firstOrder.customerId },
      orderBy: [{ entryDate: "desc" }, { id: "desc" }],
    });

    if (latestBalance) {
      await tx.customer.update({
        where: { id: firstOrder.customerId },
        data: { outstandingBalance: latestBalance.runningBalance },
      });
    }

    // #8 Fix: Post GL journal entry INSIDE the transaction atomically
    if (firstPaymentRecord) {
      await postCustomerPaymentJournalEntry({
        tenantId: input.tenantId,
        paymentId: firstPaymentRecord.id,
        amount: input.amount,
        createdById: input.createdById,
      }, tx);
    }

    // #9 Fix: Audit logging inside the transaction
    if (firstPaymentRecord && input.createdById) {
      await logAudit({
        tenantId: input.tenantId,
        userId: input.createdById,
        action: "RECORD_PAYMENT",
        entityType: "Payment",
        entityId: firstPaymentRecord.id,
        newState: {
          salesOrderId: input.salesOrderId,
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
        },
        ipAddress: input.ipAddress,
        tx,
      });
    }

    return { ...firstPaymentRecord!, salesOrder: { id: firstOrder.id } };
  });
}
