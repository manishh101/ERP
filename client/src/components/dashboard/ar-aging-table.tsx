import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn, formatCurrency, toNumber } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  Shield,
} from "lucide-react";
import type { AgingBuckets } from "@/types/domain";
import type { RawCustomer } from "@/hooks/use-queries";

// ─── Types ─────────────────────────────────────────────────────────────────
interface ArAgingTableProps {
  data: AgingBuckets;
  customers: RawCustomer[];
}

// ─── Bucket Config ──────────────────────────────────────────────────────────
const BUCKETS = [
  {
    key: "0-30" as const,
    label: "Current",
    sub: "0–30 Days",
    Icon: CheckCircle2,
    color: "emerald",
    bar: "bg-emerald-500",
    ring: "ring-emerald-200",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    glow: "shadow-emerald-100",
  },
  {
    key: "31-60" as const,
    label: "Watch",
    sub: "31–60 Days",
    Icon: Clock,
    color: "amber",
    bar: "bg-amber-500",
    ring: "ring-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    glow: "shadow-amber-100",
  },
  {
    key: "61-90" as const,
    label: "At Risk",
    sub: "61–90 Days",
    Icon: AlertTriangle,
    color: "orange",
    bar: "bg-orange-500",
    ring: "ring-orange-200",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    glow: "shadow-orange-100",
  },
  {
    key: "90+" as const,
    label: "Critical",
    sub: "90+ Days",
    Icon: Flame,
    color: "red",
    bar: "bg-red-500",
    ring: "ring-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    glow: "shadow-red-100",
  },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────
export function ArAgingTable({ data, customers }: ArAgingTableProps) {
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SHOWROOM" | "RETAIL">("ALL");
  const total = data.totalOutstanding;

  // All parties (Showroom & Retail) with outstanding > 0
  const partyRows = customers
    .filter((c) => toNumber(c.outstandingBalance) > 0)
    .filter((c) => typeFilter === "ALL" || c.type === typeFilter)
    .map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      outstanding: toNumber(c.outstandingBalance),
      creditLimit: toNumber(c.creditLimit),
      riskBucket: (() => {
        const pct = toNumber(c.outstandingBalance) / Math.max(toNumber(c.creditLimit), 1);
        if (pct > 0.9) return "90+";
        if (pct > 0.6) return "61-90";
        if (pct > 0.3) return "31-60";
        return "0-30";
      })(),
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  const partyDebtorCount = partyRows.length;
  const maxOutstanding = Math.max(...partyRows.map((r) => r.outstanding), 1);
  const allClear = total <= 0 && partyDebtorCount === 0;

  return (
    <Card className="bg-white/50 backdrop-blur-sm border-white/20 shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground/60 mb-1">
              RECEIVABLES RISK
            </p>
            <div className="flex items-center gap-4">
              <CardTitle className="text-xl">AR Aging Matrix</CardTitle>
              <div className="flex items-center rounded-lg border border-border/50 bg-muted/30 p-0.5">
                {(["ALL", "SHOWROOM", "RETAIL"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-md transition-all",
                      typeFilter === t
                        ? "bg-white text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t === "ALL" ? "All" : t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">Total Owed</p>
            <p className={cn(
              "text-2xl font-black tabular-nums mt-0.5",
              total > 0 ? "text-red-700" : "text-green-700"
            )}>
              {formatCurrency(total)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {partyDebtorCount} part{partyDebtorCount !== 1 ? "ies" : "y"} with dues
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0 space-y-5">

        {allClear ? (
          <div className="flex flex-col items-center justify-center py-12 rounded-2xl bg-green-50 border border-green-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 mb-4">
              <Shield className="h-7 w-7 text-green-600" />
            </div>
            <p className="text-base font-bold text-green-700">All Clear!</p>
            <p className="text-sm text-green-600/70 mt-1">No outstanding receivables across all parties.</p>
          </div>
        ) : (
          <>
            {/* ── 4 Bucket Cards ── */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {BUCKETS.map(({ key, label, sub, Icon, bar, bg, text, border, glow, ring }) => {
                const value = data[key];
                const pct = total > 0 ? (value / total) * 100 : 0;
                const isActive = value > 0;

                return (
                  <Tooltip key={key} delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className={cn(
                        "relative rounded-2xl border p-3.5 transition-all duration-200 overflow-hidden",
                        isActive
                          ? `${bg} ${border} hover:shadow-md ${glow} cursor-default`
                          : "bg-muted/10 border-border/20",
                      )}>
                        {/* Dial: circular pct indicator */}
                        {isActive && (
                          <div className="absolute top-2 right-2 opacity-10">
                            <div className={cn("h-12 w-12 rounded-full border-4", `border-current ${text}`)} />
                          </div>
                        )}

                        <Icon className={cn(
                          "h-4 w-4 mb-2",
                          isActive ? text : "text-muted-foreground/20",
                        )} />

                        <p className={cn(
                          "text-[10px] uppercase tracking-widest font-black mb-0.5",
                          isActive ? text : "text-muted-foreground/30",
                        )}>
                          {label}
                        </p>
                        <p className={cn(
                          "text-xs font-medium mb-2",
                          isActive ? `${text} opacity-60` : "text-muted-foreground/20",
                        )}>
                          {sub}
                        </p>

                        <p className={cn(
                          "text-base font-black tabular-nums",
                          isActive ? text : "text-muted-foreground/20",
                        )}>
                          {formatCurrency(value)}
                        </p>

                        {isActive && pct > 0 && (
                          <>
                            <div className="mt-2.5 h-1.5 w-full rounded-full bg-black/8 overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-700", bar)}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <p className={cn("text-[9px] font-bold mt-1", text)}>
                              {Math.round(pct)}% of total
                            </p>
                          </>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {isActive ? `${formatCurrency(value)} outstanding in ${sub}` : "No outstanding debt in this range"}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {/* ── Proportional colour bar ── */}
            {total > 0 && (
              <div className="space-y-2">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/20 shadow-inner">
                  {BUCKETS.map(({ key, bar }) => {
                    const pct = (data[key] / total) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={key}
                        className={cn("h-full transition-all duration-700", bar)}
                        style={{ width: `${pct}%` }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[9px] font-medium text-muted-foreground/50 px-0.5">
                  {BUCKETS.map(({ key, label }) => {
                    const pct = total > 0 ? Math.round((data[key] / total) * 100) : 0;
                    return pct > 4 ? (
                      <span key={key}>{label} {pct}%</span>
                    ) : null;
                  })}
                </div>
              </div>
            )}

            {/* ── Per-Party Breakdown ── */}
            {partyRows.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/50 mb-3">
                  Per-Party Outstanding
                </p>

                {partyRows.map((row, idx) => {
                  const bucket = BUCKETS.find((b) => b.key === row.riskBucket) ?? BUCKETS[0];
                  const barWidth = (row.outstanding / maxOutstanding) * 100;
                  const creditUsed = row.creditLimit > 0
                    ? (row.outstanding / row.creditLimit) * 100
                    : 0;

                  return (
                    <div key={row.id} className={cn(
                      "group relative rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-sm",
                      idx === 0
                        ? "border-red-200/70 bg-red-50/40 hover:bg-red-50/70"
                        : "border-border/30 bg-white/60 hover:bg-white hover:border-border/50",
                    )}>
                      {/* Bar fill */}
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 opacity-10 transition-all duration-700",
                          bucket.bar,
                        )}
                        style={{ width: `${barWidth}%` }}
                      />

                      <div className="relative flex items-center gap-3 px-4 py-3">
                        {/* Rank */}
                        <span className="text-xs font-black text-muted-foreground/40 w-5 text-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Risk dot */}
                        <div className={cn(
                          "h-2.5 w-2.5 rounded-full shrink-0",
                          bucket.bar,
                          idx === 0 && "animate-pulse",
                        )} />

                        {/* Name + credit used */}
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/parties/${row.id}`}
                            className="text-sm font-semibold hover:text-primary hover:underline transition-colors truncate block"
                          >
                            {row.name}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            {row.type !== "SHOWROOM" && (
                              <span className="inline-block px-1.5 py-0.5 rounded-sm text-[8px] font-bold bg-muted text-muted-foreground">
                                {row.type}
                              </span>
                            )}
                            {row.creditLimit > 0 && (
                              <div className="flex items-center gap-2 flex-1">
                                <div className="h-1 flex-1 max-w-[80px] rounded-full bg-muted/40 overflow-hidden">
                                  <div
                                    className={cn("h-full rounded-full", bucket.bar)}
                                    style={{ width: `${Math.min(creditUsed, 100)}%` }}
                                  />
                                </div>
                                <span className="text-[9px] text-muted-foreground font-medium">
                                  {Math.round(creditUsed)}% limit used
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Due amount + risk label */}
                        <div className="text-right shrink-0">
                          <p className={cn("text-sm font-black tabular-nums", bucket.text)}>
                            {formatCurrency(row.outstanding)}
                          </p>
                          <span className={cn(
                            "text-[9px] uppercase font-black tracking-wide",
                            bucket.text,
                          )}>
                            {bucket.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
