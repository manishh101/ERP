import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import type { DashboardSalesTrendPoint } from "@/types/domain";
import { formatCurrency } from "@/lib/utils";

/** Compact NPR label for axis ticks (e.g. 1.2L, 3.4Cr) — Nepali grouping. */
function compactNpr(value: number) {
  if (value >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(1)}Cr`;
  if (value >= 1_00_000) return `${(value / 1_00_000).toFixed(1)}L`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(value);
}

/**
 * Monthly sales revenue for the current fiscal year (ADMIN only). Revenue is
 * SalesOrder orderAmount aggregated server-side — not mixed with VAT or COGS.
 */
export function SalesTrendChart({ data }: { data: DashboardSalesTrendPoint[] }) {
  const hasData = data.some((point) => point.revenue > 0);

  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-col items-start gap-1 pb-3">
        <CardTitle className="text-base">Sales Trend</CardTitle>
        <CardDescription>Monthly sales for the current fiscal year.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ left: 8, right: 12, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={compactNpr}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Sales"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #dbe3ef", background: "white" }}
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                />
                <Bar dataKey="revenue" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No sales yet" description="Sales for this fiscal year will appear here." />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
