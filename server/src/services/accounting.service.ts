import type { AccountType, Prisma, Account } from "@prisma/client";
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
  const account = await client.account.findFirst({
    where: {
      code,
      tenantId,
    },
  });

  if (!account) {
    throw new ApiError(500, `Required account ${code} is missing`);
  }

  return account;
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

