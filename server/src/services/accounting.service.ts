import type { AccountType, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { toNumber } from "../utils/number";

type JournalLineInput = {
  accountId: string;
  debit: number;
  credit: number;
};

function calculateBalanceDelta(accountType: AccountType, debit: number, credit: number) {
  if (accountType === "ASSET" || accountType === "EXPENSE") {
    return debit - credit;
  }

  return credit - debit;
}

export async function createBalancedJournalEntry(input: {
  date: Date;
  description: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
  lines: JournalLineInput[];
}) {
  const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new ApiError(400, "Journal entry is not balanced");
  }

  const accounts = await prisma.account.findMany({
    where: {
      id: {
        in: input.lines.map((line) => line.accountId),
      },
    },
  });

  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  return prisma.$transaction(async (tx) => {
    const entry = await tx.journalEntry.create({
      data: {
        date: input.date,
        description: input.description,
        reference: input.reference,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdById: input.createdById,
        lines: {
          create: input.lines,
        },
      },
      include: {
        lines: true,
      },
    });

    for (const line of input.lines) {
      const account = accountMap.get(line.accountId);

      if (!account) {
        throw new ApiError(404, "Account not found for journal line");
      }

      const delta = calculateBalanceDelta(account.type, line.debit, line.credit);

      await tx.account.update({
        where: { id: account.id },
        data: {
          balance: {
            increment: delta,
          },
        },
      });
    }

    return entry;
  });
}

async function requireAccountByCode(code: string) {
  const account = await prisma.account.findUnique({
    where: { code },
  });

  if (!account) {
    throw new ApiError(500, `Required account ${code} is missing`);
  }

  return account;
}

export async function postSalesInvoiceJournalEntry(input: {
  invoiceId: string;
  total: Prisma.Decimal | number;
  taxAmount: Prisma.Decimal | number;
  createdById?: string;
}) {
  const accountsReceivable = await requireAccountByCode("1100");
  const revenue = await requireAccountByCode("4000");
  const outputTax = await requireAccountByCode("2100");

  const total = toNumber(input.total);
  const taxAmount = toNumber(input.taxAmount);
  const netRevenue = total - taxAmount;

  return createBalancedJournalEntry({
    date: new Date(),
    description: "Sales invoice posted",
    reference: input.invoiceId,
    sourceType: "sales_invoice",
    sourceId: input.invoiceId,
    createdById: input.createdById,
    lines: [
      { accountId: accountsReceivable.id, debit: total, credit: 0 },
      { accountId: revenue.id, debit: 0, credit: netRevenue },
      { accountId: outputTax.id, debit: 0, credit: taxAmount },
    ],
  });
}

export async function postCustomerPaymentJournalEntry(input: {
  paymentId: string;
  amount: Prisma.Decimal | number;
  createdById?: string;
}) {
  const cash = await requireAccountByCode("1000");
  const accountsReceivable = await requireAccountByCode("1100");
  const amount = toNumber(input.amount);

  return createBalancedJournalEntry({
    date: new Date(),
    description: "Customer payment received",
    reference: input.paymentId,
    sourceType: "customer_payment",
    sourceId: input.paymentId,
    createdById: input.createdById,
    lines: [
      { accountId: cash.id, debit: amount, credit: 0 },
      { accountId: accountsReceivable.id, debit: 0, credit: amount },
    ],
  });
}

export async function postSupplierPaymentJournalEntry(input: {
  paymentId: string;
  amount: Prisma.Decimal | number;
  createdById?: string;
}) {
  const accountsPayable = await requireAccountByCode("2000");
  const cash = await requireAccountByCode("1000");
  const amount = toNumber(input.amount);

  return createBalancedJournalEntry({
    date: new Date(),
    description: "Supplier payment posted",
    reference: input.paymentId,
    sourceType: "supplier_payment",
    sourceId: input.paymentId,
    createdById: input.createdById,
    lines: [
      { accountId: accountsPayable.id, debit: amount, credit: 0 },
      { accountId: cash.id, debit: 0, credit: amount },
    ],
  });
}

