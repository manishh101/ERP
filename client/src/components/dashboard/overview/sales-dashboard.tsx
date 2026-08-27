import { ClipboardList, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import type { SalesOverview } from "@/types/domain";
import { formatCurrency, formatEnumLabel, formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Section, SectionLink } from "./section";
import { TopCustomersList } from "./top-customers-list";
import { RecentPaymentsTable } from "./recent-payments-table";

/** Canonical pipeline order so the status strip reads left-to-right by stage. */
const STATUS_ORDER = [
  "QUOTE",
  "CONFIRMED",
  "DEPOSIT_PAID",
  "PAID",
  "IN_WAREHOUSE",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
];

const STATUS_BAR_COLOR: Record<string, string> = {
  QUOTE: "bg-slate-300",
  CONFIRMED: "bg-blue-400",
  DEPOSIT_PAID: "bg-indigo-400",
  PAID: "bg-emerald-400",
  IN_WAREHOUSE: "bg-amber-400",
  DISPATCHED: "bg-purple-400",
  OUT_FOR_DELIVERY: "bg-sky-400",
  DELIVERED: "bg-emerald-600",
  CANCELLED: "bg-slate-200",
};

function orderRank(status: string) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

/** Order pipeline: proportion bar + status breakdown grid. */
function OrderPipeline({ orderStatus }: { orderStatus: Record<string, number> }) {
  const entries = Object.entries(orderStatus).sort((a, b) => orderRank(a[0]) - orderRank(b[0]));
  const totalOrders = entries.reduce((sum, [_, count]) => sum + count, 0);

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-col items-start gap-1 pb-3">
        <div className="flex w-full items-center justify-between gap-4">
          <CardTitle className="text-base">Order Pipeline</CardTitle>
          <SectionLink to="/sales" label="View all sales" />
        </div>
        <p className="text-sm text-muted-foreground">
          Current distribution of {formatNumber(totalOrders)} active order{totalOrders === 1 ? "" : "s"}.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Proportion bar */}
        {totalOrders > 0 ? (
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
            {entries.map(([status, count]) => {
              const width = (count / totalOrders) * 100;
              if (width === 0) return null;
              return (
                <div
                  key={status}
                  className={STATUS_BAR_COLOR[status] ?? "bg-slate-400"}
                  style={{ width: `${width}%` }}
                  title={`${formatEnumLabel(status)}: ${count}`}
                />
              );
            })}
          </div>
        ) : null}

        {entries.length === 0 ? (
          <EmptyState title="No orders yet" description="Orders will appear here as they are created." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entries.map(([status, count]) => (
              <div key={status} className="rounded-lg border border-border/70 bg-background p-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${STATUS_BAR_COLOR[status] ?? "bg-slate-400"}`}
                    aria-hidden="true"
                  />
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground truncate">
                    {formatEnumLabel(status)}
                  </p>
                </div>
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-foreground">{formatNumber(count)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Sales rep view: what closed today, what's in the pipeline, which orders are
 * still open, who's buying, and recent collections. Revenue figures are
 * commercial order amounts.
 */
export function SalesDashboard({ data }: { data: SalesOverview }) {
  const { today, pendingOrders, collections } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Sales Today"
          value={formatCurrency(today.salesToday)}
          href="/sales"
          icon={TrendingUp}
        />
        <StatTile
          label="Orders Today"
          value={formatNumber(today.ordersToday)}
          sub="New orders created"
          href="/sales"
          icon={ShoppingCart}
        />
        <StatTile
          label="Received This Month"
          value={formatCurrency(collections.receivedMonth)}
          tone="positive"
          href="/payments"
          icon={Wallet}
        />
        <StatTile
          label="Pending Orders"
          value={formatNumber(pendingOrders.count)}
          sub="Awaiting fulfillment"
          tone={pendingOrders.count > 0 ? "warning" : "neutral"}
          href="/sales"
          icon={ClipboardList}
        />
      </div>

      <OrderPipeline orderStatus={data.orderStatus} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Section
          title="Pending Orders"
          description="Open orders that still need action."
          action={<SectionLink to="/sales" />}
        >
          <RecentSalesTable rows={pendingOrders.items} />
        </Section>
        <div className="space-y-5">
          <TopCustomersList rows={data.topCustomers} />
          <RecentPaymentsTable rows={collections.recent} title="Recent Collections" />
        </div>
      </div>
    </div>
  );
}
