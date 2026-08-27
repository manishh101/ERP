import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionLink } from "./section";
import type { DashboardTopCustomer } from "@/types/domain";
import { formatCurrency } from "@/lib/utils";

/** Ranked list of the highest-revenue customers (commercial orderAmount). */
export function TopCustomersList({
  rows,
  viewAllHref = "/parties",
}: {
  rows: DashboardTopCustomer[];
  viewAllHref?: string;
}) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Top Customers</CardTitle>
        <SectionLink to={viewAllHref} />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No sales yet" description="Top customers by revenue will appear here." />
        ) : (
          <ol className="divide-y divide-border/60">
            {rows.map((customer, index) => (
              <li key={customer.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular-nums">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{customer.name}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatCurrency(customer.revenue)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
