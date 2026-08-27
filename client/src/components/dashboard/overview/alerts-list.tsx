import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardAlert } from "@/types/domain";
import { cn } from "@/lib/utils";

const severityStyle: Record<DashboardAlert["severity"], { icon: LucideIcon; accent: string; iconColor: string }> = {
  info: { icon: Info, accent: "border-l-sky-500", iconColor: "text-sky-600" },
  warn: { icon: AlertTriangle, accent: "border-l-amber-500", iconColor: "text-amber-600" },
  danger: { icon: AlertCircle, accent: "border-l-red-500", iconColor: "text-red-600" },
};

/** Derived accountant alerts (overdue AR, VAT payable, uninvoiced AR). */
export function AlertsList({ alerts }: { alerts: DashboardAlert[] }) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3.5 py-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No outstanding compliance or receivables alerts.</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {alerts.map((alert) => {
              const style = severityStyle[alert.severity];
              const Icon = style.icon;
              return (
                <li
                  key={alert.id}
                  className={cn("flex items-start gap-3 rounded-lg border border-l-4 border-border/70 bg-background px-3.5 py-3", style.accent)}
                >
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.iconColor)} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
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
