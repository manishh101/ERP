import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Cash Flow Trend</CardTitle>
          <CardDescription>Operating inflow and outflow trend for the last 6 months.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8dfd4" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} />
              <YAxis tickFormatter={(value) => `NPR ${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Line type="monotone" dataKey="inflow" stroke="#7c5c45" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="outflow" stroke="#c96f55" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

