import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatEnumLabel, formatNumber } from "@/lib/utils";

/**
 * Today's deliveries grouped by status, plus the active-queue count.
 * Counts only — no monetary fields (WAREHOUSE view).
 */
export function DeliveryToday({
  today,
  activeQueue,
}: {
  today: Record<string, number>;
  activeQueue: number;
}) {
  const entries = Object.entries(today);

  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Today's Deliveries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <EmptyState title="Nothing scheduled today" description="Deliveries scheduled for today will appear here." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {entries.map(([status, count]) => (
              <div key={status} className="rounded-lg border border-border/70 bg-background p-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {formatEnumLabel(status)}
                </p>
                <p className="mt-1.5 text-lg font-semibold tabular-nums text-foreground">{formatNumber(count)}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-sm text-muted-foreground">Active queue</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">{formatNumber(activeQueue)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
