import { prisma } from "../config/prisma";
import { withCache, CACHE_KEYS } from "../config/redis";
import {
  getAraAgingReport,
  getSalesTrend,
  getTaxSummary,
  getArAgingSummary,
  getOutstandingReceivables,
  getAuditReport,
} from "./report.service";
import { toNumber } from "../utils/number";
import type { UserRole } from "@prisma/client";
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

function startOfToday() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfToday() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
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

export async function getFinancialSummary(tenantId: string, period: "today" | "month" | "year" = "month") {
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
        tenantId,
        salesOrderId: { not: null },
        paymentDate: { gte: since },
      },
      _sum: { amount: true },
    }),
    // Amount Pending (AR): total outstanding balance across all showrooms
    prisma.salesOrder.findMany({
      where: {
        tenantId,
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

export async function getArAgingBuckets(tenantId: string): Promise<AgingBuckets> {
  return withCache(CACHE_KEYS.AR_AGING(tenantId), 900, async () => {
    const rows = await getAraAgingReport(tenantId);

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

export async function getTopEntities(tenantId: string) {
  return withCache(CACHE_KEYS.TOP_ENTITIES(tenantId), 900, async () => {
    const allOrders = await prisma.salesOrder.findMany({
      where: { tenantId, status: { not: "CANCELLED" } },
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

export async function getShowroomAnalytics(tenantId: string, customerId: string): Promise<ShowroomAnalytics> {
  return withCache(CACHE_KEYS.SHOWROOM_ANALYTICS(tenantId, customerId), 900, async () => {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new Error(`Customer ${customerId} not found`);

    const yearStart = startOfCurrentFiscalYear();
    const monthStart = startOfCurrentMonth();
    const prevMonthStart = startOfPreviousMonth();
    const prevMonthEnd = endOfPreviousMonth();

    // Pull all orders for this customer since start of year (covers all 3 periods)
    const orders = await prisma.salesOrder.findMany({
      where: {
        tenantId,
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

// ===========================================================================
// GET /dashboard/overview — role-aware command center
//
// One consolidated, per-role payload. The ACCOUNTING BOUNDARY is enforced here
// at composition time, not in the UI:
//   - AR / commercial truth  → SalesOrder.balanceDue + Payment (salesOrderId)
//   - VAT / tax truth        → getTaxSummary (VatRegister only)
//   These are never summed and live in separate fields/sections.
//   - WAREHOUSE and DRIVER builders call NO money-bearing service, so those
//     payloads cannot leak revenue / AR / VAT even by accident.
// ===========================================================================

// -- Lite row DTOs (kept flat & serialisable; dates as ISO strings) ----------

export interface RecentOrderLite {
  id: string;
  customer: string;
  status: string;
  deliveryDate: string;
  total: number;
}

export interface RecentPaymentLite {
  id: string;
  customer: string;
  amount: number;
  method: string;
  date: string;
}

export interface LowStockLite {
  id: string;
  product: string;
  variant: string;
  quantity: number;
  threshold: number;
}

export interface StockLite {
  id: string;
  product: string;
  variant: string;
  quantity: number;
}

export interface ActivityLite {
  id: string;
  action: string;
  entityType: string;
  user: string;
  timestamp: string;
}

export interface DeliveryLite {
  id: string;
  customer: string;
  address: string;
  status: string;
  scheduledDate: string;
}

export interface TopCustomerLite {
  id: string;
  name: string;
  revenue: number;
}

export interface ArCustomerRow {
  customerId: string;
  customerName: string;
  customerType: string;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90_plus: number;
  totalOutstanding: number;
}

export interface AlertLite {
  id: string;
  severity: "info" | "warn" | "danger";
  title: string;
  detail: string;
}

export interface SalesTrendPoint {
  month: string;
  revenue: number;
  orders: number;
}

// -- Per-role payloads (discriminated union on `role`) -----------------------

export interface AdminOverview {
  role: "ADMIN";
  generatedAt: string;
  finance: { salesToday: number; salesMonth: number; receivedMonth: number; outstandingAr: number };
  arAging: AgingBuckets;
  salesTrend: SalesTrendPoint[];
  topCustomers: TopCustomerLite[];
  topProducts: Array<{ name: string; quantity: number }>;
  lowStock: { count: number; items: LowStockLite[] };
  recentOrders: RecentOrderLite[];
  recentPayments: RecentPaymentLite[];
  recentActivity: ActivityLite[];
}

export interface AccountantOverview {
  role: "ACCOUNTANT";
  generatedAt: string;
  receivables: { outstandingAr: number; customerCount: number };
  arAging: AgingBuckets;
  arByCustomer: ArCustomerRow[];
  payments: { receivedMonth: number; recent: RecentPaymentLite[] };
  vat: { outputTax: number; inputTax: number; netPayable: number };
  reconciliation: { invoicedCount: number; uninvoicedCount: number; uninvoicedValue: number };
  alerts: AlertLite[];
}

export interface SalesOverview {
  role: "SALES";
  generatedAt: string;
  today: { salesToday: number; ordersToday: number };
  orderStatus: Record<string, number>;
  pendingOrders: { count: number; items: RecentOrderLite[] };
  collections: { receivedMonth: number; recent: RecentPaymentLite[] };
  topCustomers: TopCustomerLite[];
}

export interface WarehouseOverview {
  role: "WAREHOUSE";
  generatedAt: string;
  stock: { totalVariants: number; lowStockCount: number; outOfStockCount: number };
  lowStock: { items: LowStockLite[] };
  outOfStock: { items: StockLite[] };
  deliveries: { today: Record<string, number>; activeQueue: number };
  pendingReceipts: { count: number };
}

export interface DriverOverview {
  role: "DRIVER";
  generatedAt: string;
  today: Record<string, number>;
  activeQueue: number;
  assigned: DeliveryLite[];
}

export type DashboardOverview =
  | AdminOverview
  | AccountantOverview
  | SalesOverview
  | WarehouseOverview
  | DriverOverview;

// -- New tenant-scoped aggregate helpers -------------------------------------

/** Total sales (orderAmount, ex-cancelled) for today + current month, plus today's order count. */
export async function getSalesTotals(tenantId: string) {
  const [today, month] = await Promise.all([
    prisma.salesOrder.aggregate({
      where: { tenantId, status: { not: "CANCELLED" }, orderDate: { gte: startOfToday() } },
      _sum: { orderAmount: true },
      _count: true,
    }),
    prisma.salesOrder.aggregate({
      where: { tenantId, status: { not: "CANCELLED" }, orderDate: { gte: startOfCurrentMonth() } },
      _sum: { orderAmount: true },
    }),
  ]);

  return {
    salesToday: toNumber(today._sum.orderAmount ?? 0),
    ordersToday: today._count,
    salesMonth: toNumber(month._sum.orderAmount ?? 0),
  };
}

/** Count of orders per status (all statuses present in the tenant). */
export async function getOrderStatusCounts(tenantId: string): Promise<Record<string, number>> {
  const grouped = await prisma.salesOrder.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of grouped) counts[row.status] = row._count._all;
  return counts;
}

/** Most recent orders. `openOnly` restricts to actionable (pre-dispatch) statuses. */
export async function getRecentOrders(
  tenantId: string,
  options: { take?: number; openOnly?: boolean } = {},
): Promise<RecentOrderLite[]> {
  const { take = 8, openOnly = false } = options;
  const orders = await prisma.salesOrder.findMany({
    where: {
      tenantId,
      ...(openOnly
        ? { status: { in: ["QUOTE", "CONFIRMED", "DEPOSIT_PAID", "PAID", "IN_WAREHOUSE"] } }
        : {}),
    },
    select: {
      id: true,
      status: true,
      orderAmount: true,
      orderDate: true,
      deliveryDate: true,
      customer: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return orders.map((order) => ({
    id: order.id,
    customer: order.customer.name,
    status: order.status,
    deliveryDate: (order.deliveryDate ?? order.orderDate).toISOString(),
    total: toNumber(order.orderAmount),
  }));
}

/** Most recent customer payments (AR — salesOrderId set). Supplier payments excluded. */
export async function getRecentPayments(tenantId: string, take = 8): Promise<RecentPaymentLite[]> {
  const payments = await prisma.payment.findMany({
    where: { tenantId, salesOrderId: { not: null } },
    select: {
      id: true,
      amount: true,
      method: true,
      paymentDate: true,
      salesOrder: { select: { customer: { select: { name: true } } } },
    },
    orderBy: { paymentDate: "desc" },
    take,
  });

  return payments.map((payment) => ({
    id: payment.id,
    customer: payment.salesOrder?.customer.name ?? "—",
    amount: toNumber(payment.amount),
    method: payment.method,
    date: payment.paymentDate.toISOString(),
  }));
}

/**
 * Variants at or below their product's low-stock threshold. Mirrors
 * inventory.routes.ts /low-stock (threshold-driven, not a hardcoded <=5).
 */
export async function getLowStockItems(
  tenantId: string,
  take = 8,
): Promise<{ count: number; items: LowStockLite[] }> {
  const variants = await prisma.productVariant.findMany({
    where: { tenantId, product: { lowStockThreshold: { gt: 0 } } },
    select: {
      id: true,
      variantName: true,
      stockQuantity: true,
      product: { select: { name: true, lowStockThreshold: true } },
    },
  });

  const low = variants
    .filter((v) => v.stockQuantity <= v.product.lowStockThreshold)
    .sort(
      (a, b) =>
        a.stockQuantity - a.product.lowStockThreshold - (b.stockQuantity - b.product.lowStockThreshold),
    );

  return {
    count: low.length,
    items: low.slice(0, take).map((v) => ({
      id: v.id,
      product: v.product.name,
      variant: v.variantName,
      quantity: v.stockQuantity,
      threshold: v.product.lowStockThreshold,
    })),
  };
}

/** Total variant count + how many are out of stock (stockQuantity <= 0). */
export async function getStockStatusCounts(
  tenantId: string,
): Promise<{ totalVariants: number; outOfStockCount: number }> {
  const [totalVariants, outOfStockCount] = await Promise.all([
    prisma.productVariant.count({ where: { tenantId } }),
    prisma.productVariant.count({ where: { tenantId, stockQuantity: { lte: 0 } } }),
  ]);
  return { totalVariants, outOfStockCount };
}

/** Variants that are fully out of stock. */
export async function getOutOfStockItems(tenantId: string, take = 8): Promise<StockLite[]> {
  const variants = await prisma.productVariant.findMany({
    where: { tenantId, stockQuantity: { lte: 0 } },
    select: {
      id: true,
      variantName: true,
      stockQuantity: true,
      product: { select: { name: true } },
    },
    orderBy: { stockQuantity: "asc" },
    take,
  });

  return variants.map((v) => ({
    id: v.id,
    product: v.product.name,
    variant: v.variantName,
    quantity: v.stockQuantity,
  }));
}

/**
 * Delivery snapshot. `driverId` scopes to one driver (DRIVER view);
 * `includeAssigned` additionally returns today's delivery list.
 */
export async function getDeliverySummary(
  tenantId: string,
  options: { driverId?: string; includeAssigned?: boolean } = {},
): Promise<{ today: Record<string, number>; activeQueue: number; assigned: DeliveryLite[] }> {
  const { driverId, includeAssigned = false } = options;
  const baseWhere = { tenantId, ...(driverId ? { driverId } : {}) };
  const todayWindow = { gte: startOfToday(), lte: endOfToday() };

  const [todayGroups, activeQueue, assigned] = await Promise.all([
    prisma.delivery.groupBy({
      by: ["status"],
      where: { ...baseWhere, scheduledDate: todayWindow },
      _count: { _all: true },
    }),
    prisma.delivery.count({
      where: { ...baseWhere, status: { in: ["SCHEDULED", "OUT_FOR_DELIVERY", "FAILED_ATTEMPT"] } },
    }),
    includeAssigned
      ? prisma.delivery.findMany({
          where: { ...baseWhere, scheduledDate: todayWindow },
          select: {
            id: true,
            status: true,
            scheduledDate: true,
            deliveryAddress: true,
            salesOrder: { select: { customer: { select: { name: true } } } },
          },
          orderBy: { scheduledDate: "asc" },
        })
      : Promise.resolve([] as Array<{
          id: string;
          status: string;
          scheduledDate: Date;
          deliveryAddress: string;
          salesOrder: { customer: { name: string } };
        }>),
  ]);

  const today: Record<string, number> = {};
  for (const row of todayGroups) today[row.status] = row._count._all;

  return {
    today,
    activeQueue,
    assigned: assigned.map((d) => ({
      id: d.id,
      customer: d.salesOrder.customer.name,
      address: d.deliveryAddress,
      status: d.status,
      scheduledDate: d.scheduledDate.toISOString(),
    })),
  };
}

/** Purchase orders awaiting goods receipt. */
export async function getPendingReceiptsCount(tenantId: string): Promise<number> {
  return prisma.purchaseOrder.count({
    where: { tenantId, status: { in: ["APPROVED", "SENT", "PARTIALLY_RECEIVED"] } },
  });
}

/**
 * AR reconciliation: how many outstanding orders have a tax invoice vs not,
 * and the outstanding value that is not yet invoiced. Derived from the AR side
 * (getOutstandingReceivables) — never mixed with VAT figures.
 */
export async function getUninvoicedArSummary(
  tenantId: string,
): Promise<{ invoicedCount: number; uninvoicedCount: number; uninvoicedValue: number }> {
  const rows = await getOutstandingReceivables(tenantId);
  let invoicedCount = 0;
  let uninvoicedCount = 0;
  let uninvoicedValue = 0;
  for (const row of rows) {
    if (row.isInvoiced) {
      invoicedCount += 1;
    } else {
      uninvoicedCount += 1;
      uninvoicedValue += row.balanceDue;
    }
  }
  return { invoicedCount, uninvoicedCount, uninvoicedValue };
}

/** Recent audit-log activity, flattened for the ADMIN feed. */
export async function getRecentActivity(tenantId: string, take = 8): Promise<ActivityLite[]> {
  const { logs } = await getAuditReport(tenantId, { pageSize: take });
  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    user: log.user,
    timestamp: (log.timestamp instanceof Date ? log.timestamp : new Date(log.timestamp)).toISOString(),
  }));
}

// -- Per-role builders -------------------------------------------------------

async function buildAdminOverview(tenantId: string): Promise<AdminOverview> {
  const [salesTotals, financial, arAging, trendRaw, topEntities, lowStock, recentOrders, recentPayments, recentActivity] =
    await Promise.all([
      getSalesTotals(tenantId),
      getFinancialSummary(tenantId, "month"),
      getArAgingBuckets(tenantId),
      getSalesTrend(tenantId, startOfCurrentFiscalYear(), new Date(), "month"),
      getTopEntities(tenantId),
      getLowStockItems(tenantId, 8),
      getRecentOrders(tenantId, { take: 8 }),
      getRecentPayments(tenantId, 8),
      getRecentActivity(tenantId, 8),
    ]);

  const trend = trendRaw as Array<{ month: string; revenue: number; quantity: number; orders: number }>;

  return {
    role: "ADMIN",
    generatedAt: new Date().toISOString(),
    finance: {
      salesToday: salesTotals.salesToday,
      salesMonth: salesTotals.salesMonth,
      receivedMonth: financial.amountReceived,
      outstandingAr: financial.amountPending,
    },
    arAging,
    salesTrend: trend.map((p) => ({ month: p.month, revenue: p.revenue, orders: p.orders })),
    topCustomers: topEntities.topShowrooms,
    topProducts: topEntities.topProducts,
    lowStock,
    recentOrders,
    recentPayments,
    recentActivity,
  };
}

async function buildAccountantOverview(tenantId: string): Promise<AccountantOverview> {
  const fyStart = startOfCurrentFiscalYear();
  const now = new Date();
  const [arAging, arByCustomerAll, financial, recentPayments, vat, reconciliation] = await Promise.all([
    getArAgingBuckets(tenantId),
    getArAgingSummary(tenantId),
    getFinancialSummary(tenantId, "month"),
    getRecentPayments(tenantId, 8),
    getTaxSummary(tenantId, fyStart, now),
    getUninvoicedArSummary(tenantId),
  ]);

  const alerts: AlertLite[] = [];
  if (arAging["90+"] > 0) {
    alerts.push({
      id: "ar-90-plus",
      severity: "danger",
      title: "Receivables over 90 days",
      detail: `${formatCurrency(arAging["90+"])} is more than 90 days overdue`,
    });
  }
  if (vat.netPayable > 0) {
    alerts.push({
      id: "vat-payable",
      severity: "warn",
      title: "VAT payable this fiscal year",
      detail: `${formatCurrency(vat.netPayable)} output VAT exceeds input VAT`,
    });
  }
  if (reconciliation.uninvoicedValue > 0) {
    alerts.push({
      id: "uninvoiced-ar",
      severity: "warn",
      title: "Uninvoiced receivables",
      detail: `${reconciliation.uninvoicedCount} order(s) worth ${formatCurrency(reconciliation.uninvoicedValue)} have an outstanding balance but no tax invoice`,
    });
  }

  return {
    role: "ACCOUNTANT",
    generatedAt: now.toISOString(),
    receivables: { outstandingAr: financial.amountPending, customerCount: arAging.customerCount },
    arAging,
    arByCustomer: arByCustomerAll.slice(0, 15),
    payments: { receivedMonth: financial.amountReceived, recent: recentPayments },
    vat,
    reconciliation,
    alerts,
  };
}

async function buildSalesOverview(tenantId: string): Promise<SalesOverview> {
  const [salesTotals, orderStatus, pendingItems, financial, recentPayments, topEntities] = await Promise.all([
    getSalesTotals(tenantId),
    getOrderStatusCounts(tenantId),
    getRecentOrders(tenantId, { take: 8, openOnly: true }),
    getFinancialSummary(tenantId, "month"),
    getRecentPayments(tenantId, 8),
    getTopEntities(tenantId),
  ]);

  const OPEN_STATUSES = ["QUOTE", "CONFIRMED", "DEPOSIT_PAID", "PAID", "IN_WAREHOUSE"];
  const pendingCount = OPEN_STATUSES.reduce((sum, status) => sum + (orderStatus[status] ?? 0), 0);

  return {
    role: "SALES",
    generatedAt: new Date().toISOString(),
    today: { salesToday: salesTotals.salesToday, ordersToday: salesTotals.ordersToday },
    orderStatus,
    pendingOrders: { count: pendingCount, items: pendingItems },
    collections: { receivedMonth: financial.amountReceived, recent: recentPayments },
    topCustomers: topEntities.topShowrooms,
  };
}

async function buildWarehouseOverview(tenantId: string): Promise<WarehouseOverview> {
  const [stockCounts, lowStock, outOfStock, deliveries, pendingReceipts] = await Promise.all([
    getStockStatusCounts(tenantId),
    getLowStockItems(tenantId, 10),
    getOutOfStockItems(tenantId, 10),
    getDeliverySummary(tenantId),
    getPendingReceiptsCount(tenantId),
  ]);

  return {
    role: "WAREHOUSE",
    generatedAt: new Date().toISOString(),
    stock: {
      totalVariants: stockCounts.totalVariants,
      lowStockCount: lowStock.count,
      outOfStockCount: stockCounts.outOfStockCount,
    },
    lowStock: { items: lowStock.items },
    outOfStock: { items: outOfStock },
    deliveries: { today: deliveries.today, activeQueue: deliveries.activeQueue },
    pendingReceipts: { count: pendingReceipts },
  };
}

async function buildDriverOverview(tenantId: string, driverId: string): Promise<DriverOverview> {
  const summary = await getDeliverySummary(tenantId, { driverId, includeAssigned: true });
  return {
    role: "DRIVER",
    generatedAt: new Date().toISOString(),
    today: summary.today,
    activeQueue: summary.activeQueue,
    assigned: summary.assigned,
  };
}

/**
 * Role-aware dashboard composer. Role comes from the verified JWT — never a
 * client hint. ADMIN/ACCOUNTANT/SALES/WAREHOUSE are cached per-role (900s);
 * DRIVER is per-user so it is computed live to avoid per-driver key explosion.
 */
export async function getDashboardOverview(
  tenantId: string,
  role: UserRole,
  userId: string,
): Promise<DashboardOverview> {
  switch (role) {
    case "ADMIN":
      return withCache(CACHE_KEYS.OVERVIEW(tenantId, role), 900, () => buildAdminOverview(tenantId));
    case "ACCOUNTANT":
      return withCache(CACHE_KEYS.OVERVIEW(tenantId, role), 900, () => buildAccountantOverview(tenantId));
    case "SALES":
      return withCache(CACHE_KEYS.OVERVIEW(tenantId, role), 900, () => buildSalesOverview(tenantId));
    case "WAREHOUSE":
      return withCache(CACHE_KEYS.OVERVIEW(tenantId, role), 900, () => buildWarehouseOverview(tenantId));
    case "DRIVER":
      return buildDriverOverview(tenantId, userId);
    default: {
      const _exhaustive: never = role;
      throw new Error(`Unsupported dashboard role: ${String(_exhaustive)}`);
    }
  }
}

