import { useState, useMemo } from "react";
import NepaliDate from "nepali-datetime";
import { getNepaliMonthName, toNumber, formatCurrency } from "@/lib/utils";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { RevenueCogsChart } from "@/components/dashboard/revenue-cogs-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { ArAgingTable } from "@/components/dashboard/ar-aging-table";
import { ShowroomPerformanceTable } from "@/components/dashboard/showroom-performance-table";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardQuery, useCustomersQuery, useSalesOrdersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import type { Kpi } from "@/types/domain";

function RecentSalesOrdersCard({ rows }: { rows: any[] }) {
  return (
    <Card className="h-full bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div>
          <CardTitle>Recent Sales Orders</CardTitle>
          <CardDescription>Latest transactions with live pipeline status badges.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <RecentSalesTable rows={rows} />
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { data, error, isLoading } = useDashboardQuery();
  const { data: customersData } = useCustomersQuery();
  const { data: salesOrdersData } = useSalesOrdersQuery();

  const orders = salesOrdersData?.items ?? [];

  // ─── Extract Available Months ───
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    orders.forEach((o) => {
      try {
        const dStr = o.deliveryDate;
        if (!dStr) return;
        const d = new NepaliDate(new Date(dStr));
        const m = d.getMonth();
        const y = d.getYear();
        months.add(`${y}-${String(m).padStart(2, "0")}|${getNepaliMonthName(m)} ${y}`);
      } catch {}
    });
    return Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // sort descending
      .map((m) => ({ key: m.split("|")[0], label: m.split("|")[1] }));
  }, [orders]);

  const [selectedMonth, setSelectedMonth] = useState<string>("ALL");

  // ─── Compute Filtered KPIs ───
  const customKpis = useMemo(() => {
    const filtered = selectedMonth === "ALL"
      ? orders
      : orders.filter((o) => {
          try {
            const dStr = o.deliveryDate;
            if (!dStr) return false;
            const d = new NepaliDate(new Date(dStr));
            const key = `${d.getYear()}-${String(d.getMonth()).padStart(2, "0")}`;
            return key === selectedMonth;
          } catch {
            return false;
          }
        });

    let revenue = 0;
    let showroomRevenue = 0;
    let retailRevenue = 0;
    let collected = 0;
    let delivered = 0;
    let totalCogs = 0;

    filtered.forEach((o) => {
      revenue += toNumber(o.total);
      if (o.customerType === "SHOWROOM") {
        showroomRevenue += toNumber(o.total);
      } else {
        retailRevenue += toNumber(o.total);
      }
      collected += toNumber(o.paidAmount);
      totalCogs += toNumber(o.cogs);
      // Heuristic: rawStatus DELIVERED implies completion
      if (o.rawStatus === "DELIVERED") delivered++;
    });

    const result: Kpi[] = [
      {
        label: "Total Revenue",
        value: formatCurrency(revenue),
        change: "Billed",
        tone: "neutral" as const,
        tooltip: `Showroom: ${formatCurrency(showroomRevenue)} • Retail: ${formatCurrency(retailRevenue)}`,
      },
      {
        label: "Net Collection",
        value: formatCurrency(collected),
        change: "Received",
        tone: "positive" as const,
      },
      {
        label: "Total Orders",
        value: String(filtered.length),
        change: "Created",
        tone: "neutral" as const,
      },
      {
        label: "Total Delivered",
        value: String(delivered),
        change: "Completed",
        tone: "positive" as const,
      },
      {
        label: "Net Profit",
        value: formatCurrency(revenue - totalCogs),
        change: "Margin",
        tone: (revenue - totalCogs) > 0 ? "positive" : "negative",
      },
    ];

    // Grab Inventory Value from the backend summary data
    const inventoryKpi = data?.kpis.find((k) => k.label.toLowerCase().includes("inventory"));

    if (inventoryKpi) result.push(inventoryKpi);

    return result;
  }, [orders, selectedMonth, data]);

  // ─── Compute Filtered Top Products ───
  const customTopProducts = useMemo(() => {
    if (selectedMonth === "ALL") return data?.topProducts ?? [];

    const map = new Map<string, number>();
    const filteredOrders = selectedMonth === "ALL" 
      ? orders 
      : orders.filter((o) => {
          try {
            const dStr = o.deliveryDate;
            if (!dStr) return false;
            const d = new NepaliDate(new Date(dStr));
            const key = `${d.getYear()}-${String(d.getMonth()).padStart(2, "0")}`;
            return key === selectedMonth;
          } catch {
            return false;
          }
        });

    filteredOrders.forEach((o) => {
      o.items?.forEach((item) => {
        map.set(item.name, (map.get(item.name) || 0) + item.quantity);
      });
    });

    return Array.from(map.entries())
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }, [orders, selectedMonth, data]);

  // Make sure we have the standalone filtered array isolated for Showroom
  const filteredOrders = useMemo(() => {
    if (selectedMonth === "ALL") return orders;
    return orders.filter((o) => {
      try {
        const dStr = o.deliveryDate;
        if (!dStr) return false;
        const d = new NepaliDate(new Date(dStr));
        const key = `${d.getYear()}-${String(d.getMonth()).padStart(2, "0")}`;
        return key === selectedMonth;
      } catch {
        return false;
      }
    });
  }, [orders, selectedMonth]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
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

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-8 relative pb-10">
      {/* Ambient glowing background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background rounded-3xl" />

      {/* ═══════════════════════════════════════════════════════
          SECTION A: Top KPI Cards + Custom Month Header
          ═══════════════════════════════════════════════════════ */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Wholesale Command Center</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            REPORT MONTH
          </span>
          <select
            className="flex h-9 items-center justify-between rounded-md border border-input bg-white/50 backdrop-blur-sm px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-medium"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="ALL">All Time</option>
            {availableMonths.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <KpiGrid items={customKpis} />

      {/* ═══════════════════════════════════════════════════════
          SECTION B: Visual Analytics
          Revenue vs Collections + Top Selling Products
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <RevenueCogsChart data={data.revenueVsCogs} />
        <TopProductsChart data={customTopProducts} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION C: Actionable Data Tables
          Showroom Leaderboard + AR Aging Matrix
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <ShowroomPerformanceTable
          salesOrders={filteredOrders}
          customers={customersData?.items ?? []}
        />
        {data.arAging && (
          <ArAgingTable
            data={data.arAging}
            customers={customersData?.items ?? []}
          />
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION D: Supporting Widgets
          Cash Flow + Recent Sales Orders
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <CashFlowChart data={data.cashFlow} />
        <RecentSalesOrdersCard rows={data.recentSalesOrders} />
      </div>
    </div>
  );
}
