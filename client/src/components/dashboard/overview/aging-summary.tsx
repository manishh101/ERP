import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AgingBuckets } from "@/types/domain";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

/**
 * AR aging buckets, oldest-money-is-riskier. A thin proportion bar gives the
 * at-a-glance risk read (mostly neutral = healthy; amber/red = overdue),
 * the list gives exact figures per bucket, and the footer surfaces the one
 * number that drives collection action: how much is 60+ days overdue.
 * Commercial AR only — never mixed with VAT.
 */
const BUCKETS: Array<{ key: keyof AgingBuckets; label: string; bar: string; amount: string }> = [
  { key: "0-30", label: "0–30 days", bar: "bg-slate-300", amount: "text-foreground" },
  { key: "31-60", label: "31–60 days", bar: "bg-slate-400", amount: "text-foreground" },
  { key: "61-90", label: "61–90 days", bar: "bg-amber-400", amount: "text-amber-700" },
  { key: "90+", label: "90+ days", bar: "bg-red-500", amount: "text-red-700" },
];

export function AgingSummary({ data }: { data: AgingBuckets }) {
  const total = data.totalOutstanding;
  const overdue = (data["61-90"] as number) + (data["90+"] as number);

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

        <ul className="flex-1">
          {BUCKETS.map((bucket) => (
            <li
              key={bucket.key}
              className="flex items-center gap-3 border-b border-border/50 py-2.5 last:border-0"
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", bucket.bar)} aria-hidden="true" />
              <span className="flex-1 text-sm text-muted-foreground">{bucket.label}</span>
              <span className={cn("min-w-[7rem] text-right text-sm font-semibold tabular-nums", bucket.amount)}>
                {formatCurrency(data[bucket.key] as number)}
              </span>
            </li>
          ))}
        </ul>

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
