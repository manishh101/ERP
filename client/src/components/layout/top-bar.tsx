import { Search, Menu, Calendar, Landmark } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatEnumLabel, getCurrentBsDate, getCurrentFiscalYear } from "@/lib/utils";

export function TopBar({
  onMenuClick,
  onSearchOpen,
}: {
  onMenuClick: () => void;
  onSearchOpen: () => void;
}) {
  const { user, logout } = useAuth();
  const bsDate = getCurrentBsDate();
  const fiscalYear = getCurrentFiscalYear();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <div className="flex-1 overflow-hidden">
        <Breadcrumbs />
      </div>

      {/* Header Widgets: BS Date & Fiscal Year */}
      <div className="hidden items-center gap-2 md:flex">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="tabular-nums">{bsDate}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Bikram Sambat Date</TooltipContent>
        </Tooltip>
        <div className="flex items-center gap-1.5 rounded-md border border-border/50 bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Landmark className="h-3 w-3" />
          <span>{fiscalYear}</span>
        </div>
      </div>

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden h-9 w-[220px] justify-start gap-2 rounded-full border-border/70 bg-card px-3 text-muted-foreground shadow-xs transition-colors hover:bg-muted/60 hover:text-foreground sm:flex lg:w-[280px]"
        onClick={onSearchOpen}
        aria-label="Open global search"
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left text-xs font-medium">Search ERP...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground md:inline-flex">
          Ctrl K
        </kbd>
      </Button>

      {/* Mobile search */}
      <button
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
        onClick={onSearchOpen}
        aria-label="Open global search"
      >
        <Search className="h-4 w-4" />
      </button>

      {/* User */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{formatEnumLabel(user?.role)}</Badge>
        <span className="hidden text-sm text-muted-foreground md:inline">{user?.name}</span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </header>
  );
}
