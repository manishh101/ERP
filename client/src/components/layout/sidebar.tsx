import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  ShoppingCart,
  Truck,
  Wallet,
  Receipt,
  FileText,
  ClipboardList,
  Package,
  Settings,
  Users,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/domain";

type NavEntry = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: UserRole[];
};

type NavSection = {
  title: string;
  items: NavEntry[];
};

const navigation: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard },
    ],
  },
  {
    title: "Parties",
    items: [
      { label: "Customers & Showrooms", href: "/parties", icon: Building2 },
      { label: "Suppliers", href: "/suppliers", icon: Building2 },
    ],
  },
  {
    title: "Sales & Dispatch",
    items: [
      { label: "Orders", href: "/sales", icon: ShoppingCart },
      { label: "Challans", href: "/delivery", icon: Truck },
      { label: "Estimate Bills", href: "/estimates", icon: FileText, roles: ["ADMIN", "ACCOUNTANT", "SALES"] },
      { label: "VAT/PAN Bills", href: "/invoicing", icon: Receipt, roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    title: "Purchasing",
    items: [
      { label: "Purchase Orders", href: "/purchasing", icon: ClipboardList },
      { label: "Supplier Invoice", href: "/supplier-invoices", icon: Receipt, roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Accounting Dashboard", href: "/accounting", icon: LayoutDashboard, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Payments", href: "/payments", icon: Wallet, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "VAT Register", href: "/accounting/vat", icon: ClipboardList, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Ledger (Khata)", href: "/accounting/ledger", icon: ClipboardList, roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Products", href: "/inventory", icon: Package },
    ],
  },
  {
    title: "Admin",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
      { label: "Users", href: "/users", icon: Users, roles: ["ADMIN"] },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

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
          {navigation.map((section, sectionIdx) => {
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
                {section.title && collapsed && <Separator className="my-2 bg-sidebar-border" />}
                {visibleItems.map((item) => {
                  const active = isActive(location.pathname, item.href);
                  const Icon = item.icon;

                  const linkContent = (
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-muted hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                        collapsed && "justify-center px-0",
                      )}
                    >
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
