import { ClipboardList, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import type { SalesOverview } from "@/types/domain";
import { formatCurrency, formatEnumLabel, formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Section } from "./section";
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

function orderRank(status: string) {
  const index = STATUS_ORDER.indexOf(status);
  return index === -1 ? STATUS_ORDER.length : index;
}

/** Order pipeline: how many orders sit in each status right now. */
function OrderPipeline({ orderStatus }: { orderStatus: Record<string, number> }) {
  const entries = Object.entries(orderStatus).sort((a, b) => orderRank(a[0]) - orderRank(b[0]));

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Order Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <EmptyState title="No orders yet" description="Orders will appear here as they are created." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {entries.map(([status, count]) => (
              <div key={status} className="rounded-lg border border-border/70 bg-background p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {formatEnumLabel(status)}
                </p>
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
        <Section title="Pending Orders" description="Open orders that still need action.">
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
