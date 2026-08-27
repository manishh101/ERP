import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { DashboardLowStockRow, DashboardStockRow } from "@/types/domain";
import { cn, formatNumber } from "@/lib/utils";

/**
 * Compact inline row widget for low-stock variants. Replaces the full
 * DataTable (which adds search/pagination controls that are overkill for a
 * dashboard tile). Shows top rows only; links to Inventory for the full list.
 */
export function LowStockWidget({
  rows,
  viewAllHref = "/inventory",
  title = "Low Stock",
  description = "Replenish before these run out.",
}: {
  rows: DashboardLowStockRow[];
  viewAllHref?: string;
  title?: string;
  description?: string;
}) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Link
            to={viewAllHref}
            className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="Nothing below threshold" description="All variants are above their low-stock threshold." />
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((row) => {
              const pct = row.threshold > 0 ? Math.min((row.quantity / row.threshold) * 100, 100) : 0;
              const isOut = row.quantity <= 0;
              return (
                <li key={row.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{row.product}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.variant}</p>
                    {/* Thin fill bar: shows how full vs threshold */}
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                      <div
                        className={cn("h-full rounded-full transition-all", isOut ? "bg-red-500" : "bg-amber-400")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-sm font-semibold tabular-nums", isOut ? "text-red-700" : "text-amber-700")}>
                      {formatNumber(row.quantity)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">/ {formatNumber(row.threshold)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline row widget for out-of-stock variants. Simpler than
 * LowStockWidget — no fill bar needed since quantity is always ≤ 0.
 */
export function OutOfStockWidget({
  rows,
  viewAllHref = "/inventory",
  title = "Out of Stock",
  description = "Variants with nothing on hand.",
}: {
  rows: DashboardStockRow[];
  viewAllHref?: string;
  title?: string;
  description?: string;
}) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            {description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <Link
            to={viewAllHref}
            className="group inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold text-muted-foreground transition hover:text-foreground"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="Nothing out of stock" description="All variants have stock on hand." />
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.product}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.variant}</p>
                </div>
                <span className="shrink-0 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                  Out of stock
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
