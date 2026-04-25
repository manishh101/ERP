import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { RevenueCogsChart } from "@/components/dashboard/revenue-cogs-chart";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { ArAgingTable } from "@/components/dashboard/ar-aging-table";
import { ShowroomPerformanceTable } from "@/components/dashboard/showroom-performance-table";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardQuery, useCustomersQuery, useSalesOrdersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

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

      <PageHeader title="Wholesale Command Center" />

      {/* ═══════════════════════════════════════════════════════
          SECTION A: Top KPI Cards
          ═══════════════════════════════════════════════════════ */}
      <KpiGrid items={data.kpis} />

      {/* ═══════════════════════════════════════════════════════
          SECTION B: Visual Analytics
          Revenue vs Collections + Top Selling Products
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <RevenueCogsChart data={data.revenueVsCogs} />
        <TopProductsChart data={data.topProducts} />
      </div>

      {/* ═══════════════════════════════════════════════════════
          SECTION C: Actionable Data Tables
          Showroom Leaderboard + AR Aging Matrix
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <ShowroomPerformanceTable
          salesOrders={salesOrdersData?.items ?? []}
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
