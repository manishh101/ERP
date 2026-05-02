import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

/** Map URL segments to Nepali business module labels */
const labelMap: Record<string, string> = {
  parties: "Showrooms",
  sales: "Sales & Dispatch",
  delivery: "Challans",
  invoicing: "VAT/PAN Bills",
  estimates: "Estimate Bills",
  accounting: "Finance",
  ledger: "Ledger (Khata)",
  vat: "VAT Register",
  inventory: "Inventory",
  purchasing: "Warehouses",
  products: "Products",
  settings: "Settings",
  users: "Users",
  reporting: "Reports",
};

function formatSegment(segment: string): string {
  if (segment.length >= 24) return "Detail"; // Hide CUID/UUID
  return labelMap[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return <p className="text-sm text-muted-foreground">Dashboard</p>;
  }

  const crumbs = segments.map((segment, index) => ({
    label: formatSegment(segment),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <nav className="flex items-center gap-1 text-sm">
      <Link to="/" className="text-muted-foreground transition-colors hover:text-foreground">
        Dashboard
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
          <Link
            to={crumb.href}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {crumb.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}
