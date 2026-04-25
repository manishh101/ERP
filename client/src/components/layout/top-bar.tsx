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
        className="hidden gap-2 text-muted-foreground sm:flex"
        onClick={onSearchOpen}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-xs">Search...</span>
        <kbd className="pointer-events-none ml-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </Button>

      {/* Mobile search */}
      <button
        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground sm:hidden"
        onClick={onSearchOpen}
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
