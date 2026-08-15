import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import NepaliDate from "nepali-datetime";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ShieldAlert,
  ShoppingCart,
  Truck,
  WalletCards,
} from "lucide-react";
import { RevenueCogsChart } from "@/components/dashboard/revenue-cogs-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { ArAgingTable } from "@/components/dashboard/ar-aging-table";
import { ShowroomPerformanceTable } from "@/components/dashboard/showroom-performance-table";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardQuery, useCustomersQuery, useSalesOrdersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { cn, formatCurrency, formatNumber, getNepaliMonthName, toNumber } from "@/lib/utils";

type DashboardView = "sales" | "receivables" | "operations";
type Tone = "neutral" | "good" | "warn" | "danger";

const views: Array<{ id: DashboardView; label: string; icon: typeof ShoppingCart }> = [
  { id: "sales", label: "Sales", icon: ShoppingCart },
  { id: "receivables", label: "Receivables", icon: WalletCards },
  { id: "operations", label: "Operations", icon: Truck },
];

function RecentSalesOrdersCard({ rows }: { rows: any[] }) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-base">Recent Sales Orders</CardTitle>
          <CardDescription>Latest customer activity and fulfillment status.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <RecentSalesTable rows={rows} />
      </CardContent>
    </Card>
  );
}

function PrimaryMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof CircleDollarSign;
  tone?: Tone;
}) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
            <p className="mt-2 break-words text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
              {value}
            </p>
          </div>
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              tone === "good" && "bg-emerald-50 text-emerald-700",
              tone === "warn" && "bg-amber-50 text-amber-700",
              tone === "danger" && "bg-red-50 text-red-700",
              tone === "neutral" && "bg-sky-50 text-sky-700",
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 truncate border-t border-border/60 pt-3 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ActionRow({
  label,
  detail,
  href,
  tone,
}: {
  label: string;
  detail: string;
  href: string;
  tone: Tone;
}) {
  return (
    <Link
      to={href}
      className="group flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3.5 py-3 transition hover:border-primary/30 hover:bg-secondary/50"
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
          tone === "good" && "bg-emerald-50 text-emerald-700",
          tone === "warn" && "bg-amber-50 text-amber-700",
          tone === "danger" && "bg-red-50 text-red-700",
          tone === "neutral" && "bg-sky-50 text-sky-700",
        )}
      >
        {tone === "good" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{detail}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

function AttentionPanel({
  criticalOutstanding,
  totalOutstanding,
  lowStockCount,
  pendingDeliveries,
}: {
  criticalOutstanding: number;
  totalOutstanding: number;
  lowStockCount: number;
  pendingDeliveries: number;
}) {
  const rows = [
    criticalOutstanding > 0
      ? {
          label: "Critical receivables",
          detail: `${formatCurrency(criticalOutstanding)} is older than 90 days`,
          href: "/accounting/ledger",
          tone: "danger" as const,
        }
      : { label: "Receivables risk", detail: "No balance in the 90+ day bucket", href: "/accounting/ledger", tone: "good" as const },
    totalOutstanding > 0
      ? {
          label: "Open customer balance",
          detail: `${formatCurrency(totalOutstanding)} still needs follow-up`,
          href: "/payments",
          tone: "warn" as const,
        }
      : { label: "Collections", detail: "No open customer balance in this view", href: "/payments", tone: "good" as const },
    lowStockCount > 0
      ? { label: "Low stock", detail: `${formatNumber(lowStockCount)} items need replenishment review`, href: "/inventory", tone: "warn" as const }
      : { label: "Inventory", detail: "No low-stock items flagged", href: "/inventory", tone: "good" as const },
    pendingDeliveries > 0
      ? { label: "Pending deliveries", detail: `${formatNumber(pendingDeliveries)} orders are not delivered yet`, href: "/delivery", tone: "neutral" as const }
      : { label: "Delivery queue", detail: "All filtered orders are delivered", href: "/delivery", tone: "good" as const },
  ];

  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-base">Needs Attention</CardTitle>
          <CardDescription>Short list of exceptions to act on today.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-2.5">
        {rows.map((row) => (
          <ActionRow key={row.label} {...row} />
        ))}
      </CardContent>
    </Card>
  );
}

