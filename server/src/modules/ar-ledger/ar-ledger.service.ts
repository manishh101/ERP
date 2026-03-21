import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

/**
 * AR Ledger Service
 * Responsible for commercial truth (what the customer owes)
 * Source of truth: orderAmount and payment amounts
 */

export async function postDebit(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    salesOrderId: string;
    amount: number;
    bsDate: string;
    fiscalYear: string;
    narration?: string;
  }
) {
  // 1. Get current running balance for customer
  const lastEntry = await tx.arLedger.findFirst({
    where: { customerId: input.customerId },
    orderBy: { entryDate: "desc" },
  });

  const lastBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
  const newBalance = lastBalance + input.amount;

  // 2. Create ArLedger entry
  return tx.arLedger.create({
    data: {
      customerId: input.customerId,
      salesOrderId: input.salesOrderId,
      entryType: "DEBIT",
      amount: input.amount,
      runningBalance: newBalance,
      fiscalYear: input.fiscalYear,
      bsDate: input.bsDate,
      entryDate: new Date(),
      narration: input.narration ?? `Order ${input.salesOrderId} debit`,
    },
  });
}

export async function postCredit(
  tx: Prisma.TransactionClient,
  input: {
    customerId: string;
    salesOrderId: string;
    paymentId: string;
    amount: number;
    bsDate: string;
    fiscalYear: string;
    narration?: string;
  }
) {
  // 1. Get current running balance
  const lastEntry = await tx.arLedger.findFirst({
    where: { customerId: input.customerId },
    orderBy: { entryDate: "desc" },
  });

  const lastBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
  const newBalance = lastBalance - input.amount;

  // 2. Create ArLedger entry
  return tx.arLedger.create({
    data: {
      customerId: input.customerId,
      salesOrderId: input.salesOrderId,
      paymentId: input.paymentId,
      entryType: "CREDIT",
      amount: input.amount,
      runningBalance: newBalance,
      fiscalYear: input.fiscalYear,
      bsDate: input.bsDate,
      entryDate: new Date(),
      narration: input.narration ?? `Payment ${input.paymentId} credit`,
    },
  });
}

export async function getCustomerLedger(customerId: string, startDate?: Date, endDate?: Date) {
  const entries = await prisma.arLedger.findMany({
    where: {
      customerId,
      entryDate: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    },
    include: {
      salesOrder: { select: { id: true, orderDate: true } },
      payment: { select: { id: true, method: true, reference: true } },
    },
    orderBy: { entryDate: "asc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    date: entry.entryDate,
    bsDate: entry.bsDate,
    type: entry.entryType,        // "DEBIT" | "CREDIT"
    reference: entry.salesOrder?.id ?? entry.payment?.reference ?? entry.id,
    narration: entry.narration ?? "",
    debit: entry.entryType === "DEBIT" ? Number(entry.amount) : 0,
    credit: entry.entryType === "CREDIT" ? Number(entry.amount) : 0,
    balance: Number(entry.runningBalance),
  }));
}
