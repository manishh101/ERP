import { prisma } from "../config/prisma";
import { withCache, CACHE_KEYS } from "../config/redis";
import { getProfitAndLoss } from "./report.service";
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

function startOfCurrentYear() {
  // Nepal fiscal year starts Shrawan 1 (mid-July). Use calendar year as approximation.
  const date = new Date();
  return new Date(date.getFullYear(), 0, 1);
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
  const cacheKey = CACHE_KEYS.FINANCIAL_SUMMARY_MONTH;

  return withCache(cacheKey, 900, async () => {
    let since: Date;
    const now = new Date();

    if (period === "today") {
      since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === "month") {
      since = startOfCurrentMonth();
    } else {
      since = startOfCurrentYear();
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
  });
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
        const name = `${li.productVariant.product.name} / ${li.productVariant.variantName}`;
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

    const yearStart = startOfCurrentYear();
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
          value += li.quantity * toNumber(li.unitPrice) * (1 - toNumber(li.discountPct) / 100);
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
    prisma.inventory.findMany({
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
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

  const inventoryValue = inventoryItems.reduce((sum, item) => {
    const baseCost = toNumber(item.productVariant.product.costPrice);
    const extra = toNumber(item.productVariant.additionalCost);
    return sum + item.quantity * (baseCost + extra);
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

  allSalesOrders.forEach((order) => {
    const bucket = revenueVsCogs.find(
      (item) => item.month === new NepaliDate(order.orderDate).format("MMMM")
    );
    if (!bucket) return;
    order.lineItems.forEach((lineItem) => {
      const revenue = lineItem.quantity * toNumber(lineItem.unitPrice);
      const cogs =
        lineItem.quantity *
        (toNumber(lineItem.productVariant.product.costPrice) +
          toNumber(lineItem.productVariant.additionalCost));
      bucket.revenue += revenue;
      bucket.cogs += cogs;
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
      const name = `${lineItem.productVariant.product.name} / ${lineItem.productVariant.variantName}`;
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

  const profitAndLoss = await getProfitAndLoss(monthStart, new Date());

  // AR Aging buckets — now included in main summary for dashboard widget
  const arAging = await getArAgingBuckets();

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
        value: formatCurrency(profitAndLoss.netProfit),
        change: "Current month",
        tone: profitAndLoss.netProfit >= 0 ? "positive" : "negative",
      },
    ],
    revenueVsCogs,
    cashFlow: cashFlowSeries,
    topProducts: topSellingProducts,
    arAging, // AR Aging buckets added to summary response
    recentSalesOrders: recentSalesOrders.map((order) => ({
      id: order.id,
      customer: order.customer.name,
      status: order.status,
      deliveryDate: order.deliveryDate?.toISOString() ?? order.orderDate.toISOString(),
      total: order.lineItems.reduce(
        (sum, item) => sum + item.quantity * toNumber(item.unitPrice),
        0
      ),
    })),
    lowStockItems: lowStockItems.map((variant) => ({
      id: variant.id,
      product: variant.product.name,
      variant: variant.variantName,
      quantity: variant.stockQuantity,
    })),
  };
}