function BusinessMixCard({ showroomRevenue, retailRevenue }: { showroomRevenue: number; retailRevenue: number }) {
  const total = showroomRevenue + retailRevenue;
  const showroomPct = total > 0 ? Math.round((showroomRevenue / total) * 100) : 0;
  const retailPct = total > 0 ? 100 - showroomPct : 0;

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-base">Business Mix</CardTitle>
          <CardDescription>Showroom and retail contribution for the selected period.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          <div className="bg-blue-600" style={{ width: `${showroomPct}%` }} />
          <div className="bg-cyan-600" style={{ width: `${retailPct}%` }} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Showroom</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(showroomRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{showroomPct}% of sales</p>
          </div>
          <div className="rounded-lg border border-border/70 bg-background p-3">
            <p className="text-xs font-medium text-muted-foreground">Retail</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{formatCurrency(retailRevenue)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{retailPct}% of sales</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, error, isLoading } = useDashboardQuery();
  const { data: customersData } = useCustomersQuery();
  const { data: salesOrdersData } = useSalesOrdersQuery(10000);
  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");
  const [activeView, setActiveView] = useState<DashboardView>("sales");

  const orders = salesOrdersData?.items ?? [];

  const availableMonths = useMemo(() => {
    const months = [];
    const now = new NepaliDate();
    let currentM = now.getMonth();
    let currentY = now.getYear();

    for (let i = 0; i < 12; i++) {
      let m = currentM - i;
      let y = currentY;
      while (m < 0) {
        m += 12;
        y -= 1;
      }
      months.push({
        key: `${y}-${String(m).padStart(2, "0")}`,
        label: `${getNepaliMonthName(m)} ${y}`,
      });
    }

    return months;
  }, []);

  const active12MonthsOrders = useMemo(() => {
    const monthKeys = new Set(availableMonths.map((m) => m.key));

    return orders.filter((order) => {
      if (order.rawStatus === "CANCELLED") return false;
      try {
        if (!order.orderDate) return false;
        const date = new NepaliDate(new Date(order.orderDate));
        const key = `${date.getYear()}-${String(date.getMonth()).padStart(2, "0")}`;
        return monthKeys.has(key);
      } catch {
        return false;
      }
    });
  }, [availableMonths, orders]);

  const filteredOrders = useMemo(() => {
    if (selectedMonth === "ALL") return active12MonthsOrders;

    return active12MonthsOrders.filter((order) => {
      try {
        if (!order.orderDate) return false;
        const date = new NepaliDate(new Date(order.orderDate));
        const key = `${date.getYear()}-${String(date.getMonth()).padStart(2, "0")}`;
        return key === selectedMonth;
      } catch {
        return false;
      }
    });
  }, [active12MonthsOrders, selectedMonth]);

  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === "ALL") return "Last 12 BS months";
    return availableMonths.find((month) => month.key === selectedMonth)?.label ?? "Selected month";
  }, [availableMonths, selectedMonth]);

  const orderMetrics = useMemo(() => {
    let revenue = 0;
    let showroomRevenue = 0;
    let retailRevenue = 0;
    let collected = 0;
    let delivered = 0;
    let totalCogs = 0;

    filteredOrders.forEach((order) => {
      const orderTotal = toNumber(order.total);
      revenue += orderTotal;
      collected += toNumber(order.paidAmount);
      totalCogs += toNumber(order.cogs);

      if (order.customerType === "SHOWROOM") {
        showroomRevenue += orderTotal;
      } else {
        retailRevenue += orderTotal;
      }

      if (order.rawStatus === "DELIVERED") delivered += 1;
    });

    const profit = selectedMonth === "ALL" && data?.netProfit !== undefined ? data.netProfit : revenue - totalCogs;
    const balanceDue = Math.max(revenue - collected, 0);
    const pendingDeliveries = Math.max(filteredOrders.length - delivered, 0);

    return {
      revenue,
      showroomRevenue,
      retailRevenue,
      collected,
      delivered,
      profit,
      balanceDue,
      pendingDeliveries,
      collectionRate: revenue > 0 ? Math.round((collected / revenue) * 100) : 0,
      deliveryRate: filteredOrders.length > 0 ? Math.round((delivered / filteredOrders.length) * 100) : 0,
    };
  }, [data, filteredOrders, selectedMonth]);

  const customTopProducts = useMemo(() => {
    if (selectedMonth === "ALL") return data?.topProducts ?? [];

    const map = new Map<string, number>();
    filteredOrders.forEach((order) => {
      order.items?.forEach((item) => {
        map.set(item.name, (map.get(item.name) || 0) + item.quantity);
      });
    });

    return Array.from(map.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [data, filteredOrders, selectedMonth]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 rounded-lg" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-lg" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.8fr)]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold text-destructive">Dashboard data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const totalOutstanding = data.arAging?.totalOutstanding ?? orderMetrics.balanceDue;
  const criticalOutstanding = data.arAging?.["90+"] ?? 0;

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-border/70 bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            {selectedMonthLabel}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A focused view of cash, sales, fulfillment, and exceptions for day-to-day SME decisions.
          </p>
        </div>

        <label className="flex w-full flex-col gap-1.5 sm:w-64">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Report Month</span>
          <select
            className="h-10 rounded-md border border-input bg-card px-3 text-sm font-medium shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/15"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
          >
            <option value="ALL">All Active Months</option>
            {availableMonths.map((month) => (
              <option key={month.key} value={month.key}>
                {month.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PrimaryMetric
          label="Revenue"
          value={formatCurrency(orderMetrics.revenue)}
          detail={`Showroom ${formatCurrency(orderMetrics.showroomRevenue)} | Retail ${formatCurrency(orderMetrics.retailRevenue)}`}
          icon={BarChart3}
        />
        <PrimaryMetric
          label="Collection"
          value={`${orderMetrics.collectionRate}%`}
          detail={`${formatCurrency(orderMetrics.collected)} received`}
          icon={CircleDollarSign}
          tone={orderMetrics.collectionRate >= 80 ? "good" : "warn"}
        />
        <PrimaryMetric
          label="Open Balance"
          value={formatCurrency(totalOutstanding)}
          detail={criticalOutstanding > 0 ? `${formatCurrency(criticalOutstanding)} over 90 days` : "No critical AR bucket"}
          icon={ShieldAlert}
          tone={criticalOutstanding > 0 ? "danger" : totalOutstanding > 0 ? "warn" : "good"}
        />
        <PrimaryMetric
          label="Orders Delivered"
          value={`${orderMetrics.deliveryRate}%`}
          detail={`${formatNumber(orderMetrics.delivered)} of ${formatNumber(filteredOrders.length)} orders complete`}
          icon={Truck}
          tone={orderMetrics.deliveryRate >= 70 ? "good" : "neutral"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)]">
        <RevenueCogsChart data={data.revenueVsCogs} />
        <AttentionPanel
          criticalOutstanding={criticalOutstanding}
          totalOutstanding={totalOutstanding}
          lowStockCount={data.lowStockItems.length}
          pendingDeliveries={orderMetrics.pendingDeliveries}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border/70 pt-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Explore Details</h2>
          <p className="text-sm text-muted-foreground">Switch focus without crowding the main dashboard.</p>
        </div>
        <div className="grid grid-cols-3 rounded-lg border border-border bg-card p-1 sm:w-fit">
          {views.map((view) => (
            <button
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition sm:min-w-32",
                activeView === view.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <view.icon className="h-4 w-4" />
              <span>{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeView === "sales" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <TopProductsChart data={customTopProducts} />
          <RecentSalesOrdersCard rows={data.recentSalesOrders} />
        </div>
      )}

      {activeView === "receivables" && (
        <div className="grid gap-5 xl:grid-cols-2">
          {data.arAging && (
            <ArAgingTable
              data={data.arAging}
              customers={customersData?.items ?? []}
              arAgingByCustomer={data.arAgingByCustomer}
            />
          )}
          <ShowroomPerformanceTable salesOrders={filteredOrders} customers={customersData?.items ?? []} />
        </div>
      )}

      {activeView === "operations" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
          <CashFlowChart data={data.cashFlow} />
          <div className="grid gap-5">
            <BusinessMixCard showroomRevenue={orderMetrics.showroomRevenue} retailRevenue={orderMetrics.retailRevenue} />
            <QuickActions />
            <Card className="border-border/70 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div>
                  <CardTitle className="text-base">Operational Queue</CardTitle>
                  <CardDescription>Counts that usually need daily coordination.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="grid gap-2.5">
                <ActionRow
                  label="Low-stock items"
                  detail={`${formatNumber(data.lowStockItems.length)} items flagged`}
                  href="/inventory"
                  tone={data.lowStockItems.length > 0 ? "warn" : "good"}
                />
                <ActionRow
                  label="Orders pending delivery"
                  detail={`${formatNumber(orderMetrics.pendingDeliveries)} orders open`}
                  href="/delivery"
                  tone={orderMetrics.pendingDeliveries > 0 ? "neutral" : "good"}
                />
                <ActionRow
                  label="Purchase planning"
                  detail="Review supplier orders and goods receipts"
                  href="/purchasing"
                  tone="neutral"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
