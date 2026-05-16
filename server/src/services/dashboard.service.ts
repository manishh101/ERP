import { prisma } from "../config/prisma";
import { withCache, CACHE_KEYS } from "../config/redis";
import { getAraAgingReport } from "./report.service";
import { toNumber } from "../utils/number";
import NepaliDate from "nepali-datetime";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function startOfCurrentMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfPreviousMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() - 1, 1);
}

function endOfPreviousMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 0, 23, 59, 59, 999);
}

function startOfCurrentFiscalYear() {
  // Nepal fiscal year starts Shrawan 1 (BS month index 3, ~mid-July AD).
  const nd = new NepaliDate(new Date());
  const bsYear = nd.getMonth() >= 3 ? nd.getYear() : nd.getYear() - 1;
  return new NepaliDate(bsYear, 3, 1).getDateObject();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/financial-summary
// Returns: Amount Received vs Amount Pending, filterable by today/month/year
// ---------------------------------------------------------------------------

export async function getFinancialSummary(period: "today" | "month" | "year" = "month") {
  // NOTE: Caching is handled by the route handler (dashboard.routes.ts).
  // Do NOT add withCache here — the route already caches per-period correctly.
  let since: Date;
  const now = new Date();

  if (period === "today") {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "month") {
    since = startOfCurrentMonth();
  } else {
    since = startOfCurrentFiscalYear();
  }

  const [received, pendingOrders] = await Promise.all([
    // Amount Received: sum of all payments in the period linked to sales orders
    prisma.payment.aggregate({
      where: {
        salesOrderId: { not: null },
        paymentDate: { gte: since },
      },
      _sum: { amount: true },
    }),
    // Amount Pending (AR): total outstanding balance across all showrooms
    prisma.salesOrder.findMany({
      where: {
        balanceDue: { gt: 0 },
        status: { not: "CANCELLED" },
      },
      select: { balanceDue: true },
    }),
  ]);

  const amountReceived = toNumber(received._sum.amount ?? 0);
  const amountPending = pendingOrders.reduce(
    (sum, o) => sum + toNumber(o.balanceDue),
    0
  );

  return {
    period,
    amountReceived,
    amountPending,
    amountReceivedFormatted: formatCurrency(amountReceived),
    amountPendingFormatted: formatCurrency(amountPending),
  };
}

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/ar-aging
// Returns outstanding debt bucketed into 0-30, 31-60, 61-90, 90+ days
// ---------------------------------------------------------------------------

export interface AgingBuckets {
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
  totalOutstanding: number;
  customerCount: number;
}

export async function getArAgingBuckets(): Promise<AgingBuckets> {
  return withCache(CACHE_KEYS.AR_AGING, 900, async () => {
    const rows = await getAraAgingReport();

    const buckets: AgingBuckets = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
      totalOutstanding: 0,
      customerCount: 0,
    };

    const seenCustomers = new Set<string>();

    for (const row of rows) {
      buckets[row.bucket as keyof AgingBuckets] =
        (buckets[row.bucket as keyof AgingBuckets] as number) + row.balance;
      buckets.totalOutstanding += row.balance;
      seenCustomers.add(row.customer);
    }

    buckets.customerCount = seenCustomers.size;
    return buckets;
  });
}

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/top-entities
// Returns: Top showrooms by revenue + top products by quantity dispatched
// ---------------------------------------------------------------------------

