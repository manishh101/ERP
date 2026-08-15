import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function CashFlowChart({
  data,
}: {
  data: Array<{ month: string; inflow: number; outflow: number }>;
}) {
  const hasData = data.some((item) => item.inflow > 0 || item.outflow > 0);

  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">Cash Flow Trend</CardTitle>
          <CardDescription>Operating inflow and outflow over time.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cashOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{ borderRadius: 8, border: "1px solid #dbe3ef", background: "white", boxShadow: "0 10px 24px rgb(15 23 42 / 0.08)" }}
                />
                <Legend iconType="square" wrapperStyle={{ paddingTop: 14, fontSize: 12 }} />
                <Area type="monotone" dataKey="inflow" stroke="#059669" strokeWidth={2.5} fillOpacity={1} fill="url(#cashIn)" />
                <Area type="monotone" dataKey="outflow" stroke="#dc2626" strokeWidth={2.5} fillOpacity={1} fill="url(#cashOut)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              No cash flow data for this period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
