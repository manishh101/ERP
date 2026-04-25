import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types/domain";

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card 
          key={item.label} 
          className="overflow-hidden bg-white/50 backdrop-blur-md border-white/20 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
        >
          <CardContent className="p-6 relative">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <div className="w-16 h-16 rounded-full bg-primary/20 blur-xl"></div>
            </div>
            <p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground mb-4 relative z-10">
              {item.label}
            </p>
            <div className="flex items-end justify-between gap-4 relative z-10">
              <p className="font-display text-3xl xl:text-4xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {item.value}
              </p>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold shadow-sm backdrop-blur-md border",
                  item.tone === "positive" && "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
                  item.tone === "neutral" && "bg-stone-500/10 text-stone-700 border-stone-500/20",
                  item.tone === "negative" && "bg-rose-500/10 text-rose-700 border-rose-500/20",
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

