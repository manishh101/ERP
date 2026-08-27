import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgingBuckets, DashboardArCustomerRow } from "@/types/domain";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

/**
 * AR aging buckets, oldest-money-is-riskier. A thin proportion bar gives the
 * at-a-glance risk read (mostly neutral = healthy; amber/red = overdue),
 * the list gives exact figures per bucket, and the footer surfaces the one
 * number that drives collection action: how much is 60+ days overdue.
 * Commercial AR only — never mixed with VAT.
 *
 * Hover any bucket row to see which customers are in that bucket.
 */

type BucketKey = "0-30" | "31-60" | "61-90" | "90+";

const BUCKETS: Array<{ key: BucketKey; label: string; bar: string; amount: string; customerField: keyof DashboardArCustomerRow }> = [
  { key: "0-30",  label: "0–30 days",  bar: "bg-slate-300", amount: "text-foreground",  customerField: "bucket0_30" },
  { key: "31-60", label: "31–60 days", bar: "bg-slate-400", amount: "text-foreground",  customerField: "bucket31_60" },
  { key: "61-90", label: "61–90 days", bar: "bg-amber-400", amount: "text-amber-700", customerField: "bucket61_90" },
  { key: "90+",   label: "90+ days",   bar: "bg-red-500",   amount: "text-red-700",   customerField: "bucket90_plus" },
];

interface AgingSummaryProps {
  data: AgingBuckets;
  arByCustomer?: DashboardArCustomerRow[];
}

export function AgingSummary({ data, arByCustomer = [] }: AgingSummaryProps) {
  const total = data.totalOutstanding;
  const overdue = (data["61-90"] as number) + (data["90+"] as number);
  const [hoveredBucket, setHoveredBucket] = useState<BucketKey | null>(null);

  /** Customers with a non-zero balance in this bucket, sorted desc. */
  function getCustomersForBucket(bucket: typeof BUCKETS[number]) {
    return arByCustomer
      .filter((row) => (row[bucket.customerField] as number) > 0)
      .sort((a, b) => (b[bucket.customerField] as number) - (a[bucket.customerField] as number));
  }

  return (
    <Card className="flex h-full flex-col border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-col items-start gap-1 pb-3">
        <CardTitle className="text-base">Receivables Aging</CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(total)} outstanding · {formatNumber(data.customerCount)} customer
          {data.customerCount === 1 ? "" : "s"}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {/* Proportion bar */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
          {total > 0
            ? BUCKETS.map((bucket) => {
                const width = ((data[bucket.key] as number) / total) * 100;
                return width > 0 ? (
                  <div key={bucket.key} className={bucket.bar} style={{ width: `${width}%` }} />
                ) : null;
              })
            : null}
        </div>

        {/* Bucket rows */}
        <ul className="flex-1">
          {BUCKETS.map((bucket) => {
            const customers = getCustomersForBucket(bucket);
            const isHovered = hoveredBucket === bucket.key;
            const bucketAmount = data[bucket.key] as number;

            return (
              <li
                key={bucket.key}
                className="relative"
                onMouseEnter={() => setHoveredBucket(bucket.key)}
                onMouseLeave={() => setHoveredBucket(null)}
              >
                <div
                  className={cn(
                    "flex cursor-default items-center gap-3 rounded-md border border-transparent px-2 py-2.5 transition-colors",
                    "border-b border-border/50 last:border-b-0",
                    isHovered && customers.length > 0 && "bg-muted/50",
                  )}
                >
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", bucket.bar)} aria-hidden="true" />
                  <span className="flex-1 text-sm text-muted-foreground">{bucket.label}</span>
                  <span className={cn("min-w-[7rem] text-right text-sm font-semibold tabular-nums", bucket.amount)}>
                    {formatCurrency(bucketAmount)}
                  </span>
                </div>

                {/* Hover popover showing customers */}
                {isHovered && customers.length > 0 && (
                  <div
                    className={cn(
                      "absolute right-0 top-full z-50 mt-1 min-w-[220px] max-w-[280px]",
                      "rounded-lg border border-border bg-popover shadow-lg",
                      "animate-in fade-in-0 zoom-in-95 duration-150",
                    )}
                    style={{ right: 0 }}
                  >
                    <div className="border-b border-border/60 px-3 py-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {bucket.label} — {customers.length} customer{customers.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {customers.map((c) => (
                        <li
                          key={c.customerId}
                          className="flex items-center justify-between gap-3 px-3 py-1.5 hover:bg-muted/40"
                        >
                          <span className="truncate text-sm text-foreground">{c.customerName}</span>
                          <span className={cn("shrink-0 text-xs font-semibold tabular-nums", bucket.amount)}>
                            {formatCurrency(c[bucket.customerField] as number)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {/* Overdue footer */}
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-sm",
            overdue > 0
              ? "border-red-200 bg-red-50/60 text-red-700"
              : "border-border/70 bg-background text-muted-foreground",
          )}
        >
          <span>{overdue > 0 ? "Overdue · 60+ days" : "Nothing overdue past 60 days"}</span>
          {overdue > 0 ? <span className="font-semibold tabular-nums">{formatCurrency(overdue)}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
