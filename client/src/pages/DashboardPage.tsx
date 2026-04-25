import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import { RevenueCogsChart } from "@/components/dashboard/revenue-cogs-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { ArAgingWidget } from "@/components/dashboard/ar-aging-widget";
import { ShowroomAnalyticsWidget } from "@/components/dashboard/showroom-analytics-widget";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardQuery, useCustomersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

function LowStockCard({ items }: { items: any[] }) {
  return (
    <Card className="flex-1 bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div>
          <CardTitle>Low Stock Watchlist</CardTitle>
          <CardDescription>Configurable alerts for fast-moving lines.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 overflow-y-auto max-h-[320px]">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="rounded-2xl bg-secondary/40 p-4 border border-white/40">
              <p className="font-semibold text-sm">
                {item.product} <span className="text-muted-foreground font-normal">/ {item.variant}</span>
              </p>
              <p className="mt-1 text-xs font-medium text-amber-600">{item.quantity} units remaining</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-emerald-50/50 p-4 text-sm text-emerald-600 border border-emerald-100">
            Stock levels are healthy.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

  // Filter only SHOWROOM type customers for the analytics widget
  const showrooms = (customersData?.items ?? [])
    .filter((c) => c.type === "SHOWROOM")
    .map((c) => ({ id: c.id, name: c.name }));

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-3xl" />
        ))}
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
      {/* Ambient glowing background for the page */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background rounded-3xl" />
      
      <PageHeader title="Command Dashboard" />

      {/* TOP ROW: KPIs */}
      <KpiGrid items={data.kpis} />

      {/* MIDDLE ROW: Main Metric Charts & Quick Operations */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3 xl:grid-cols-4">
        <div className="lg:col-span-2 xl:col-span-3">
          <RevenueCogsChart data={data.revenueVsCogs} />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-1">
          <QuickActions />
          <LowStockCard items={data.lowStockItems} />
        </div>
      </div>

      {/* FINANCIALS ROW: Aging & Showroom Overview */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        {data.arAging && <ArAgingWidget data={data.arAging} />}
        {showrooms.length > 0 && <ShowroomAnalyticsWidget showrooms={showrooms} />}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <TopProductsChart data={data.topProducts} />
        <CashFlowChart data={data.cashFlow} />
        <div className="lg:col-span-2">
          <RecentSalesOrdersCard rows={data.recentSalesOrders} />
        </div>
      </div>
    </div>
  );
}
