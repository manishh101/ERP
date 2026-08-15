import {
  ArrowDownToLine,
  Banknote,
  ClipboardList,
  PackageCheck,
  TrendingDown,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/types/domain";

const kpiIcons = [Banknote, ArrowDownToLine, ClipboardList, Truck, TrendingUp, PackageCheck];

export function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => {
        const Icon = kpiIcons[index % kpiIcons.length];
        const ToneIcon = item.tone === "negative" ? TrendingDown : item.tone === "positive" ? TrendingUp : Icon;
        const content = (
          <Card className="group h-full overflow-hidden border-border/70 bg-card shadow-sm transition hover:border-primary/25 hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight text-foreground tabular-nums xl:text-[1.7rem]">
                    {item.value}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
                    item.tone === "positive" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                    item.tone === "neutral" && "border-sky-200 bg-sky-50 text-sky-700",
                    item.tone === "negative" && "border-red-200 bg-red-50 text-red-700",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-3">
                <span
                  className={cn(
                    "inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-semibold",
                    item.tone === "positive" && "bg-emerald-50 text-emerald-700",
                    item.tone === "neutral" && "bg-muted text-muted-foreground",
                    item.tone === "negative" && "bg-red-50 text-red-700",
                  )}
                >
                  <ToneIcon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.change}</span>
                </span>
                {item.tooltip && (
                  <span className="hidden text-xs text-muted-foreground sm:block">Details on hover</span>
                )}
              </div>
            </CardContent>
          </Card>
        );

        return (
          <div key={item.label} className="min-w-0">
            {item.tooltip ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>{content}</TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
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
