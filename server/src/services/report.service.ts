import { prisma } from "../config/prisma";
import { toNumber } from "../utils/number";

function buildDateRange(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    gte: startDate,
    lte: endDate,
  };
}

function bucketAging(daysOverdue: number) {
  if (daysOverdue <= 30) return "0-30";
  if (daysOverdue <= 60) return "31-60";
  if (daysOverdue <= 90) return "61-90";
  return "90+";
}

export async function getAraAgingReport(tenantId: string) {
  const orders = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      balanceDue: { gt: 0 },
      status: { not: "CANCELLED" },
    },
    include: {
      customer: true,
    },
  });

  return orders.map((order: any) => {
    const balance = toNumber(order.balanceDue);
    const dueDate = order.deliveryDate ?? order.orderDate;
    const daysOverdue = Math.max(
      0,
      Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      orderId: order.id,
      invoiceNumber: `SO-${order.id.slice(0, 8)}`, // Fallback for UI
      customer: order.customer.name,
      dueDate,
      balance,
      bucket: bucketAging(daysOverdue),
    };
  });
}

export async function getApAgingReport(tenantId: string) {
  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId,
      status: {
        in: ["RECEIVED", "PARTIALLY_PAID", "OVERDUE"],
      },
    },
    include: {
      supplier: true,
    },
  });

  return invoices.map((invoice: any) => {
    const balance = toNumber(invoice.totalAmount) - toNumber(invoice.amountPaid);
    const dueDate = invoice.dueDate ?? invoice.issueDate;
    const daysOverdue = Math.max(
      0,
      Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    return {
      supplierInvoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      supplier: invoice.supplier.name,
      dueDate,
      balance,
      bucket: bucketAging(daysOverdue),
    };
  });
}

export async function getProfitAndLoss(tenantId: string, startDate?: Date, endDate?: Date) {
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
        tenantId,
        date: buildDateRange(startDate, endDate),
      },
      account: {
        type: {
          in: ["INCOME", "EXPENSE"],
        },
      },
    },
    include: {
      account: true,
      journalEntry: true,
    },
  });

  const byAccount = new Map<string, { name: string; type: string; amount: number }>();

  for (const line of lines) {
    const existing = byAccount.get(line.accountId) ?? {
      name: line.account.name,
      type: line.account.type,
      amount: 0,
    };

    if (line.account.type === "INCOME") {
      existing.amount += toNumber(line.credit) - toNumber(line.debit);
    } else {
      existing.amount += toNumber(line.debit) - toNumber(line.credit);
    }

    byAccount.set(line.accountId, existing);
  }

  const accounts = [...byAccount.values()];
  const income = accounts
    .filter((entry) => entry.type === "INCOME")
    .reduce((sum, entry) => sum + entry.amount, 0);
  const expenses = accounts
    .filter((entry) => entry.type === "EXPENSE")
    .reduce((sum, entry) => sum + entry.amount, 0);

  return {
    accounts,
    income,
    expenses,
    netProfit: income - expenses,
  };
}

export async function getBalanceSheet(tenantId: string) {
  const accounts = await prisma.account.findMany({
    where: { tenantId },
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return {
    assets: accounts.filter((account: any) => account.type === "ASSET"),
    liabilities: accounts.filter((account: any) => account.type === "LIABILITY"),
    equity: accounts.filter((account: any) => account.type === "EQUITY"),
  };
}

export async function getTrialBalance(tenantId: string) {
  const accounts = await prisma.account.findMany({
    where: { tenantId },
    orderBy: [{ code: "asc" }],
  });

  return accounts.map((account: any) => {
    const bal = toNumber(account.balance);
    const isNormalDebit = account.type === "ASSET" || account.type === "EXPENSE";
    let debit = 0;
    let credit = 0;

    if (isNormalDebit) {
      if (bal >= 0) {
        debit = bal;
      } else {
        credit = Math.abs(bal);
      }
    } else {
      if (bal >= 0) {
        credit = bal;
      } else {
        debit = Math.abs(bal);
      }
    }

    return {
      code: account.code,
      name: account.name,
      type: account.type,
      debit,
      credit,
    };
  });
}

export async function getCashFlow(tenantId: string, startDate?: Date, endDate?: Date) {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        tenantId,
        paymentDate: buildDateRange(startDate, endDate),
      },
    }),
    prisma.expense.findMany({
      where: {
        tenantId,
        date: buildDateRange(startDate, endDate),
      },
    }),
  ]);

  const operatingInflows = payments
    .filter((payment: any) => payment.salesOrderId)
    .reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0);
  const operatingOutflows = expenses.reduce((sum: number, expense: any) => sum + toNumber(expense.amount), 0);
  const financingOutflows = payments
    .filter((payment: any) => payment.purchaseOrderId || payment.supplierInvoiceId)
    .reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0);

  return {
    operating: operatingInflows - operatingOutflows,
    investing: 0,
    financing: -financingOutflows,
    netChange: operatingInflows - operatingOutflows - financingOutflows,
  };
}

export async function getTaxSummary(tenantId: string, startDate?: Date, endDate?: Date) {
  const vatEntries = await prisma.vatRegister.findMany({
    where: {
      tenantId,
      entryDate: buildDateRange(startDate, endDate),
    },
  });
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId,
      issueDate: buildDateRange(startDate, endDate),
    },
  });

  const outputTax = vatEntries.reduce((sum: number, e: any) => sum + toNumber(e.outputVat), 0);
  const inputTax = supplierInvoices.reduce((sum: number, inv: any) => sum + toNumber(inv.taxAmount), 0);

  return { outputTax, inputTax, netPayable: outputTax - inputTax };
}


