import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { DashboardActivity } from "@/types/domain";
import { formatDate, formatEnumLabel } from "@/lib/utils";

/** Recent audit-log activity feed (ADMIN). Read-only, no money figures. */
export function ActivityFeed({ rows }: { rows: DashboardActivity[] }) {
  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No recent activity" description="Team actions will appear here." />
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((entry) => (
              <li key={entry.id} className="flex items-baseline justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    <span className="font-medium">{formatEnumLabel(entry.action)}</span>{" "}
                    <span className="text-muted-foreground">· {formatEnumLabel(entry.entityType)}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{entry.user}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{formatDate(entry.timestamp)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
