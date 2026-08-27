import { Link, useLocation } from "react-router-dom";
import { PanelLeftClose, PanelLeft } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NAVIGATION, matchesPath } from "@/config/navigation";

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const role = user?.role;

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[60px]" : "w-[260px]",
      )}
    >
      {/* Branding */}
      <div className={cn("flex items-center gap-3 px-4 py-5", collapsed && "justify-center px-2")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-sm font-bold">
          {(user?.workspaceName ?? "M").charAt(0).toUpperCase()}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.workspaceName ?? "My Workspace"}</p>
            <p className="truncate text-xs text-sidebar-muted">Workspace</p>
          </div>
        )}
      </div>

      <Separator className="bg-sidebar-border" />

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-1 px-2">
          {NAVIGATION.map((section, sectionIdx) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || (role && item.roles.includes(role)),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title || sectionIdx}>
                {section.title && !collapsed && (
                  <p className="mb-1 mt-4 px-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
                    {section.title}
                  </p>
                )}
                {section.title && collapsed && sectionIdx > 0 && (
                  <Separator className="my-2 bg-sidebar-border" />
                )}
                {visibleItems.map((item) => {
                  const active = matchesPath(location.pathname, item.href);
                  const Icon = item.icon;

                  const linkContent = (
                    <Link
                      to={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                          : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      {active && !collapsed && (
                        <span
                          className="absolute left-0.5 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-accent-foreground"
                          aria-hidden="true"
                        />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return <div key={item.href}>{linkContent}</div>;
                })}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center py-3 text-sidebar-muted transition-colors hover:text-sidebar-foreground"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </aside>
  );
}
