import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type StatTone = "neutral" | "positive" | "warning" | "danger";

const toneValue: Record<StatTone, string> = {
  neutral: "text-foreground",
  positive: "text-emerald-700",
  warning: "text-amber-700",
  danger: "text-red-700",
};

/**
 * Calm KPI tile: label, primary value, optional sub-line. Border + card
 * surface only — no glow, gradient, or animation (per UI direction). When
 * `href` is set the whole tile is a quiet navigation target.
 */
export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  href,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: StatTone;
  href?: string;
  icon?: LucideIcon;
}) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
      </div>
      <p className={cn("mt-2 break-words text-2xl font-semibold leading-none tracking-tight tabular-nums", toneValue[tone])}>
        {value}
      </p>
      {sub ? <p className="mt-2 truncate text-xs text-muted-foreground">{sub}</p> : null}
    </>
  );

  const base = "flex h-full flex-col justify-between rounded-lg border border-border/70 bg-card p-4";

  if (href) {
    return (
      <Link to={href} className={cn(base, "transition hover:border-primary/40 hover:bg-secondary/30")}>
        {inner}
      </Link>
    );
  }

  return <div className={base}>{inner}</div>;
}
