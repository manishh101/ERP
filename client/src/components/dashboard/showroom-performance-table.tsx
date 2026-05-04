import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import NepaliDate from "nepali-datetime";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn, formatCurrency, toNumber, getNepaliMonthName } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  AlertCircle,
  X,
  CalendarDays,
  Receipt,
  Banknote,
} from "lucide-react";
import type { SalesOrderRow } from "@/types/domain";
import type { RawCustomer } from "@/hooks/use-queries";

// ─── Types ──────────────────────────────────────────────────────────────────
interface ShowroomMetric {
  id: string;
  name: string;
  orderCount: number;
  totalValue: number;
  totalPaid: number;
  totalDue: number;
  share: number;
  collectionRate: number;
  orders: SalesOrderRow[];   // keep raw orders for drill-down
}

interface MonthBucket {
  key: string;          // e.g. "2082-01"
  label: string;        // e.g. "Baisakh 2082"
  orders: SalesOrderRow[];
  totalValue: number;
  totalPaid: number;
  balanceDue: number;
}

interface ShowroomPerformanceTableProps {
  salesOrders: SalesOrderRow[];
  customers: RawCustomer[];
}

const HUE = [230, 260, 200, 280, 170, 310, 340, 20];

// ─── Helpers ────────────────────────────────────────────────────────────────
function buildMetrics(
  orders: SalesOrderRow[],
  customers: RawCustomer[],
): ShowroomMetric[] {
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const map = new Map<
    string,
    Omit<ShowroomMetric, "share" | "collectionRate">
  >();

  for (const order of orders) {
    if (order.customerType !== "SHOWROOM") continue;

    const existing = map.get(order.customerId) ?? {
      id: order.customerId,
      name: order.customer,
      orderCount: 0,
      totalValue: 0,
      totalPaid: 0,
      totalDue: 0,
      orders: [],
    };

    existing.orderCount += 1;
    existing.totalValue += toNumber(order.total);
    existing.totalPaid += toNumber(order.paidAmount);
    existing.orders.push(order);

    // Use the live outstanding balance from customer list (most accurate)
    const cust = customerById.get(order.customerId);
    existing.totalDue = cust
      ? toNumber(cust.outstandingBalance)
      : existing.totalDue;

    map.set(order.customerId, existing);
  }

  const metrics = Array.from(map.values());

  const grandTotal = metrics.reduce((s, m) => s + m.totalValue, 0);

  return metrics
    .map((m) => ({
      ...m,
      share: grandTotal > 0 ? (m.totalValue / grandTotal) * 100 : 0,
      collectionRate:
        m.totalValue > 0 ? (m.totalPaid / m.totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Group a showroom's orders into Nepali month buckets for drill-down.
 */
function groupByNepaliMonth(orders: SalesOrderRow[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>();

  for (const order of orders) {
    const dateStr = order.orderDate ?? "";
    let key = "unknown";
    let label = "Unknown";

    if (dateStr) {
      try {
        const nd = new NepaliDate(new Date(dateStr));
        const y = nd.getYear();
        const m = nd.getMonth(); // 0-indexed
        key = `${y}-${String(m).padStart(2, "0")}`;
        label = `${getNepaliMonthName(m)} ${y}`;
      } catch {
        // keep "unknown"
      }
    }

    const bucket = map.get(key) ?? {
      key,
      label,
      orders: [],
      totalValue: 0,
      totalPaid: 0,
      balanceDue: 0,
    };

    bucket.orders.push(order);
    bucket.totalValue += toNumber(order.total);
    bucket.totalPaid += toNumber(order.paidAmount);
    bucket.balanceDue += toNumber(order.balanceDue);
    map.set(key, bucket);
  }

  return Array.from(map.values()).sort((a, b) =>
    b.key.localeCompare(a.key),
  );
}

// ─── Drill-down Sheet ────────────────────────────────────────────────────────
function ShowroomDrillDownSheet({
  showroom,
  onClose,
}: {
  showroom: ShowroomMetric;
  onClose: () => void;
}) {
  const [activeMonth, setActiveMonth] = useState<string | null>(null);
  const months = useMemo(
    () => groupByNepaliMonth(showroom.orders),
    [showroom.orders],
  );

  const activeOrders = useMemo(() => {
    if (!activeMonth) return showroom.orders;
    return months.find((m) => m.key === activeMonth)?.orders ?? [];
  }, [activeMonth, months, showroom.orders]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-xl overflow-y-auto flex flex-col gap-0 p-0">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <SheetTitle className="text-lg">{showroom.name}</SheetTitle>
          <SheetDescription>
            {showroom.orderCount} orders · {formatCurrency(showroom.totalValue)} total revenue
          </SheetDescription>

          {/* Summary pills */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
              <Receipt className="h-3 w-3" />
              {formatCurrency(showroom.totalValue)} billed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              <Banknote className="h-3 w-3" />
              {formatCurrency(showroom.totalPaid)} collected
            </span>
            {showroom.totalDue > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                {formatCurrency(showroom.totalDue)} outstanding
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Month selector */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/60 mb-3 flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5" />
              Monthly Breakdown
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveMonth(null)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
                  !activeMonth
                    ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
                )}
              >
                All Time
              </button>
              {months.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setActiveMonth(m.key === activeMonth ? null : m.key)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border",
                    activeMonth === m.key
                      ? "bg-primary text-primary-foreground border-transparent shadow-sm"
                      : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month summary card (when a month is selected) */}
          {activeMonth && (() => {
            const bucket = months.find((m) => m.key === activeMonth);
            if (!bucket) return null;
            return (
              <div className="mx-6 mb-4 rounded-xl border bg-muted/20 p-4 grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">Orders</p>
                  <p className="text-lg font-black mt-0.5">{bucket.orders.length}</p>
                </div>
                <div className="text-center border-x border-border/30">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-violet-600/70">Billed</p>
                  <p className="text-lg font-black text-violet-700 tabular-nums mt-0.5">{formatCurrency(bucket.totalValue)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-amber-600/70">Due</p>
                  <p className="text-lg font-black text-amber-700 tabular-nums mt-0.5">{formatCurrency(bucket.balanceDue)}</p>
                </div>
              </div>
            );
          })()}

          {/* Orders list */}
          <div className="px-6 pb-6 space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 mb-3">
              {activeOrders.length} Order{activeOrders.length !== 1 ? "s" : ""}
            </p>
            {activeOrders.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No orders in this period.
              </div>
            ) : (
              activeOrders.map((order) => (
                <Link
                  key={order.id}
                  to={`/sales/${order.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-white hover:border-border hover:shadow-sm transition-all px-4 py-3 group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {order.id}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{order.status}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(toNumber(order.total))}</p>
                    {toNumber(order.balanceDue) > 0 && (
                      <p className="text-[11px] font-semibold text-amber-600 tabular-nums">
                        {formatCurrency(toNumber(order.balanceDue))} due
                      </p>
                    )}
                    {toNumber(order.balanceDue) <= 0 && (
                      <p className="text-[11px] font-semibold text-green-600">Settled ✓</p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export function ShowroomPerformanceTable({
  salesOrders,
  customers,
}: ShowroomPerformanceTableProps) {
  const [drillDown, setDrillDown] = useState<ShowroomMetric | null>(null);

  const metrics = useMemo(
    () => buildMetrics(salesOrders, customers),
    [salesOrders, customers],
  );

  const totalRevenue = metrics.reduce((s, m) => s + m.totalValue, 0);
  const totalDue = metrics.reduce((s, m) => s + m.totalDue, 0);
  const avgCollection =
    metrics.length > 0
      ? metrics.reduce((s, m) => s + m.collectionRate, 0) / metrics.length
      : 0;

  if (metrics.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center py-16 bg-white/50 border-white/20">
        <AlertCircle className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No showroom orders found.</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/50 backdrop-blur-sm border-white/20 shadow-sm overflow-hidden">
        {/* ── Header ── */}
        <CardHeader className="pb-0">
          <div className="w-full">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground/60 mb-1">
                  CLICK ANY ROW TO DRILL DOWN
                </p>
                <CardTitle className="text-xl">Showroom Leaderboard</CardTitle>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Total Revenue</p>
                <p className="text-2xl font-black tabular-nums mt-0.5">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-amber-600/70">Outstanding</p>
                <p className="text-lg font-black text-amber-700 tabular-nums mt-0.5">{formatCurrency(totalDue)}</p>
                <p className="text-[10px] text-amber-600/60 mt-1">
                  across {metrics.filter((m) => m.totalDue > 0).length} showrooms
                </p>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-600/70">Avg. Collection</p>
                <p className="text-lg font-black text-emerald-700 tabular-nums mt-0.5">{Math.round(avgCollection)}%</p>
                <p className="text-[10px] text-emerald-600/60 mt-1">
                  {metrics.length} active showroom{metrics.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 pb-4 px-5">
          {/* Proportional segmented bar */}
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 mb-3">Revenue Breakdown</p>
          <div className="flex h-7 w-full overflow-hidden rounded-xl shadow-inner bg-muted/20 mb-2">
            {metrics.map((m, i) => {
              const hue = HUE[i % HUE.length];
              return (
                <button
                  key={m.id}
                  className="h-full transition-all duration-300 hover:brightness-75 cursor-pointer"
                  style={{
                    width: `${m.share}%`,
                    background: `hsl(${hue} 60% 55%)`,
                    borderRight: "1.5px solid rgba(255,255,255,0.4)",
                  }}
                  onClick={() => setDrillDown(m)}
                  title={`${m.name}: ${formatCurrency(m.totalValue)}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-6">
            {metrics.map((m, i) => {
              const hue = HUE[i % HUE.length];
              return (
                <span key={m.id} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: `hsl(${hue} 60% 55%)` }} />
                  {m.name.split(" ")[0]}
                </span>
              );
            })}
          </div>

          {/* Ranked List */}
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 mb-3">Rankings</p>
          <div className="space-y-2">
            {metrics.map((m, i) => {
              const hue = HUE[i % HUE.length];
              const bg = `hsl(${hue} 60% 55%)`;

              return (
                <button
                  key={m.id}
                  className="group w-full text-left rounded-xl border border-border/30 bg-white/60 hover:bg-white hover:border-border/60 hover:shadow-sm transition-all duration-200 overflow-hidden cursor-pointer"
                  onClick={() => setDrillDown(m)}
                >
                  {/* Share bar accent */}
                  <div
                    className="h-0.5 transition-all duration-500 opacity-70"
                    style={{ background: `linear-gradient(to right, ${bg}, transparent)`, width: `${m.share}%` }}
                  />
                  <div className="flex items-center gap-3 px-3 py-3">
                    {/* Rank badge */}
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black text-white shrink-0 shadow-sm"
                      style={{ background: bg }}
                    >
                      {i + 1}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm truncate">{m.name}</span>
                        {i === 0 && (
                          <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded-full text-white shrink-0" style={{ background: bg }}>
                            #1
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{m.orderCount} order{m.orderCount !== 1 ? "s" : ""}</span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className={cn(
                          "text-[11px] font-semibold flex items-center gap-0.5",
                          m.collectionRate >= 80 ? "text-green-600" : m.collectionRate >= 40 ? "text-amber-600" : "text-red-600",
                        )}>
                          {m.collectionRate >= 80 ? <TrendingUp className="h-3 w-3" /> :
                           m.collectionRate >= 40 ? <Minus className="h-3 w-3" /> :
                           <TrendingDown className="h-3 w-3" />}
                          {Math.round(m.collectionRate)}% collected
                        </span>
                      </div>
                    </div>

                    {/* Financials */}
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(m.totalValue)}</p>
                      {m.totalDue > 0 ? (
                        <p className="text-[11px] font-semibold text-amber-600 tabular-nums">{formatCurrency(m.totalDue)} due</p>
                      ) : (
                        <p className="text-[11px] font-semibold text-green-600">Settled ✓</p>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground/20 group-hover:text-muted-foreground/60 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Drill-down Sheet */}
      {drillDown && (
        <ShowroomDrillDownSheet showroom={drillDown} onClose={() => setDrillDown(null)} />
      )}
    </>
  );
}
