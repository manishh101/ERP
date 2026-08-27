import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { NotAuthorized } from "@/components/shared/not-authorized";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDashboard } from "@/components/dashboard/overview/admin-dashboard";
import { AccountantDashboard } from "@/components/dashboard/overview/accountant-dashboard";
import { SalesDashboard } from "@/components/dashboard/overview/sales-dashboard";
import { WarehouseDashboard } from "@/components/dashboard/overview/warehouse-dashboard";
import { DriverDashboard } from "@/components/dashboard/overview/driver-dashboard";
import { useDashboardOverview } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import type { DashboardOverview } from "@/types/domain";

const ROLE_META: Record<DashboardOverview["role"], { title: string; description: string }> = {
  ADMIN: { title: "Dashboard", description: "Business overview — sales, receivables, and what needs attention." },
  ACCOUNTANT: { title: "Finance Dashboard", description: "Receivables, collections, and VAT compliance." },
  SALES: { title: "Sales Dashboard", description: "Today's sales, your pipeline, and recent collections." },
  WAREHOUSE: { title: "Warehouse Dashboard", description: "Stock health, dispatches, and inbound receipts." },
  DRIVER: { title: "Delivery Dashboard", description: "Your deliveries scheduled for today." },
};

/** Local time-of-day for the "Updated" chip. */
function updatedLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Updated ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 rounded-lg" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Skeleton className="h-80 rounded-lg" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    </div>
  );
}

/** Render the dashboard matching the role the server shaped the payload for. */
function renderRole(data: DashboardOverview) {
  switch (data.role) {
    case "ADMIN":
      return <AdminDashboard data={data} />;
    case "ACCOUNTANT":
      return <AccountantDashboard data={data} />;
    case "SALES":
      return <SalesDashboard data={data} />;
    case "WAREHOUSE":
      return <WarehouseDashboard data={data} />;
    case "DRIVER":
      return <DriverDashboard data={data} />;
    default:
      return <NotAuthorized />;
  }
}

/**
 * Role-aware command center. A single `GET /dashboard/overview` request returns
 * a payload shaped by the caller's verified role; this page routes it to the
 * matching role dashboard. All aggregation happens server-side (cached), so the
 * browser does no financial computation and non-financial roles never receive
 * monetary data.
 */
export function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboardOverview();

  if (isLoading || (!data && !error)) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <ErrorState
        title="Dashboard could not be loaded"
        description={error ? getErrorMessage(error) : "Please try again."}
        onRetry={() => void refetch()}
      />
    );
  }

  const meta = ROLE_META[data.role] ?? { title: "Dashboard", description: "" };
  const updated = updatedLabel(data.generatedAt);

  return (
    <div className="pb-10">
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={updated ? <span className="text-xs text-muted-foreground">{updated}</span> : undefined}
      />
      {renderRole(data)}
    </div>
  );
}
