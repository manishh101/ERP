import type { AgingBuckets } from "@/types/domain";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ArAgingWidgetProps {
  data: AgingBuckets;
}

const bucketConfig = [
  {
    key: "0-30" as const,
    label: "0–30 Days",
    description: "Current",
    color: "bg-emerald-500/15 border-emerald-500/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  {
    key: "31-60" as const,
    label: "31–60 Days",
    description: "Watch",
    color: "bg-yellow-500/15 border-yellow-500/30",
    textColor: "text-yellow-600 dark:text-yellow-400",
    dot: "bg-yellow-500",
  },
  {
    key: "61-90" as const,
    label: "61–90 Days",
    description: "Overdue",
    color: "bg-orange-500/15 border-orange-500/30",
    textColor: "text-orange-600 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  {
    key: "90+" as const,
    label: "90+ Days",
    description: "Critical",
    color: "bg-red-500/15 border-red-500/30",
    textColor: "text-red-600 dark:text-red-400",
    dot: "bg-red-500",
  },
] as const;

export function ArAgingWidget({ data }: ArAgingWidgetProps) {
  const total = data.totalOutstanding;

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>AR Aging Report</CardTitle>
          <CardDescription>
            Outstanding debt by collection risk — {data.customerCount} showroom
            {data.customerCount !== 1 ? "s" : ""} · Total:{" "}
            <span className="font-semibold text-foreground">
              {formatCurrency(total)}
            </span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {bucketConfig.map(({ key, label, description, color, textColor, dot }) => {
            const value = data[key];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;

            return (
              <div
                key={key}
                className={`rounded-2xl border p-4 ${color} transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {description}
                  </span>
                </div>
                <p className={`text-lg font-bold ${textColor}`}>
                  {formatCurrency(value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {label} · {pct}% of total
                </p>
              </div>
            );
          })}
        </div>

        {/* Proportional bar visualization */}
        {total > 0 && (
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-secondary">
            {bucketConfig.map(({ key, dot }) => {
              const pct = (data[key] / total) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={key}
                  className={`h-full ${dot} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
