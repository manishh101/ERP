import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { CommandSearch } from "@/components/layout/command-search";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "erp-sidebar-collapsed";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Close mobile sidebar on route change (resize)
  useEffect(() => {
    const handler = () => setMobileOpen(false);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div
        className={cn(
          "hidden lg:block fixed inset-y-0 left-0 z-50 transition-[width] duration-200",
          collapsed ? "w-[60px]" : "w-[260px]"
        )}
      >
        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col min-h-screen transition-[margin] duration-200",
          collapsed ? "lg:ml-[60px]" : "lg:ml-[260px]"
        )}
      >
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          onSearchOpen={() => setSearchOpen(true)}
        />

        <main className="flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Global command search */}
      <CommandSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
