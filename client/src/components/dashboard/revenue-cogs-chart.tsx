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
    <Card className="h-full bg-white/50 backdrop-blur-sm border-white/20 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader>
        <div>
          <CardTitle>Revenue vs COGS</CardTitle>
          <CardDescription>Monthly performance for the last 12 months.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.9}/>
                  <stop offset="95%" stopColor="#6d28d9" stopOpacity={0.9}/>
                </linearGradient>
                <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
              <YAxis tickFormatter={(value) => `NPR ${Math.round(value / 1000)}k`} tickLine={false} axisLine={false} tick={{fill: '#64748b', fontSize: 12}} />
              <Tooltip 
                formatter={(value) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: '12px', border: '1px solid rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: 'rgba(0,0,0,0.02)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              <Bar dataKey="revenue" fill="url(#colorRev)" radius={[6, 6, 0, 0]} maxBarSize={40} />
              <Bar dataKey="cogs" fill="url(#colorCogs)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

