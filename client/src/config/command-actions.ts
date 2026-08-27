import {
  Building2,
  ClipboardList,
  Package,
  ShoppingCart,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types/domain";

export type CommandActionGroup = "Create" | "Go to";

export type CommandAction = {
  label: string;
  href: string;
  icon: LucideIcon;
  group: CommandActionGroup;
  /** Extra terms cmdk matches against (the visible label is always matched). */
  keywords?: string[];
  /**
   * Roles allowed to perform/reach this action. Omitted = every authenticated
   * user. These mirror the server's create-endpoint `requireRole` guards
   * intersected with the destination route's access (see
   * server/src/routes/*.routes.ts and config/navigation.ts) — the server
   * remains the security boundary; this list only drives palette visibility.
   */
  roles?: UserRole[];
};

/**
 * Command-palette actions surfaced in the Ctrl+K dialog. "Create" actions
 * navigate to a section with `?new=1`, which the target page reads to
 * auto-open its existing create sheet. "Go to" actions are plain navigation.
 * Role gating below is deliberately the most restrictive of the create
 * endpoint and the destination route so no action leads to a 403 / the
 * in-shell "Not authorized" panel.
 */
export const COMMAND_ACTIONS: CommandAction[] = [
  // Create — roles = create-endpoint requireRole ∩ destination-route roles
  {
    label: "New Customer",
    href: "/parties?new=1",
    icon: Building2,
    group: "Create",
    keywords: ["add", "party", "showroom", "retail", "customer"],
    roles: ["ADMIN", "SALES", "ACCOUNTANT"],
  },
  {
    label: "New Product",
    href: "/inventory?new=1",
    icon: Package,
    group: "Create",
    keywords: ["add", "item", "sku", "product", "inventory"],
    roles: ["ADMIN", "WAREHOUSE", "SALES"],
  },
  {
    label: "New Sales Order",
    href: "/sales?new=1",
    icon: ShoppingCart,
    group: "Create",
    keywords: ["add", "order", "quote", "sale", "so"],
    roles: ["ADMIN", "SALES"],
  },
  {
    label: "New Purchase Order",
    href: "/purchasing?new=1",
    icon: ClipboardList,
    group: "Create",
    keywords: ["add", "po", "purchase", "supplier order", "procurement"],
    roles: ["ADMIN", "WAREHOUSE", "ACCOUNTANT"],
  },
  {
    label: "Record Payment",
    href: "/payments?new=1",
    icon: Wallet,
    group: "Create",
    // payments POST also allows SALES, but /payments is ADMIN/ACCOUNTANT-gated;
    // use the stricter route role so the action never dead-ends on a guard.
    keywords: ["add", "receipt", "cash", "collection", "pay"],
    roles: ["ADMIN", "ACCOUNTANT"],
  },
  // Go to — plain navigation; roles = destination route access
  {
    label: "Open Inventory",
    href: "/inventory",
    icon: Package,
    group: "Go to",
    keywords: ["products", "stock", "warehouse"],
  },
  {
    label: "Open AR Ledger",
    href: "/accounting/ledger",
    icon: ClipboardList,
    group: "Go to",
    keywords: ["khata", "receivable", "statement", "accounts receivable"],
    roles: ["ADMIN", "ACCOUNTANT"],
  },
];
