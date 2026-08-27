import type { MouseEventHandler, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";

type PageHeaderAction = {
  label: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  disabled?: boolean;
};

export function PageHeader({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  breadcrumbs?: BreadcrumbItem[];
  /**
   * Either a declarative list of action buttons (original API, still supported
   * by all existing callers) or an arbitrary node for richer toolbars.
   */
  actions?: PageHeaderAction[] | ReactNode;
}) {
  const renderActions = () => {
    if (!actions) return null;
    if (Array.isArray(actions)) {
      return (
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
      );
    }
    return <div className="flex flex-wrap items-center gap-2">{actions}</div>;
  };

  return (
    <div className="mb-6 flex flex-col gap-3">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumb items={breadcrumbs} />}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
        </div>
        {renderActions()}
      </div>
    </div>
  );
}
