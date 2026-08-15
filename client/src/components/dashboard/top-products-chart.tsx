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

export function TopProductsChart({
  data,
}: {
  data: Array<{ name: string; quantity: number }>;
}) {
  const hasData = data.length > 0;

  return (
    <Card className="h-full border-border/70 bg-card shadow-sm">
      <CardHeader className="pb-3">
        <div>
          <CardTitle className="text-lg">Top Selling Products</CardTitle>
          <CardDescription>Best performing SKUs by quantity sold.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 76, right: 12, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  width={126}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  tickFormatter={(value) => (value.length > 20 ? `${value.substring(0, 20)}...` : value)}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #dbe3ef", background: "white", boxShadow: "0 10px 24px rgb(15 23 42 / 0.08)" }}
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                />
                <Bar dataKey="quantity" fill="#0891b2" radius={[0, 4, 4, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              No product movement for this period.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
