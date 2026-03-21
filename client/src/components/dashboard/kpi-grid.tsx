import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types/domain";

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="overflow-hidden">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-[0.26em] text-muted-foreground">{item.label}</p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="font-display text-3xl">{item.value}</p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  item.tone === "positive" && "bg-emerald-100 text-emerald-800",
                  item.tone === "neutral" && "bg-stone-100 text-stone-700",
                  item.tone === "negative" && "bg-rose-100 text-rose-800",
                )}
              >
                {item.change}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

