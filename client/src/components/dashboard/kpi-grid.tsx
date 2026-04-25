import { Banknote, ArrowDownToLine, Truck, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types/domain";

const kpiIcons = [Banknote, ArrowDownToLine, Truck, Building2];

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => {
        const Icon = kpiIcons[index % kpiIcons.length];
        const content = (
          <Card
            className="overflow-hidden bg-white/50 backdrop-blur-md border-white/20 shadow-sm hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
          >
            <CardContent className="p-5 relative">
              {/* Decorative icon */}
              <div className="absolute top-4 right-4 opacity-[0.07] group-hover:opacity-[0.12] transition-opacity">
                <Icon className="h-14 w-14" strokeWidth={1.5} />
              </div>

              <div className="flex items-center gap-2 mb-3 relative z-10">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                  {item.label}
                </p>
              </div>

              <div className="flex items-end justify-between gap-4 relative z-10">
                <p className="font-display text-2xl xl:text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent tabular-nums">
                  {item.value}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-md border",
                    item.tone === "positive" && "bg-green-100 text-green-800 border-green-200",
                    item.tone === "neutral" && "bg-stone-100 text-stone-700 border-stone-200",
                    item.tone === "negative" && "bg-red-100 text-red-800 border-red-200",
                  )}
                >
                  {item.change}
                </span>
              </div>
            </CardContent>
          </Card>
        );

        return (
          <div key={item.label}>
            {item.tooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {content}
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-foreground text-background text-xs px-3 py-2 border-none">
                    <p>{item.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}
