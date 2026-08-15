import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function RevenueCogsChart({
  data,
}: {
  data: Array<{ month: string; revenue: number; cogs: number }>;
}) {
  const hasData = data.some((item) => item.revenue > 0 || item.cogs > 0);

  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">Revenue vs COGS</CardTitle>
          <CardDescription>Monthly billing and cost of goods sold.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} dy={10} />
                <YAxis tickFormatter={(value) => `${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(Number(value)),
                    name === "revenue" ? "Revenue" : "COGS",
                  ]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #dbe3ef", background: "white", boxShadow: "0 10px 24px rgb(15 23 42 / 0.08)" }}
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                />
                <Legend
                  iconType="square"
                  wrapperStyle={{ paddingTop: 18, fontSize: 12 }}
                  formatter={(value: string) => (value === "revenue" ? "Revenue" : "COGS")}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="cogs" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              No revenue data for this period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
