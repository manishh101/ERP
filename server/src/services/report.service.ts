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

export async function getAraAgingReport() {
  const orders = await prisma.salesOrder.findMany({
    where: {
      balanceDue: { gt: 0 },
    },
    include: {
      customer: true,
    },
  });

  return orders.map((order) => {
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

export async function getApAgingReport() {
  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      status: {
        in: ["RECEIVED", "PARTIALLY_PAID", "OVERDUE"],
      },
    },
    include: {
      supplier: true,
    },
  });

  return invoices.map((invoice) => {
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

export async function getProfitAndLoss(startDate?: Date, endDate?: Date) {
  const lines = await prisma.journalEntryLine.findMany({
    where: {
      journalEntry: {
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

export async function getBalanceSheet() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ type: "asc" }, { code: "asc" }],
  });

  return {
    assets: accounts.filter((account) => account.type === "ASSET"),
    liabilities: accounts.filter((account) => account.type === "LIABILITY"),
    equity: accounts.filter((account) => account.type === "EQUITY"),
  };
}

export async function getTrialBalance() {
  const accounts = await prisma.account.findMany({
    orderBy: [{ code: "asc" }],
  });

  return accounts.map((account) => ({
    code: account.code,
    name: account.name,
    type: account.type,
    debit: account.type === "ASSET" || account.type === "EXPENSE" ? toNumber(account.balance) : 0,
    credit:
      account.type === "LIABILITY" || account.type === "EQUITY" || account.type === "INCOME"
        ? toNumber(account.balance)
        : 0,
  }));
}

export async function getCashFlow(startDate?: Date, endDate?: Date) {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      where: {
        paymentDate: buildDateRange(startDate, endDate),
      },
    }),
    prisma.expense.findMany({
      where: {
        date: buildDateRange(startDate, endDate),
      },
    }),
  ]);

  const operatingInflows = payments
    .filter((payment) => payment.salesOrderId)
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const operatingOutflows = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);
  const financingOutflows = payments
    .filter((payment) => payment.purchaseOrderId || payment.supplierInvoiceId)
    .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

  return {
    operating: operatingInflows - operatingOutflows,
    investing: 0,
    financing: -financingOutflows,
    netChange: operatingInflows - operatingOutflows - financingOutflows,
  };
}

export async function getTaxSummary(startDate?: Date, endDate?: Date) {
  const vatEntries = await prisma.vatRegister.findMany({
    where: { entryDate: buildDateRange(startDate, endDate) },
  });
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where: { issueDate: buildDateRange(startDate, endDate) },
  });

  const outputTax = vatEntries.reduce((sum, e) => sum + toNumber(e.outputVat), 0);
  const inputTax = supplierInvoices.reduce((sum, inv) => sum + toNumber(inv.taxAmount), 0);

  return { outputTax, inputTax, netPayable: outputTax - inputTax };
}


