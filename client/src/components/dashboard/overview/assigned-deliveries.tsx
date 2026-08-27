import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionLink } from "./section";
import type { DashboardDelivery } from "@/types/domain";
import { formatEnumLabel, formatNumber } from "@/lib/utils";

/** Local time-of-day for a scheduled delivery slot. */
function scheduledTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Driver's own deliveries scheduled for today. Each row links into the
 * deliveries workspace where the status can be updated. No monetary fields.
 */
export function AssignedDeliveries({ rows, activeQueue }: { rows: DashboardDelivery[]; activeQueue?: number }) {
  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-col items-start gap-1 pb-3">
        <div className="flex w-full items-center justify-between gap-4">
          <CardTitle className="text-base">Assigned Today</CardTitle>
          <SectionLink to="/delivery" label="Open deliveries" />
        </div>
        {typeof activeQueue === "number" ? (
          <CardDescription>{formatNumber(activeQueue)} in your active queue</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No deliveries assigned" description="Deliveries scheduled to you today will appear here." />
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((delivery) => {
              const time = scheduledTime(delivery.scheduledDate);
              return (
                <li key={delivery.id}>
                  <Link
                    to="/delivery"
                    className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-3 transition hover:bg-secondary/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{delivery.customer}</p>
                        {time ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{time}</span> : null}
                      </div>
                      <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{delivery.address || "No address on file"}</span>
                      </p>
                    </div>
                    <StatusBadge value={formatEnumLabel(delivery.status)} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
