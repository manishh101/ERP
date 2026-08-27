import { Search, Menu, Calendar, Landmark, ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatEnumLabel, getCurrentBsDate, getCurrentFiscalYear } from "@/lib/utils";

function getInitials(name?: string): string {
  const parts = (name ?? "").split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

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
        aria-label="Open navigation menu"
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
        className="hidden h-9 w-[220px] justify-start gap-2 rounded-md border-border/70 bg-card px-3 text-muted-foreground shadow-xs transition-colors hover:bg-muted/60 hover:text-foreground sm:flex lg:w-[280px]"
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

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-md p-1 pr-1.5 text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
            aria-label="Open user menu"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {getInitials(user?.name)}
            </span>
            <span className="hidden max-w-[120px] truncate font-medium md:inline">{user?.name}</span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground md:inline" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col gap-0.5">
            <span className="truncate text-sm font-semibold">{user?.name ?? "User"}</span>
            {user?.email && (
              <span className="truncate text-xs font-normal text-muted-foreground">{user.email}</span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <Badge variant="secondary">{formatEnumLabel(user?.role)}</Badge>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => logout()}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
