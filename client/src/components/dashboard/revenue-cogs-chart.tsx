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
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Revenue vs COGS</CardTitle>
          <CardDescription>Monthly performance for the last 12 months.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8dfd4" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `NPR ${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="revenue" fill="#7c5c45" radius={[10, 10, 0, 0]} />
              <Bar dataKey="cogs" fill="#d8b18a" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

