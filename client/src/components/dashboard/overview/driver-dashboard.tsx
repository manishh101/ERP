import { CheckCircle2, Clock, Navigation, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable } from "@/components/shared/data-table";
import type { DriverOverview, DashboardDelivery } from "@/types/domain";
import { formatEnumLabel, formatNumber } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { StatTile } from "./stat-tile";
import { Section, SectionLink } from "./section";

const columns: ColumnDef<DashboardDelivery, unknown>[] = [
  {
    accessorKey: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-foreground">{row.original.customer}</p>
        {row.original.address ? (
          <p className="text-xs text-muted-foreground">{row.original.address}</p>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <span className="inline-flex rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs font-semibold text-foreground">
        {formatEnumLabel(row.original.status)}
      </span>
    ),
  },
  {
    accessorKey: "scheduledDate",
    header: "Scheduled Date",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {new Date(row.original.scheduledDate).toLocaleDateString()}
      </span>
    ),
  },
];

/**
 * Delivery driver view: personalized daily schedule. Zero financial data —
 * only addresses, delivery statuses, and assigned routes for today.
 */
export function DriverDashboard({ data }: { data: DriverOverview }) {
  const { today, assigned } = data;
  const total = Object.values(today).reduce((sum, count) => sum + count, 0);
  const scheduled = today.SCHEDULED ?? 0;
  const outForDelivery = today.OUT_FOR_DELIVERY ?? 0;
  const delivered = today.DELIVERED ?? 0;
  const failed = today.FAILED_ATTEMPT ?? 0;

  const isClearDay = total === 0 && assigned.length === 0;

  return (
    <div className="space-y-6">
      {!isClearDay ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Deliveries Today"
            value={formatNumber(total)}
            href="/delivery"
            icon={Truck}
          />
          <StatTile
            label="Scheduled"
            value={formatNumber(scheduled)}
            sub="Awaiting pickup"
            href="/delivery"
            icon={Clock}
          />
          <StatTile
            label="Out for Delivery"
            value={formatNumber(outForDelivery)}
            sub="On your vehicle"
            tone={outForDelivery > 0 ? "warning" : "neutral"}
            href="/delivery"
            icon={Navigation}
          />
          <StatTile
            label="Completed"
            value={formatNumber(delivered)}
            sub={failed > 0 ? `${formatNumber(failed)} failed` : "Dispatched today"}
            tone="positive"
            href="/delivery"
            icon={CheckCircle2}
          />
        </div>
      ) : (
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="py-8">
            <EmptyState
              title="No deliveries assigned for today"
              description="Check back later or contact your dispatch manager for new route assignments."
              action={
                <Link
                  to="/delivery"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                >
                  Go to delivery board
                </Link>
              }
            />
          </CardContent>
        </Card>
      )}

      <Section
        title="Your Schedule"
        description="Assigned orders to deliver today."
        action={<SectionLink to="/delivery" label="Delivery board" />}
      >
        <DataTable
          data={assigned}
          columns={columns}
          detailHref={() => "/delivery"}
          pageSize={10}
          emptyMessage="No assigned deliveries for today."
        />
      </Section>
    </div>
  );
}
