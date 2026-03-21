import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function Breadcrumbs() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  const crumbs = segments.map((segment, index) => ({
    label: segment.replace(/-/g, " "),
    href: `/${segments.slice(0, index + 1).join("/")}`,
  }));

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
      <Link to="/" className="hover:text-foreground">
        Dashboard
      </Link>
      {crumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4" />
          <Link to={crumb.href} className="capitalize hover:text-foreground">
            {crumb.label}
          </Link>
        </div>
      ))}
    </div>
  );
}
