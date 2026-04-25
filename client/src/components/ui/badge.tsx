import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-primary/10 text-primary border-transparent",
  secondary: "bg-secondary text-secondary-foreground border-transparent",
  destructive: "bg-red-100 text-red-800 border-transparent",
  outline: "border-border text-foreground",
  success: "bg-green-100 text-green-800 border-transparent",
  warning: "bg-amber-100 text-amber-800 border-transparent",
};

export type BadgeVariant = keyof typeof badgeVariants;

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
