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
    const order = await tx.salesOrder.findUnique({
      where: { id: input.salesOrderId },
    });

    if (!order) throw new ApiError(404, "Sales Order not found");

    // 2. Validate: amount <= order.balanceDue (though partial payments are common, overpayment should be checked)
    // For furniture business, we often take more than the balance as a deposit if it's a quote, 
    // but usually, it should be within the balance for confirmed orders.
    // However, the rule here is usually to just record what's received.

    // 3. Create Payment record
    const payment = await tx.payment.create({
      data: {
        salesOrderId: input.salesOrderId,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        note: input.note,
        paymentDate: input.paymentDate || new Date(),
        bsDate: input.bsDate,
      },
    });

    // 4. Update Sales Order: paidAmount and balanceDue
    const newPaidAmount = Number(order.paidAmount) + input.amount;
    const newBalanceDue = Number(order.balanceDue) - input.amount;
    
    // Determine new status
    let newStatus = order.status;
    if (newBalanceDue <= 0) {
      newStatus = "PAID";
    } else if (newPaidAmount > 0) {
      newStatus = "DEPOSIT_PAID";
    }

    await tx.salesOrder.update({
      where: { id: input.salesOrderId },
      data: {
        paidAmount: newPaidAmount,
        balanceDue: newBalanceDue,
        status: newStatus,
      },
    });

    // 5. Post ArLedger CREDIT for amount
    await postCredit(tx, {
      customerId: order.customerId,
      salesOrderId: order.id,
      paymentId: payment.id,
      amount: input.amount,
      bsDate: input.bsDate,
      fiscalYear: input.fiscalYear,
      narration: input.note || `Payment received via ${input.method}`,
    });

    // 6. SYNC CUSTOMER BALANCE (Update outstandingBalance field on Customer)
    // Note: The postCredit already calculates the new running balance in ArLedger.
    // We should sync the customer's outstandingBalance field for quick lookups.
    const latestBalance = await tx.arLedger.findFirst({
      where: { customerId: order.customerId },
      orderBy: { entryDate: "desc" },
    });

    if (latestBalance) {
      await tx.customer.update({
        where: { id: order.customerId },
        data: { outstandingBalance: latestBalance.runningBalance },
      });
    }

    // 7. Post GL - Placeholder for Journal Entry
    // Dr Cash/Bank (1000) / Cr Accounts Receivable (1100)
    
    return { ...payment, salesOrder: { id: order.id, balanceDue: newBalanceDue, status: newStatus } };
  });
}
