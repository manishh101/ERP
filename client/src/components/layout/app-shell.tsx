import { Package2, Settings, Truck, WalletCards, Warehouse } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSearchQuery } from "@/hooks/use-queries";
import { cn } from "@/lib/utils";
import { formatEnumLabel } from "@/lib/utils";
import type { NavItem } from "@/types/domain";

const navItems: NavItem[] = [
  { section: "Operations", label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { section: "Operations", label: "Inventory", href: "/inventory", icon: "Boxes" },
  { section: "Operations", label: "Purchasing", href: "/purchasing", icon: "ClipboardList" },
  { section: "Commerce", label: "Sales & CRM", href: "/sales", icon: "ShoppingCart" },
  { section: "Commerce", label: "Invoicing", href: "/invoicing", icon: "ReceiptText" },
  { section: "Finance", label: "Accounting", href: "/accounting", icon: "BookMarked", roles: ["ADMIN", "ACCOUNTANT"] },
  { section: "Finance", label: "Delivery", href: "/delivery", icon: "Truck" },
  { section: "Finance", label: "Reporting", href: "/reporting", icon: "BarChart3", roles: ["ADMIN", "ACCOUNTANT", "SALES"] },
  { section: "Admin", label: "Settings", href: "/settings", icon: "SlidersHorizontal", roles: ["ADMIN"] },
  { section: "Admin", label: "Users", href: "/users", icon: "Users", roles: ["ADMIN"] },
];

const iconMap = {
  LayoutDashboard: Package2,
  Boxes: Warehouse,
  ClipboardList: Package2,
  ShoppingCart: WalletCards,
  ReceiptText: WalletCards,
  BookMarked: Package2,
  Truck,
  BarChart3: Package2,
  SlidersHorizontal: Settings,
  Users: Package2,
};

export function AppShell() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: searchResults = [], isFetching: searchFetching } = useSearchQuery(deferredSearch);
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(user!.role));
  const groups = Array.from(new Set(visibleNavItems.map((item) => item.section)));
  const showSearchPanel = deferredSearch.trim().length >= 2;

  return (
    <div className="flex min-h-screen">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r border-white/40 bg-stone-950 px-5 py-6 text-stone-50 transition lg:static",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="rounded-3xl bg-white/8 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Manish Steel</p>
          <h1 className="mt-3 font-display text-3xl">Enterprise</h1>
          <p className="mt-2 text-sm text-stone-300">
            Retail and manufacturing control center for sales, stock, finance, and delivery.
          </p>
        </div>

        <nav className="mt-6 space-y-6">
          {groups.map((group) => (
            <div key={group}>
              <p className="mb-2 px-3 text-xs uppercase tracking-[0.26em] text-stone-500">{group}</p>
              <div className="space-y-1">
                {visibleNavItems
                  .filter((item) => item.section === group)
                  .map((item) => {
                    const Icon = iconMap[item.icon as keyof typeof iconMap] ?? Package2;
                    const active =
                      item.href === "/" ? location.pathname === item.href : location.pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition",
                          active ? "bg-white text-stone-900" : "text-stone-300 hover:bg-white/10",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-white/50 bg-background/80 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                className="rounded-full border border-border bg-white px-3 py-2 text-sm lg:hidden"
                onClick={() => setSidebarOpen((current) => !current)}
              >
                Menu
              </button>
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Global Search</p>
                <div className="relative mt-2 w-full max-w-xl">
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search products, customers, invoices, and orders"
                    className="pr-10"
                  />
                  {showSearchPanel && (
                    <div className="absolute top-14 z-20 w-full rounded-3xl border border-border bg-white p-2 shadow-panel">
                      {searchFetching ? (
                        <div className="rounded-2xl px-3 py-3 text-sm text-muted-foreground">Searching...</div>
                      ) : searchResults.length > 0 ? (
                        searchResults.map((result) => (
                          <Link
                            key={`${result.type}-${result.label}`}
                            to={result.href}
                            className="flex items-center justify-between rounded-2xl px-3 py-2 hover:bg-secondary"
                            onClick={() => setSearch("")}
                          >
                            <div>
                              <span className="text-sm">{result.label}</span>
                              {result.meta ? (
                                <p className="mt-1 text-xs text-muted-foreground">{result.meta}</p>
                              ) : null}
                            </div>
                            <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                              {result.type}
                            </span>
                          </Link>
                        ))
                      ) : (
                        <div className="rounded-2xl px-3 py-3 text-sm text-muted-foreground">
                          No matches found for &quot;{deferredSearch.trim()}&quot;.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white px-4 py-2 text-sm shadow-panel">
                {formatEnumLabel(user?.role)}
              </div>
              <div className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                {user?.email}
              </div>
              <Button variant="outline" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
