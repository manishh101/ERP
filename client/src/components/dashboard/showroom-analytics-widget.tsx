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
  colorClass,
}: {
  label: string;
  units: number;
  value: number;
  colorClass: string;
}) {
  return (
    <div className={`flex flex-col relative overflow-hidden gap-1 rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-lg backdrop-blur-md border border-white/20 shadow-sm ${colorClass}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
      <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground relative z-10">
        {label}
      </span>
      <span className="text-2xl font-black bg-clip-text text-foreground relative z-10 mt-1">
        {formatCurrency(value)}
      </span>
      <span className="text-xs font-semibold text-muted-foreground mix-blend-multiply opacity-80 relative z-10 mt-2">
        {units} Units
      </span>
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
    <Card className="h-full bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Showroom Analytics</CardTitle>
            <CardDescription>
              Volume &amp; value dispatched — current month, previous month, and YTD
            </CardDescription>
          </div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex h-10 w-full sm:w-56 shrink-0 rounded-xl border border-white/30 shadow-sm bg-white/60 backdrop-blur-md px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all font-medium"
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-secondary/40 border border-white/20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCell
              label="This Month"
              units={data.currentMonth.units}
              value={data.currentMonth.value}
              colorClass="bg-indigo-500/10"
            />
            <MetricCell
              label="Prev Month"
              units={data.previousMonth.units}
              value={data.previousMonth.value}
              colorClass="bg-violet-500/10"
            />
            <MetricCell
              label="YTD"
              units={data.yearToDate.units}
              value={data.yearToDate.value}
              colorClass="bg-fuchsia-500/10"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
