import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";
import { formatCurrency } from "@/lib/utils";
import type { ShowroomAnalytics } from "@/types/domain";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ShowroomOption {
  id: string;
  name: string;
}

interface ShowroomAnalyticsWidgetProps {
  showrooms: ShowroomOption[];
}

function MetricCell({
  label,
  units,
  value,
}: {
  label: string;
  units: number;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-secondary/60 p-3 text-center">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-base font-bold text-foreground">
        {formatCurrency(value)}
      </span>
      <span className="text-xs text-muted-foreground">{units} units</span>
    </div>
  );
}

export function ShowroomAnalyticsWidget({ showrooms }: ShowroomAnalyticsWidgetProps) {
  const [selectedId, setSelectedId] = useState<string>(showrooms[0]?.id ?? "");
  const { token } = useAuth();

  const { data, isLoading } = useQuery<ShowroomAnalytics>({
    queryKey: ["showroom-analytics", selectedId, token],
    queryFn: () => apiRequest(`/dashboard/showroom-analytics/${selectedId}`, { token: token! }),
    enabled: Boolean(selectedId) && Boolean(token),
    staleTime: 15 * 60 * 1000, // Match 15-min Redis TTL
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Showroom Analytics</CardTitle>
            <CardDescription>
              Volume &amp; value dispatched — current month, previous month, and YTD
            </CardDescription>
          </div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex h-11 w-44 shrink-0 rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {showrooms.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading || !data ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-secondary/60" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <MetricCell
              label="This Month"
              units={data.currentMonth.units}
              value={data.currentMonth.value}
            />
            <MetricCell
              label="Prev Month"
              units={data.previousMonth.units}
              value={data.previousMonth.value}
            />
            <MetricCell
              label="YTD"
              units={data.yearToDate.units}
              value={data.yearToDate.value}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
