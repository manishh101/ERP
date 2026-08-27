import {
  LayoutDashboard,
  BarChart3,
  Building2,
  Factory,
  ShoppingCart,
  Truck,
  Wallet,
  Receipt,
  FileText,
  ClipboardList,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/domain";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /**
   * Roles allowed to see this item AND reach its route. Omitted = every
   * authenticated user. These mirror the server's `requireRole` guards
   * (see server/src/routes/*.routes.ts) — the server remains the security
   * boundary; this list drives sidebar visibility and the client route guard.
   */
  roles?: UserRole[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

/**
 * Single source of truth for the application shell navigation.
 * Consumed by the sidebar (rendering + RBAC filtering), the route guard
 * (`require-route-access.tsx`) and the breadcrumb labels below.
 */
export const NAVIGATION: NavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", href: "/sales", icon: ShoppingCart },
      { label: "Estimate Bills", href: "/estimates", icon: FileText, roles: ["ADMIN", "ACCOUNTANT", "SALES"] },
      { label: "VAT/PAN Bills", href: "/invoicing", icon: Receipt, roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    title: "Delivery",
    items: [{ label: "Challans", href: "/delivery", icon: Truck }],
  },
  {
    title: "Purchasing",
    items: [
      { label: "Purchase Orders", href: "/purchasing", icon: ClipboardList },
      { label: "Supplier Invoices", href: "/supplier-invoices", icon: Receipt, roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    title: "Inventory",
    items: [{ label: "Products", href: "/inventory", icon: Package }],
  },
  {
    title: "Parties",
    items: [
      { label: "Customers & Showrooms", href: "/parties", icon: Building2 },
      { label: "Suppliers", href: "/suppliers", icon: Factory },
    ],
  },
  {
    title: "Accounting",
    items: [
      { label: "Accounting Dashboard", href: "/accounting", icon: LayoutDashboard, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Payments", href: "/payments", icon: Wallet, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "VAT Register", href: "/accounting/vat", icon: ClipboardList, roles: ["ADMIN", "ACCOUNTANT"] },
      { label: "Ledger (Khata)", href: "/accounting/ledger", icon: ClipboardList, roles: ["ADMIN", "ACCOUNTANT"] },
    ],
  },
  {
    title: "Reports",
    items: [{ label: "Reports", href: "/reporting", icon: BarChart3, roles: ["ADMIN", "ACCOUNTANT", "SALES"] }],
  },
  {
    title: "Administration",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
      { label: "Users", href: "/users", icon: Users, roles: ["ADMIN"] },
    ],
  },
];

const ALL_ITEMS: NavItem[] = NAVIGATION.flatMap((section) => section.items);

/** Active-state / prefix helper shared by the sidebar and the route guard. */
export function matchesPath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Roles required to access a route, by longest-prefix match over the nav
 * hrefs (so detail routes inherit their parent section, e.g. `/sales/:id`
 * → `/sales`). Returns `null` when no gated match applies (⇒ any
 * authenticated user). The server still enforces access on every request.
 */
export function getRequiredRolesForPath(pathname: string): UserRole[] | null {
  let best: NavItem | null = null;
  for (const item of ALL_ITEMS) {
    if (matchesPath(pathname, item.href) && (!best || item.href.length > best.href.length)) {
      best = item;
    }
  }
  return best?.roles ?? null;
}

/**
 * URL segment → human label for breadcrumbs, kept consistent with the nav
 * labels above (fixes prior drift, e.g. `purchasing` mislabelled "Warehouses").
 */
export const BREADCRUMB_LABELS: Record<string, string> = {
  parties: "Customers & Showrooms",
  suppliers: "Suppliers",
  sales: "Orders",
  delivery: "Challans",
  invoicing: "VAT/PAN Bills",
  "supplier-invoices": "Supplier Invoices",
  estimates: "Estimate Bills",
  accounting: "Accounting",
  ledger: "Ledger (Khata)",
  vat: "VAT Register",
  inventory: "Products",
  purchasing: "Purchase Orders",
  products: "Products",
  payments: "Payments",
  settings: "Settings",
  users: "Users",
  reporting: "Reports",
};
