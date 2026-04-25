import { Package, Banknote, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface PartyKpiCardsProps {
  lifetimeQty: number;
  lifetimeValue: number;
  currentArBalance: number;
}

export function PartyKpiCards({ lifetimeQty, lifetimeValue, currentArBalance }: PartyKpiCardsProps) {
  const cards = [
    {
      label: "Lifetime Volume",
      value: `${formatNumber(lifetimeQty)} units`,
      icon: Package,
      color: "text-blue-700",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
    },
    {
      label: "Lifetime Value",
      value: formatCurrency(lifetimeValue),
      icon: Banknote,
      color: "text-violet-700",
      bg: "bg-violet-50",
      iconBg: "bg-violet-100",
    },
    {
      label: "Current AR Balance",
      value: formatCurrency(currentArBalance),
      icon: AlertTriangle,
      color: currentArBalance > 0 ? "text-amber-700" : "text-green-700",
      bg: currentArBalance > 0 ? "bg-amber-50" : "bg-green-50",
      iconBg: currentArBalance > 0 ? "bg-amber-100" : "bg-green-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className={cn(
              "overflow-hidden border-white/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200",
              card.bg,
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", card.iconBg)}>
                  <Icon className={cn("h-4.5 w-4.5", card.color)} />
                </div>
                <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground">
                  {card.label}
                </p>
              </div>
              <p className={cn("text-2xl font-bold tabular-nums", card.color)}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
