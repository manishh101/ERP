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
    <Card className="h-full bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div>
          <CardTitle>Top Selling Products</CardTitle>
          <CardDescription>Best performing SKUs by quantity sold.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 64, right: 10, top: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTop" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.9}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis type="number" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <YAxis 
                dataKey="name" 
                type="category" 
                tickLine={false} 
                axisLine={false} 
                width={120} 
                tick={{fill: '#64748b', fontSize: 11}} 
                tickFormatter={(value) => value.length > 18 ? `${value.substring(0, 18)}...` : value}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              />
              <Bar dataKey="quantity" fill="url(#colorTop)" radius={[0, 6, 6, 0]} maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

