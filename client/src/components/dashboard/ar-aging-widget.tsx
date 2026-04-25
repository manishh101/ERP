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
    color: "bg-emerald-500/10 border-emerald-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
    textColor: "text-emerald-700",
    dot: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
  },
  {
    key: "31-60" as const,
    label: "31–60 Days",
    description: "Watch",
    color: "bg-yellow-500/10 border-yellow-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
    textColor: "text-yellow-700",
    dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.8)]",
  },
  {
    key: "61-90" as const,
    label: "61–90 Days",
    description: "Overdue",
    color: "bg-orange-500/10 border-orange-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
    textColor: "text-orange-700",
    dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]",
  },
  {
    key: "90+" as const,
    label: "90+ Days",
    description: "Critical",
    color: "bg-rose-500/10 border-rose-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]",
    textColor: "text-rose-700",
    dot: "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
  },
] as const;

export function ArAgingWidget({ data }: ArAgingWidgetProps) {
  const total = data.totalOutstanding;

  return (
    <Card className="h-full bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
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
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {bucketConfig.map(({ key, label, description, color, textColor, dot }) => {
            const value = data[key];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;

            return (
               <div
                key={key}
                className={`flex flex-col relative overflow-hidden rounded-2xl border p-5 ${color} transition-all duration-300 hover:-translate-y-1 hover:shadow-lg backdrop-blur-md`}
              >
                <div className="absolute top-0 right-0 p-4 opacity-20">
                  <span className={`block w-12 h-12 rounded-full blur-xl ${dot.split(' ')[0]}`} />
                </div>
                <div className="flex items-center gap-2 mb-3 relative z-10">
                  <span className={`block h-2.5 w-2.5 rounded-full ${dot}`} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {description}
                  </span>
                </div>
                <p className={`text-xl font-black tracking-tight ${textColor} bg-clip-text relative z-10 mt-auto`}>
                  {formatCurrency(value)}
                </p>
                <p className="text-xs text-muted-foreground mt-1 relative z-10 font-medium">
                  {label} · {pct}%
                </p>
              </div>
            );
          })}
        </div>

        {/* Proportional bar visualization */}
        {total > 0 && (
          <div className="mt-6 flex h-3 w-full overflow-hidden rounded-full bg-secondary/50 shadow-inner">
            {bucketConfig.map(({ key, dot }) => {
              const pct = (data[key] / total) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={key}
                  className={`h-full ${dot.split(' ')[0]} transition-all hover:opacity-80 border-r border-background/20 last:border-0`}
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
