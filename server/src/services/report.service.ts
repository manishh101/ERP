import { prisma } from "../config/prisma";
import { toNumber } from "../utils/number";

function buildDateRange(startDate?: Date, endDate?: Date) {
  if (!startDate && !endDate) {
    return undefined;
  }

  let adjustedEnd = endDate;
  if (endDate instanceof Date && !isNaN(endDate.getTime())) {
    if (
      endDate.getHours() === 0 &&
      endDate.getMinutes() === 0 &&
      endDate.getSeconds() === 0 &&
      endDate.getMilliseconds() === 0
    ) {
      adjustedEnd = new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
  }

  return {
    gte: startDate,
    lte: adjustedEnd,
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
      status: { notIn: ["CANCELLED", "QUOTE"] },
    },
    include: {
      customer: true,
    },
  });

  return orders.map((order: any) => {
    const balance = toNumber(order.balanceDue);
    const dueDate = order.deliveryDate ? new Date(order.deliveryDate) : (order.orderDate ? new Date(order.orderDate) : new Date());
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
    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : (invoice.issueDate ? new Date(invoice.issueDate) : new Date());
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

/**
 * AR Aging aggregated by customer with bucket breakdown
 */
export async function getArAgingSummary(tenantId: string, startDate?: Date, endDate?: Date) {
  const orders = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      balanceDue: { gt: 0 },
      status: { notIn: ["CANCELLED", "QUOTE"] },
      orderDate: buildDateRange(startDate, endDate),
    },
    include: {
      customer: true,
    },
  });

  const now = Date.now();
  const byCustomer = new Map<string, {
    customerId: string;
    customerName: string;
    customerType: string;
    bucket0_30: number;
    bucket31_60: number;
    bucket61_90: number;
    bucket90_plus: number;
    totalOutstanding: number;
  }>();

  for (const order of orders) {
    const cid = order.customerId;
    const current = byCustomer.get(cid) || {
      customerId: cid,
      customerName: order.customer.name,
      customerType: order.customer.type,
      bucket0_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucket90_plus: 0,
      totalOutstanding: 0,
    };

    const balance = toNumber(order.balanceDue);
    const dueDate = order.deliveryDate ? new Date(order.deliveryDate) : (order.orderDate ? new Date(order.orderDate) : new Date());
    const daysOverdue = Math.max(
      0,
      Math.floor((now - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    if (daysOverdue <= 30) current.bucket0_30 += balance;
    else if (daysOverdue <= 60) current.bucket31_60 += balance;
    else if (daysOverdue <= 90) current.bucket61_90 += balance;
    else current.bucket90_plus += balance;

    current.totalOutstanding += balance;
    byCustomer.set(cid, current);
  }

  return Array.from(byCustomer.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
}

/**
 * AP Aging aggregated by supplier with bucket breakdown
 */
export async function getApAgingSummary(tenantId: string) {
  const invoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId,
      status: { in: ["RECEIVED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      supplier: true,
    },
  });

  const now = Date.now();
  const bySupplier = new Map<string, {
    supplierId: string;
    supplierName: string;
    bucket0_30: number;
    bucket31_60: number;
    bucket61_90: number;
    bucket90_plus: number;
    totalOutstanding: number;
  }>();

  for (const invoice of invoices) {
    const sid = invoice.supplierId;
    const balance = toNumber(invoice.totalAmount) - toNumber(invoice.amountPaid);
    if (balance <= 0) continue;

    const current = bySupplier.get(sid) || {
      supplierId: sid,
      supplierName: invoice.supplier.name,
      bucket0_30: 0,
      bucket31_60: 0,
      bucket61_90: 0,
      bucket90_plus: 0,
      totalOutstanding: 0,
    };

    const dueDate = invoice.dueDate ? new Date(invoice.dueDate) : (invoice.issueDate ? new Date(invoice.issueDate) : new Date());
    const daysOverdue = Math.max(
      0,
      Math.floor((now - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
    );

    if (daysOverdue <= 30) current.bucket0_30 += balance;
    else if (daysOverdue <= 60) current.bucket31_60 += balance;
    else if (daysOverdue <= 90) current.bucket61_90 += balance;
    else current.bucket90_plus += balance;

    current.totalOutstanding += balance;
    bySupplier.set(sid, current);
  }

  return Array.from(bySupplier.values()).sort((a, b) => b.totalOutstanding - a.totalOutstanding);
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

  // Customer payments (salesOrderId) = operating inflows
  const operatingInflows = payments
    .filter((payment: any) => payment.salesOrderId)
    .reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0);

  // Expenses = operating outflows
  const operatingOutflows = expenses.reduce((sum: number, expense: any) => sum + toNumber(expense.amount), 0);

  // Supplier payments (purchaseOrderId or supplierInvoiceId) = financing outflows
  const financingOutflows = payments
    .filter((payment: any) => payment.purchaseOrderId || payment.supplierInvoiceId)
    .reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0);

  // Other payments (deposits, transfers, etc.) - could be investing/financing
  const otherPayments = payments
    .filter((payment: any) => !payment.salesOrderId && !payment.purchaseOrderId && !payment.supplierInvoiceId)
    .reduce((sum: number, payment: any) => sum + toNumber(payment.amount), 0);

  return {
    operating: operatingInflows - operatingOutflows,
    investing: 0,
    financing: -financingOutflows + otherPayments,
    netChange: operatingInflows - operatingOutflows - financingOutflows + otherPayments,
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

/**
 * Sales Trend - Monthly comparison for current vs previous period
 * Uses same data source as dashboard (sales orders) for consistency
 */
export async function getSalesTrend(
  tenantId: string,
  startDate?: Date,
  endDate?: Date,
  groupBy: 'month' | 'salesperson' | 'category' = 'month'
) {
  const orders = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      status: { not: 'CANCELLED' },
      orderDate: buildDateRange(startDate, endDate),
    },
    include: {
      customer: true,
      salesperson: true,
      lineItems: {
        include: {
          productVariant: {
            include: { product: true },
          },
        },
      },
    },
    orderBy: { orderDate: 'asc' },
  });

  if (groupBy === 'month') {
    const monthly = new Map<string, { revenue: number; quantity: number; orders: number }>();
    
    for (const order of orders) {
      const monthKey = order.orderDate.toISOString().slice(0, 7); // YYYY-MM
      const current = monthly.get(monthKey) || { revenue: 0, quantity: 0, orders: 0 };
      
      for (const line of order.lineItems) {
        const lineRevenue = line.quantity * toNumber(line.unitPrice);
        const discAmt = line.discountAmount
          ? toNumber(line.discountAmount)
          : lineRevenue * (toNumber(line.discountPct) / 100);
        current.revenue += lineRevenue - discAmt;
        current.quantity += line.quantity;
      }
      current.orders += 1;
      monthly.set(monthKey, current);
    }

    return Array.from(monthly.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  if (groupBy === 'salesperson') {
    const bySalesperson = new Map<string, { name: string; revenue: number; quantity: number; orders: number }>();
    
    for (const order of orders) {
      const spId = order.salespersonId || 'unassigned';
      const spName = order.salesperson?.name || 'Unassigned';
      const current = bySalesperson.get(spId) || { name: spName, revenue: 0, quantity: 0, orders: 0 };
      
      for (const line of order.lineItems) {
        const lineRevenue = line.quantity * toNumber(line.unitPrice);
        const discAmt = line.discountAmount
          ? toNumber(line.discountAmount)
          : lineRevenue * (toNumber(line.discountPct) / 100);
        current.revenue += lineRevenue - discAmt;
        current.quantity += line.quantity;
      }
      current.orders += 1;
      bySalesperson.set(spId, current);
    }

    return Array.from(bySalesperson.values())
      .sort((a, b) => b.revenue - a.revenue);
  }

  if (groupBy === 'category') {
    const byCategory = new Map<string, { revenue: number; quantity: number; orders: number }>();
    
    for (const order of orders) {
      for (const line of order.lineItems) {
        const category = line.productVariant?.product.category || 'Custom';
        const current = byCategory.get(category) || { revenue: 0, quantity: 0, orders: 0 };
        
        const lineRevenue = line.quantity * toNumber(line.unitPrice);
        const discAmt = line.discountAmount
          ? toNumber(line.discountAmount)
          : lineRevenue * (toNumber(line.discountPct) / 100);
        current.revenue += lineRevenue - discAmt;
        current.quantity += line.quantity;
        current.orders += 1;
        byCategory.set(category, current);
      }
    }

    return Array.from(byCategory.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }

  return [];
}

/**
 * Purchase Order Summary - Status breakdown with supplier spend
 * Synced with dashboard purchasing metrics
 */
export async function getPurchaseOrderSummary(
  tenantId: string,
  startDate?: Date,
  endDate?: Date
) {
  const [pos, supplierInvoices] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        tenantId,
        orderDate: buildDateRange(startDate, endDate),
      },
      include: {
        supplier: true,
        lineItems: { include: { productVariant: { include: { product: true } } } },
        goodsReceipts: true,
      },
    }),
    prisma.supplierInvoice.findMany({
      where: {
        tenantId,
        issueDate: buildDateRange(startDate, endDate),
      },
      include: { supplier: true },
    }),
  ]);

  // PO status breakdown
  const statusCounts = pos.reduce((acc, po) => {
    acc[po.status] = (acc[po.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Supplier spend (from supplier invoices - actual bills received)
  const supplierSpend = supplierInvoices.reduce((acc, inv) => {
    const current = acc.get(inv.supplierId) || { 
      supplier: inv.supplier.name, 
      spend: 0, 
      invoices: 0,
      paid: 0,
      pending: 0 
    };
    current.spend += toNumber(inv.totalAmount);
    current.invoices += 1;
    current.paid += toNumber(inv.amountPaid);
    current.pending += toNumber(inv.totalAmount) - toNumber(inv.amountPaid);
    acc.set(inv.supplierId, current);
    return acc;
  }, new Map<string, { supplier: string; spend: number; invoices: number; paid: number; pending: number }>());

  // Total PO value
  const totalPoValue = pos.reduce((sum, po) => sum + toNumber(po.totalAmount), 0);

  return {
    statusBreakdown: statusCounts,
    totalPoValue,
    totalPoCount: pos.length,
    supplierSpend: Array.from(supplierSpend.values())
      .sort((a, b) => b.spend - a.spend),
    recentPos: pos
      .sort((a, b) => b.orderDate.getTime() - a.orderDate.getTime())
      .slice(0, 20)
      .map(po => ({
        id: po.id,
        supplier: po.supplier.name,
        status: po.status,
        orderDate: po.orderDate,
        expectedDelivery: po.expectedDelivery,
        totalAmount: toNumber(po.totalAmount),
        goodsReceipts: po.goodsReceipts.length,
      })),
  };
}

/**
 * Audit Report - Paginated, filterable audit trail
 * Synced with AuditLog model
 */
export async function getAuditReport(
  tenantId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    action?: string;
    entityType?: string;
    userId?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { startDate, endDate, action, entityType, userId, page = 1, pageSize = 50 } = options;
  
  const where: any = { tenantId };
  if (startDate || endDate) {
    where.timestamp = buildDateRange(startDate, endDate);
  }
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs: logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      user: log.user?.name || 'System',
      userEmail: log.user?.email,
      previousState: log.previousState,
      newState: log.newState,
      ipAddress: log.ipAddress,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Outstanding Receivables - Detailed AR with customer info and aging
 * Synced with getAraAgingReport and AR Ledger
 */
export async function getOutstandingReceivables(tenantId: string) {
  const orders = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      balanceDue: { gt: 0 },
      status: { notIn: ['CANCELLED', 'QUOTE'] },
    },
    include: {
      customer: true,
      salesperson: true,
      taxInvoices: { select: { id: true, invoiceNumber: true, status: true, issueDate: true } },
    },
    orderBy: { balanceDue: 'desc' },
  });

  const now = Date.now();
  return orders.map((order: any) => {
    const balance = toNumber(order.balanceDue);
    const dueDate = order.deliveryDate ? new Date(order.deliveryDate) : (order.orderDate ? new Date(order.orderDate) : new Date());
    const daysOverdue = Math.max(
      0,
      Math.floor((now - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    let bucket: string;
    if (daysOverdue <= 30) bucket = '0-30';
    else if (daysOverdue <= 60) bucket = '31-60';
    else if (daysOverdue <= 90) bucket = '61-90';
    else bucket = '90+';

    const nonCancelledInvoices = (order.taxInvoices || []).filter((ti: any) => ti.status !== 'CANCELLED');
    const invoiced = nonCancelledInvoices.length > 0;
    const latestInvoice = nonCancelledInvoices
      .sort((a: any, b: any) => new Date(b.issueDate || 0).getTime() - new Date(a.issueDate || 0).getTime())[0];

    return {
      salesOrderId: order.id,
      customer: order.customer.name,
      customerType: order.customer.type,
      salesperson: order.salesperson?.name || 'Unassigned',
      orderDate: order.orderDate,
      dueDate,
      balanceDue: balance,
      daysOverdue,
      bucket,
      orderAmount: toNumber(order.orderAmount),
      paidAmount: toNumber(order.paidAmount),
      isInvoiced: invoiced,
      latestInvoiceNumber: latestInvoice?.invoiceNumber || null,
      latestInvoiceStatus: latestInvoice?.status || null,
    };
  });
}

/**
 * Stock Movements - Detailed movement log with filters
 * Synced with StockMovement model and inventory valuation
 */
export async function getStockMovements(
  tenantId: string,
  options: {
    startDate?: Date;
    endDate?: Date;
    productVariantId?: string;
    warehouseId?: string;
    type?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const { startDate, endDate, productVariantId, warehouseId, type, page = 1, pageSize = 100 } = options;
  
  const where: any = { tenantId };
  if (startDate || endDate) where.occurredAt = buildDateRange(startDate, endDate);
  if (productVariantId) where.productVariantId = productVariantId;
  if (warehouseId) where.warehouseId = warehouseId;
  if (type) where.type = type;

  const [movements, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        productVariant: {
          include: { product: true },
        },
        warehouse: true,
        user: { select: { name: true } },
      },
      orderBy: { occurredAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return {
    movements: movements.map(m => ({
      id: m.id,
      occurredAt: m.occurredAt,
      type: m.type,
      quantity: m.quantity,
      balanceAfter: m.balanceAfter,
      source: m.source,
      reason: m.reason,
      product: m.productVariant.product.name,
      variant: m.productVariant.variantName,
      sku: m.productVariant.skuVariant,
      warehouse: m.warehouse.name,
      user: m.user?.name || 'System',
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}


