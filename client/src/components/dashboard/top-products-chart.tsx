import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionLink } from "./overview/section";
import { formatNumber } from "@/lib/utils";

/**
 * Compact ranked list of top-selling products by units dispatched.
 * Replaces the previous Recharts horizontal bar chart — furniture product names
 * are too long to render cleanly on a chart axis, and the list is faster to read.
 * Commercial orderAmount data only; no VAT or cost figures.
 */
export function TopProductsList({
  data,
  viewAllHref = "/inventory",
}: {
  data: Array<{ name: string; quantity: number }>;
  viewAllHref?: string;
}) {
  const hasData = data.length > 0;
  const maxQty = hasData ? data[0].quantity : 1;

  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Top Products</CardTitle>
          <SectionLink to={viewAllHref} label="View inventory" />
        </div>
        <p className="text-sm text-muted-foreground">Best-selling variants by units dispatched.</p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState title="No product movement" description="Sales will appear here once orders are dispatched." />
        ) : (
          <ol className="space-y-2.5">
            {data.map((product, index) => {
              const pct = maxQty > 0 ? (product.quantity / maxQty) * 100 : 0;
              return (
                <li key={product.name} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-secondary text-xs font-semibold text-secondary-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={product.name}>
                      {product.name}
                    </p>
                    {/* Thin proportion bar: shows relative volume at a glance */}
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-cyan-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatNumber(product.quantity)} <span className="text-xs font-normal text-muted-foreground">pcs</span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

// Re-export the old name so any other imports (if any) still compile.
export { TopProductsList as TopProductsChart };
