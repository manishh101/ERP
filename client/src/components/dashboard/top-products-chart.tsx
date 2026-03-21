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
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Best performing SKUs by quantity sold.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 64 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e8dfd4" />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={160} />
              <Tooltip />
              <Bar dataKey="quantity" fill="#75a78d" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

