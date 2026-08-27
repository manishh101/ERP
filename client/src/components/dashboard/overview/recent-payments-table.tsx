import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionLink } from "./section";
import type { DashboardRecentPayment } from "@/types/domain";
import { formatCurrency, formatDate, formatEnumLabel } from "@/lib/utils";

/** Compact list of the most recent customer receipts (AR). */
export function RecentPaymentsTable({
  rows,
  viewAllHref = "/payments",
  title = "Recent Payments",
}: {
  rows: DashboardRecentPayment[];
  viewAllHref?: string;
  title?: string;
}) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <SectionLink to={viewAllHref} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No payments yet" description="Recorded customer receipts will appear here." />
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{payment.customer}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEnumLabel(payment.method)} · {formatDate(payment.date)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
