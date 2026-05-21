import { prisma } from "../../config/prisma";
import { Prisma, PaymentMethod } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { postCredit } from "../ar-ledger/ar-ledger.service";

/**
 * Payment Service
 * Responsible for recording payments against Sales Orders
 * and updating the commercial truth (AR Ledger and Order balances).
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
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Get Sales Order
    const firstOrder = await tx.salesOrder.findUnique({
      where: { id: input.salesOrderId },
    });

    if (!firstOrder) throw new ApiError(404, "Sales Order not found");

    // 2. Validate: amount <= order.balanceDue (though partial payments are common, overpayment should be checked)
    // For furniture business, we often take more than the balance as a deposit if it's a quote, 
    // but usually, it should be within the balance for confirmed orders.
    // However, the rule here is usually to just record what's received.

    let remainingAmount = input.amount;
    
    // Fetch all unpaid orders for this customer (excluding the selected one)
    const otherUnpaidOrders = await tx.salesOrder.findMany({
      where: { 
        customerId: firstOrder.customerId, 
        balanceDue: { gt: 0 },
        id: { not: firstOrder.id }
      },
      orderBy: { orderDate: "asc" }
    });

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
      const newBalanceDue = Number(order.balanceDue) - amountToApply;
      
      let newStatus = order.status;
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

    // 6. SYNC CUSTOMER BALANCE (Update outstandingBalance field on Customer)
    // Note: The postCredit already calculates the new running balance in ArLedger.
    // We should sync the customer's outstandingBalance field for quick lookups.
    const latestBalance = await tx.arLedger.findFirst({
      where: { customerId: firstOrder.customerId },
      orderBy: { entryDate: "desc" },
    });

    if (latestBalance) {
      await tx.customer.update({
        where: { id: firstOrder.customerId },
        data: { outstandingBalance: latestBalance.runningBalance },
      });
    }

    // 7. Post GL - Placeholder for Journal Entry
    // Dr Cash/Bank (1000) / Cr Accounts Receivable (1100)
    
    return { ...firstPaymentRecord!, salesOrder: { id: firstOrder.id } };
  });
}
