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

export function DashboardPage() {
  const { data, error, isLoading } = useDashboardQuery();
  const { data: customersData } = useCustomersQuery();

  // Filter only SHOWROOM type customers for the analytics widget
  const showrooms = (customersData?.items ?? [])
    .filter((c) => c.type === "SHOWROOM")
    .map((c) => ({ id: c.id, name: c.name }));

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-36" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Dashboard data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Command Dashboard"
      />

      <KpiGrid items={data.kpis} />

      {/* AR Aging Report — PRD §5.1 */}
      {data.arAging && <ArAgingWidget data={data.arAging} />}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <RevenueCogsChart data={data.revenueVsCogs} />
        <QuickActions />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <TopProductsChart data={data.topProducts} />
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Low Stock Watchlist</CardTitle>
              <CardDescription>Configurable alerts for fast-moving lines.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.lowStockItems.length > 0 ? (
              data.lowStockItems.map((item) => (
                <div key={item.id} className="rounded-2xl bg-secondary/60 p-4">
                  <p className="font-semibold">
                    {item.product} / {item.variant}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.quantity} units remaining</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                No products are currently below their low-stock threshold.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Showroom Analytics — PRD §5.1 */}
      {showrooms.length > 0 && (
        <ShowroomAnalyticsWidget showrooms={showrooms} />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Sales Orders</CardTitle>
              <CardDescription>Latest transactions with live pipeline status badges.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <RecentSalesTable rows={data.recentSalesOrders} />
          </CardContent>
        </Card>
        <CashFlowChart data={data.cashFlow} />
      </div>
    </div>
  );
}
