import type { AccountType, Prisma, Account } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/api-error";
import { toNumber } from "../utils/number";
import { ensureStandardAccounts } from "./ensure-accounts";

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
  tenantId: string;
  date: Date;
  description: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
  lines: JournalLineInput[];
}, tx?: any) {
  const totalDebit = input.lines.reduce((sum, line) => sum + line.debit, 0);
  const totalCredit = input.lines.reduce((sum, line) => sum + line.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.0001) {
    throw new ApiError(400, "Journal entry is not balanced");
  }

  const client = tx || prisma;

  // Idempotency check: if a journal entry already exists for this sourceType + sourceId, return it
  if (input.sourceType && input.sourceId) {
    const existingEntry = await client.journalEntry.findFirst({
      where: {
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
      include: { lines: true },
    });
    if (existingEntry) {
      console.warn(`[GL] Journal entry already exists for ${input.sourceType}:${input.sourceId}. Skipping duplicate creation.`);
      return existingEntry;
    }
  }

  const accounts: Account[] = await client.account.findMany({
    where: {
      id: {
        in: input.lines.map((line) => line.accountId),
      },
    },
  });

  const accountMap = new Map<string, Account>(accounts.map((account) => [account.id, account]));

  const execute = async (t: any) => {
    const entry = await t.journalEntry.create({
      data: {
        tenantId: input.tenantId,
        date: input.date,
        description: input.description,
        reference: input.reference,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        createdById: input.createdById,
        lines: {
          create: input.lines.map(l => ({ ...l, tenantId: input.tenantId })),
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

      await t.account.update({
        where: { id: account.id },
        data: {
          balance: {
            increment: delta,
          },
        },
      });
    }

    return entry;
  };

  return tx ? execute(tx) : prisma.$transaction(execute);
}

async function requireAccountByCode(tenantId: string, code: string, tx?: any) {
  const client = tx || prisma;
  let account = await client.account.findFirst({
    where: {
      code,
      tenantId,
    },
  });

  if (!account) {
    // Auto-provision standard chart of accounts if missing
    await ensureStandardAccounts(tenantId, client);
    account = await client.account.findFirst({
      where: {
        code,
        tenantId,
      },
    });
  }

  if (!account) {
    throw new ApiError(500, `Required account ${code} is missing and could not be provisioned.`);
  }

  return account;
}

export async function reverseJournalEntry(input: {
  tenantId: string;
  sourceType: string;
  sourceId: string;
  reason: string;
  createdById?: string;
}, tx?: any) {
  const client = tx || prisma;

  const existing = await client.journalEntry.findFirst({
    where: {
      tenantId: input.tenantId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    },
    include: {
      lines: true,
    },
  });

  if (!existing) return null;

  const reversingLines = existing.lines.map((line: any) => ({
    accountId: line.accountId,
    debit: toNumber(line.credit),
    credit: toNumber(line.debit),
  }));

  return createBalancedJournalEntry({
    tenantId: input.tenantId,
    date: new Date(),
    description: `Reversal of ${existing.sourceType} (${existing.reference || existing.sourceId}): ${input.reason}`,
    reference: `REV-${existing.id}`,
    sourceType: `reversal_${input.sourceType}`,
    sourceId: input.sourceId,
    createdById: input.createdById,
    lines: reversingLines,
  }, tx);
}

export async function postSalesOrderJournalEntry(input: {
  tenantId: string;
  salesOrderId: string;
  total: Prisma.Decimal | number;
  createdById?: string;
}, tx?: any) {
  const accountsReceivable = await requireAccountByCode(input.tenantId, "1100", tx);
  const revenue = await requireAccountByCode(input.tenantId, "4000", tx);

  const total = toNumber(input.total);

  return createBalancedJournalEntry({
    tenantId: input.tenantId,
    date: new Date(),
    description: "Sales order posted",
    reference: input.salesOrderId,
    sourceType: "sales_order",
    sourceId: input.salesOrderId,
    createdById: input.createdById,
    lines: [
      { accountId: accountsReceivable.id, debit: total, credit: 0 },
      { accountId: revenue.id, debit: 0, credit: total },
    ],
  }, tx);
}

export async function postCustomerPaymentJournalEntry(input: {
  tenantId: string;
  paymentId: string;
  amount: Prisma.Decimal | number;
  createdById?: string;
}, tx?: any) {
  const cash = await requireAccountByCode(input.tenantId, "1000", tx);
  const accountsReceivable = await requireAccountByCode(input.tenantId, "1100", tx);
  const amount = toNumber(input.amount);

  return createBalancedJournalEntry({
    tenantId: input.tenantId,
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
  }, tx);
}

export async function postSupplierPaymentJournalEntry(input: {
  tenantId: string;
  paymentId: string;
  amount: Prisma.Decimal | number;
  createdById?: string;
}, tx?: any) {
  const accountsPayable = await requireAccountByCode(input.tenantId, "2000", tx);
  const cash = await requireAccountByCode(input.tenantId, "1000", tx);
  const amount = toNumber(input.amount);

  return createBalancedJournalEntry({
    tenantId: input.tenantId,
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
  }, tx);
}

export async function postTaxInvoiceJournalEntry(input: {
  tenantId: string;
  taxInvoiceId: string;
  subtotal: number;
  taxAmount: number;
  invoiceType: string;
  createdById?: string;
}, tx?: any) {
  const accountsReceivable = await requireAccountByCode(input.tenantId, "1100", tx);
  const salesRevenue = await requireAccountByCode(input.tenantId, "4000", tx);

  const subtotal = toNumber(input.subtotal);
  const taxAmount = toNumber(input.taxAmount);
  const total = subtotal + taxAmount;

  if (input.invoiceType === "VAT") {
    const vatPayable = await requireAccountByCode(input.tenantId, "2100", tx);
    return createBalancedJournalEntry({
      tenantId: input.tenantId,
      date: new Date(),
      description: "VAT Invoice posted",
      reference: input.taxInvoiceId,
      sourceType: "tax_invoice",
      sourceId: input.taxInvoiceId,
      createdById: input.createdById,
      lines: [
        { accountId: accountsReceivable.id, debit: total, credit: 0 },
        { accountId: salesRevenue.id, debit: 0, credit: subtotal },
        { accountId: vatPayable.id, debit: 0, credit: taxAmount },
      ],
    }, tx);
  } else {
    return createBalancedJournalEntry({
      tenantId: input.tenantId,
      date: new Date(),
      description: `${input.invoiceType} Invoice posted`,
      reference: input.taxInvoiceId,
      sourceType: "tax_invoice",
      sourceId: input.taxInvoiceId,
      createdById: input.createdById,
      lines: [
        { accountId: accountsReceivable.id, debit: total, credit: 0 },
        { accountId: salesRevenue.id, debit: 0, credit: total },
      ],
    }, tx);
  }
}

export async function postSupplierInvoiceJournalEntry(input: {
  tenantId: string;
  supplierInvoiceId: string;
  totalAmount: number;
  taxAmount: number;
  createdById?: string;
}, tx?: any) {
  const accountsPayable = await requireAccountByCode(input.tenantId, "2000", tx);
  const inventory = await requireAccountByCode(input.tenantId, "1200", tx);
  const totalAmount = toNumber(input.totalAmount);
  const taxAmount = toNumber(input.taxAmount);
  const subtotal = totalAmount - taxAmount;

  if (taxAmount > 0) {
    const vatPayable = await requireAccountByCode(input.tenantId, "2100", tx);
    return createBalancedJournalEntry({
      tenantId: input.tenantId,
      date: new Date(),
      description: "Supplier Invoice posted",
      reference: input.supplierInvoiceId,
      sourceType: "supplier_invoice",
      sourceId: input.supplierInvoiceId,
      createdById: input.createdById,
      lines: [
        { accountId: inventory.id, debit: subtotal, credit: 0 },
        { accountId: vatPayable.id, debit: taxAmount, credit: 0 },
        { accountId: accountsPayable.id, debit: 0, credit: totalAmount },
      ],
    }, tx);
  } else {
    return createBalancedJournalEntry({
      tenantId: input.tenantId,
      date: new Date(),
      description: "Supplier Invoice posted",
      reference: input.supplierInvoiceId,
      sourceType: "supplier_invoice",
      sourceId: input.supplierInvoiceId,
      createdById: input.createdById,
      lines: [
        { accountId: inventory.id, debit: totalAmount, credit: 0 },
        { accountId: accountsPayable.id, debit: 0, credit: totalAmount },
      ],
    }, tx);
  }
}

