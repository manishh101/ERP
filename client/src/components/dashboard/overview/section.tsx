import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Quiet "View all →" link for a section header. */
export function SectionLink({ to, label = "View all" }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-muted-foreground transition hover:text-foreground"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/**
 * Section wrapper: a heading (with optional description + action) followed by
 * its content. Keeps role dashboards to a consistent, scannable hierarchy.
 */
export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
