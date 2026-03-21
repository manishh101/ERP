import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const toneClasses = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-rose-100 text-rose-800",
  slate: "bg-stone-100 text-stone-700",
};

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: keyof typeof toneClasses;
}) {
  return (
    <span className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", toneClasses[tone])}>
      {children}
    </span>
  );
}
