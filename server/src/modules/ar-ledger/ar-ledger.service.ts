import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

/**
 * AR Ledger Service
 * Responsible for commercial truth (what the customer owes)
 * Source of truth: orderAmount and payment amounts
 */

export async function postDebit(
  tx: any,
  input: {
    tenantId: string;
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
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
  });

  const lastBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
  const newBalance = lastBalance + input.amount;

  // 2. Create ArLedger entry
  const entry = await tx.arLedger.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      salesOrderId: input.salesOrderId,
      entryType: "DEBIT",
      amount: input.amount,
      runningBalance: newBalance,
      fiscalYear: input.fiscalYear,
      bsDate: input.bsDate,
      entryDate: new Date(),
      narration: input.narration ?? `Sales`,
    },
  });

  // 3. Keep customer outstanding balance in sync
  await tx.customer.update({
    where: { id: input.customerId },
    data: { outstandingBalance: newBalance },
  });

  return entry;
}

export async function postCredit(
  tx: any,
  input: {
    tenantId: string;
    customerId: string;
    salesOrderId: string;
    paymentId?: string;
    amount: number;
    bsDate: string;
    fiscalYear: string;
    narration?: string;
  }
) {
  // 1. Get current running balance
  const lastEntry = await tx.arLedger.findFirst({
    where: { customerId: input.customerId },
    orderBy: [{ entryDate: "desc" }, { id: "desc" }],
  });

  const lastBalance = lastEntry ? Number(lastEntry.runningBalance) : 0;
  const newBalance = lastBalance - input.amount;

  // 2. Create ArLedger entry
  const entry = await tx.arLedger.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      salesOrderId: input.salesOrderId,
      paymentId: input.paymentId ?? null,
      entryType: "CREDIT",
      amount: input.amount,
      runningBalance: newBalance,
      fiscalYear: input.fiscalYear,
      bsDate: input.bsDate,
      entryDate: new Date(),
      narration: input.narration ?? `Payment`,
    },
  });

  // 3. Keep customer outstanding balance in sync
  await tx.customer.update({
    where: { id: input.customerId },
    data: { outstandingBalance: newBalance },
  });

  return entry;
}

export interface LedgerEntry {
  id: string;
  entryDate: Date;
  bsDate: string;
  entryType: string;
  referenceId: string;
  narration: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface LedgerPayload {
  openingBalance: number;
  closingBalance: number;
  entries: LedgerEntry[];
}

export async function getCustomerLedger(
  tenantId: string,
  customerId: string,
  startDate?: Date,
  endDate?: Date
): Promise<LedgerPayload> {
  // 1. Calculate Opening Balance (sum of all entries before startDate)
  let openingBalance = 0;
  if (startDate) {
    const previousEntries = await prisma.arLedger.findMany({
      where: {
        tenantId,
        customerId,
        entryDate: { lt: startDate },
      },
      select: { amount: true, entryType: true },
    });

    openingBalance = previousEntries.reduce((acc, entry) => {
      return entry.entryType === "DEBIT" ? acc + Number(entry.amount) : acc - Number(entry.amount);
    }, 0);
  }

  // 2. Fetch entries within range
  const entries = await prisma.arLedger.findMany({
    where: {
      tenantId,
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
    orderBy: [{ entryDate: "asc" }, { id: "asc" }],
  });

  // 3. Calculate running balance kumulatively
  let currentBalance = openingBalance;
  
  const mappedEntries = entries.map((entry) => {
    const isDebit = entry.entryType === "DEBIT";
    const isCredit = entry.entryType === "CREDIT";
    const debit = isDebit ? Number(entry.amount) : 0;
    const credit = isCredit ? Number(entry.amount) : 0;
    currentBalance += debit - credit;

    let referenceId = "";
    if (isCredit) {
      let methodStr = "";
      if (entry.payment?.method === "BANK") methodStr = "Bank Transfer";
      else if (entry.payment?.method === "CARD") methodStr = "Credit Card";
      else if (entry.payment?.method === "CASH") methodStr = "Cash";
      else if (entry.payment?.method === "INSTALLMENT") methodStr = "Installment";
      else methodStr = entry.payment?.method || "";
      
      const ref = entry.payment?.reference;
      if (ref && !ref.startsWith("PAY-")) {
        referenceId = methodStr ? `${methodStr} (${ref})` : ref;
      } else {
        referenceId = methodStr || `PAY-${entry.id.slice(0, 5).toUpperCase()}`;
      }
    } else {
      referenceId = "-";
    }

    let narration = entry.narration ?? (isDebit ? "Sales" : "Payment");
    if (isDebit) {
      narration = "Sales";
    } else if (isCredit) {
      if (narration.includes("Payment received via") || narration.includes("Payment ")) {
        narration = "Payment";
      }
    }

    return {
      id: entry.id,
      entryDate: entry.entryDate,
      bsDate: entry.bsDate,
      entryType: entry.entryType,
      referenceId,
      narration,
      debit,
      credit,
      runningBalance: currentBalance,
    };
  });

  return {
    openingBalance,
    closingBalance: currentBalance,
    entries: mappedEntries,
  };
}


