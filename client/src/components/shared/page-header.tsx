import type { MouseEventHandler } from "react";
import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: Array<{
    label: string;
    onClick?: MouseEventHandler<HTMLButtonElement>;
    variant?: "default" | "secondary" | "outline";
    disabled?: boolean;
  }>;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {actions && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant ?? "default"}
              onClick={action.onClick}
              disabled={action.disabled}
              size="sm"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
