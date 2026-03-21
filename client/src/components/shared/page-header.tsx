import type { MouseEventHandler } from "react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: Array<{
    label: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    variant?: "default" | "secondary" | "outline";
  }>;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-3 font-display text-4xl text-foreground">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Button key={action.label} variant={action.variant ?? "default"} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