export async function getTopEntities() {
  return withCache(CACHE_KEYS.TOP_ENTITIES, 900, async () => {
    const allOrders = await prisma.salesOrder.findMany({
      where: { status: { not: "CANCELLED" } },
      include: {
        customer: true,
        lineItems: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    });

    // Top showrooms by cumulative orderAmount
    const showroomMap = new Map<string, { name: string; revenue: number }>();
    for (const order of allOrders) {
      const existing = showroomMap.get(order.customerId) ?? {
        name: order.customer.name,
        revenue: 0,
      };
      existing.revenue += toNumber(order.orderAmount);
      showroomMap.set(order.customerId, existing);
    }
    const topShowrooms = [...showroomMap.entries()]
      .map(([id, data]) => ({ id, name: data.name, revenue: data.revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Top products by total units dispatched
    const productMap = new Map<string, number>();
    for (const order of allOrders) {
      for (const li of order.lineItems) {
        const name = li.productVariant 
          ? `${li.productVariant.product.name} / ${li.productVariant.variantName}`
          : li.customProductName || "Custom Item";
        productMap.set(name, (productMap.get(name) ?? 0) + li.quantity);
      }
    }
    const topProducts = [...productMap.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return { topShowrooms, topProducts };
  });
}

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/showroom-analytics/:customerId
// Returns: volume + value for Current Month, Previous Month, YTD
// ---------------------------------------------------------------------------

export interface ShowroomPeriodMetrics {
  units: number;
  value: number;
}

export interface ShowroomAnalytics {
  customerId: string;
  customerName: string;
  currentMonth: ShowroomPeriodMetrics;
  previousMonth: ShowroomPeriodMetrics;
  yearToDate: ShowroomPeriodMetrics;
}

export async function getShowroomAnalytics(customerId: string): Promise<ShowroomAnalytics> {
  return withCache(CACHE_KEYS.SHOWROOM_ANALYTICS(customerId), 900, async () => {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new Error(`Customer ${customerId} not found`);

    const yearStart = startOfCurrentFiscalYear();
    const monthStart = startOfCurrentMonth();
    const prevMonthStart = startOfPreviousMonth();
    const prevMonthEnd = endOfPreviousMonth();

    // Pull all orders for this customer since start of year (covers all 3 periods)
    const orders = await prisma.salesOrder.findMany({
      where: {
        customerId,
        status: { not: "CANCELLED" },
        orderDate: { gte: yearStart },
      },
      include: {
        lineItems: true,
      },
    });

    function computeMetrics(filteredOrders: typeof orders): ShowroomPeriodMetrics {
      let units = 0;
      let value = 0;
      for (const order of filteredOrders) {
        for (const li of order.lineItems) {
          units += li.quantity;
          const lineGross = li.quantity * toNumber(li.unitPrice);
          const discAmt = li.discountAmount ? toNumber(li.discountAmount) : lineGross * (toNumber(li.discountPct) / 100);
          value += lineGross - discAmt;
        }
      }
      return { units, value };
    }

    const currentMonthOrders = orders.filter((o) => o.orderDate >= monthStart);
    const prevMonthOrders = orders.filter(
      (o) => o.orderDate >= prevMonthStart && o.orderDate <= prevMonthEnd
    );
    const ytdOrders = orders; // already filtered from yearStart

    return {
      customerId,
      customerName: customer.name,
      currentMonth: computeMetrics(currentMonthOrders),
      previousMonth: computeMetrics(prevMonthOrders),
      yearToDate: computeMetrics(ytdOrders),
    };
  });
}

// ---------------------------------------------------------------------------
// Legacy — GET /dashboard/summary (kept for backward compat with existing UI)
// ---------------------------------------------------------------------------

export async function getDashboardSummary() {
  const monthStart = startOfCurrentMonth();

  const [
    monthOrders,
    inventoryItems,
    deliveries,
    lowStockItems,
    recentSalesOrders,
    allSalesOrders,
  ] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        orderDate: { gte: monthStart },
        status: { not: "CANCELLED" },
      },
      select: { orderAmount: true },
    }),
    prisma.productVariant.findMany({
      include: {
        product: true,
      },
    }),
    prisma.delivery.count({
      where: {
        status: {
          in: ["SCHEDULED", "OUT_FOR_DELIVERY", "FAILED_ATTEMPT"],
        },
      },
    }),
    prisma.productVariant.findMany({
      where: {
        stockQuantity: {
          lte: 5,
        },
      },
      include: {
        product: true,
      },
      take: 10,
    }),
    prisma.salesOrder.findMany({
      include: {
        customer: true,
        lineItems: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.salesOrder.findMany({
      include: {
        lineItems: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalRevenueMtd = monthOrders.reduce((sum, o) => sum + toNumber(o.orderAmount), 0);
  const openOrders = await prisma.salesOrder.findMany({
    where: { balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
    select: { balanceDue: true },
  });
  const outstandingArValue = openOrders.reduce((sum, o) => sum + toNumber(o.balanceDue), 0);

  const inventoryValue = inventoryItems.reduce((sum, variant) => {
    const baseCost = toNumber(variant.product.costPrice);
    const extra = toNumber(variant.additionalCost);
    return sum + variant.stockQuantity * (baseCost + extra);
  }, 0);

  const invoicePayments = await prisma.payment.findMany({
    where: {
      salesOrderId: { not: null },
      paymentDate: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
      },
    },
  });

  const expenseRows = await prisma.expense.findMany({
    where: {
      date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
      },
    },
  });

  const revenueVsCogs = Array.from({ length: 12 }).map((_, index) => {
    const nd = new NepaliDate();
    let m = nd.getMonth() - (11 - index);
    let y = nd.getYear();
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const bucketNd = new NepaliDate(y, m, 1);
    const label = bucketNd.format("MMMM");
    return { month: label, revenue: 0, cogs: 0 };
  });

  const cashFlowSeries = Array.from({ length: 6 }).map((_, index) => {
    const nd = new NepaliDate();
    let m = nd.getMonth() - (5 - index);
    let y = nd.getYear();
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const bucketNd = new NepaliDate(y, m, 1);
    const label = bucketNd.format("MMMM");
    return { month: label, inflow: 0, outflow: 0 };
  });

  // Also compute total COGS across all orders for server-side Net Profit
  let allTimeTotalRevenue = 0;
  let allTimeTotalCogs = 0;
  let mtdNetProfit = 0;

  allSalesOrders.forEach((order) => {
    const isMtd = order.orderDate >= monthStart;
    const bucket = revenueVsCogs.find(
      (item) => item.month === new NepaliDate(order.orderDate).format("MMMM")
    );
    order.lineItems.forEach((lineItem) => {
      // Apply discounts to revenue (Fix #7)
      const lineGross = lineItem.quantity * toNumber(lineItem.unitPrice);
      const discAmt = lineItem.discountAmount
        ? toNumber(lineItem.discountAmount)
        : lineGross * (toNumber(lineItem.discountPct) / 100);
      const revenue = lineGross - discAmt;
      const cogs =
        lineItem.quantity *
        (lineItem.productVariant 
          ? (toNumber(lineItem.productVariant.product.costPrice) + toNumber(lineItem.productVariant.additionalCost))
          : toNumber(lineItem.unitPrice) * 0.7); // 70% estimated COGS for custom items if no variant
      if (bucket) {
        bucket.revenue += revenue;
        bucket.cogs += cogs;
      }
      allTimeTotalRevenue += revenue;
      allTimeTotalCogs += cogs;
      if (isMtd) {
        mtdNetProfit += (revenue - cogs);
      }
    });
  });

  invoicePayments.forEach((payment) => {
    const bucket = cashFlowSeries.find(
      (item) => item.month === new NepaliDate(payment.paymentDate).format("MMMM")
    );
    if (bucket) bucket.inflow += toNumber(payment.amount);
  });

  expenseRows.forEach((expense) => {
    const bucket = cashFlowSeries.find(
      (item) => item.month === new NepaliDate(expense.date).format("MMMM")
    );
    if (bucket) bucket.outflow += toNumber(expense.amount);
  });

  const topProductMap = new Map<string, number>();
  allSalesOrders.forEach((order) => {
    order.lineItems.forEach((lineItem) => {
      const name = lineItem.productVariant 
        ? `${lineItem.productVariant.product.name} / ${lineItem.productVariant.variantName}`
        : lineItem.customProductName || "Custom Item";
      topProductMap.set(name, (topProductMap.get(name) ?? 0) + lineItem.quantity);
    });
  });

  const topSellingProducts = [...topProductMap.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 10);

  const customInProduction = await prisma.salesOrder.count({
    where: {
      isCustomOrder: true,
      status: { in: ["CONFIRMED", "DEPOSIT_PAID", "IN_WAREHOUSE"] },
    },
  });

  // AR Aging buckets — now included in main summary for dashboard widget
  const arAging = await getArAgingBuckets();

  // Per-customer aging buckets from server-side days-overdue calculation (Fix #5)
  const arAgingRows = await getAraAgingReport();
  const arAgingByCustomer: Record<string, string> = {};
  for (const row of arAgingRows) {
    // If a customer has multiple orders in different buckets, keep the worst (oldest)
    const existing = arAgingByCustomer[row.customer];
    const BUCKET_ORDER = ["0-30", "31-60", "61-90", "90+"];
    if (!existing || BUCKET_ORDER.indexOf(row.bucket) > BUCKET_ORDER.indexOf(existing)) {
      arAgingByCustomer[row.customer] = row.bucket;
    }
  }

  return {
    kpis: [
      {
        label: "Revenue (MTD)",
        value: formatCurrency(totalRevenueMtd),
        change: "Live",
        tone: "positive",
      },
      {
        label: "Outstanding AR",
        value: formatCurrency(outstandingArValue),
        change: "Open orders",
        tone: outstandingArValue > 0 ? "neutral" : "positive",
      },
      {
        label: "Custom Orders",
        value: String(customInProduction),
        change: "In production",
        tone: "neutral",
      },
      {
        label: "Inventory Value",
        value: formatCurrency(inventoryValue),
        change: "Weighted average",
        tone: "positive",
      },
      {
        label: "Pending Deliveries",
        value: String(deliveries),
        change: "Current queue",
        tone: deliveries > 0 ? "neutral" : "positive",
      },
      {
        label: "Low Stock Items",
        value: String(lowStockItems.length),
        change: "Threshold alerts",
        tone: lowStockItems.length > 0 ? "negative" : "positive",
      },
      {
        label: "Net Profit (MTD)",
        value: formatCurrency(mtdNetProfit),
        change: "Current month",
        tone: mtdNetProfit >= 0 ? "positive" : "negative",
      },
    ],
    revenueVsCogs,
    cashFlow: cashFlowSeries,
    topProducts: topSellingProducts,
    arAging, // AR Aging buckets added to summary response
    arAgingByCustomer, // Per-customer aging buckets by days overdue (Fix #5)
    // Server-side COGS/Net Profit (Fix #2) — single source of truth
    totalRevenue: allTimeTotalRevenue,
    totalCogs: allTimeTotalCogs,
    netProfit: allTimeTotalRevenue - allTimeTotalCogs,
    recentSalesOrders: recentSalesOrders.map((order) => ({
      id: order.id,
      customer: order.customer.name,
      status: order.status,
      deliveryDate: order.deliveryDate?.toISOString() ?? order.orderDate.toISOString(),
      total: toNumber(order.orderAmount), // Fix #8: Use orderAmount, not raw line sum
    })),
    lowStockItems: lowStockItems.map((variant: any) => ({
      id: variant.id,
      product: variant.product.name,
      variant: variant.variantName,
      quantity: variant.stockQuantity,
    })),
  };
}
