import { useEffect, useDeferredValue, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  Package,
  Receipt,
  Search,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useSearchQuery } from "@/hooks/use-queries";
import type { SearchResult } from "@/types/domain";

const RECENT_SEARCH_KEY = "myerp:recent-global-search-results";
const MIN_SEARCH_LENGTH = 2;

const quickLinks: SearchResult[] = [
  { type: "Workspace", label: "Dashboard", href: "/", meta: "Overview" },
  { type: "Workspace", label: "Sales", href: "/sales", meta: "Orders" },
  { type: "Workspace", label: "Purchasing", href: "/purchasing", meta: "Purchase orders" },
  { type: "Workspace", label: "Inventory", href: "/inventory", meta: "Products" },
  { type: "Workspace", label: "Payments", href: "/payments", meta: "Cash flow" },
  { type: "Workspace", label: "Reporting", href: "/reporting", meta: "Reports" },
];

function loadRecentResults() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(RECENT_SEARCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) as SearchResult[] : [];
  } catch {
    return [];
  }
}

function getGroupHeading(type: string) {
  const headings: Record<string, string> = {
    Product: "Products",
    Customer: "Customers",
    Supplier: "Suppliers",
    Invoice: "Tax Invoices",
    "Supplier Bill": "Supplier Bills",
    "Sales Order": "Sales Orders",
    "Purchase Order": "Purchase Orders",
    Payment: "Payments",
    Workspace: "Workspace",
  };

  return headings[type] ?? `${type}s`;
}

function iconForType(type: string) {
  switch (type) {
    case "Product":
      return <Package className="h-4 w-4" />;
    case "Customer":
      return <Building2 className="h-4 w-4" />;
    case "Supplier":
      return <Users className="h-4 w-4" />;
    case "Invoice":
      return <Receipt className="h-4 w-4" />;
    case "Supplier Bill":
      return <FileText className="h-4 w-4" />;
    case "Sales Order":
    case "Purchase Order":
      return <ShoppingCart className="h-4 w-4" />;
    case "Payment":
      return <CreditCard className="h-4 w-4" />;
    case "Delivery":
      return <Truck className="h-4 w-4" />;
    default:
      return <Search className="h-4 w-4" />;
  }
}

function resultValue(item: SearchResult) {
  return [item.label, item.meta, item.description, ...(item.keywords ?? [])]
    .filter(Boolean)
    .join(" ");
}

function SearchResultRow({ item, recent = false }: { item: SearchResult; recent?: boolean }) {
  return (
    <>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
        {recent ? <Clock3 className="h-4 w-4" /> : iconForType(item.type)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{item.label}</span>
          <span className="shrink-0 rounded border bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {item.type}
          </span>
        </div>
        {(item.meta || item.description) && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[item.meta, item.description].filter(Boolean).join(" - ")}
          </p>
        )}
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-data-[selected=true]:opacity-100" />
    </>
  );
}

export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const [recentResults, setRecentResults] = useState<SearchResult[]>(loadRecentResults);
  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = search.trim();
  const deferredNormalizedSearch = deferredSearch.trim();
  const queryEnabled = deferredNormalizedSearch.length >= MIN_SEARCH_LENGTH;
  const { data: results = [], isFetching, isError } = useSearchQuery(deferredSearch);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange]);

  const visibleGroups = useMemo(() => {
    return results.reduce<Record<string, SearchResult[]>>((acc, result) => {
      const group = result.type;
      if (!acc[group]) acc[group] = [];
      acc[group].push(result);
      return acc;
    }, {});
  }, [results]);

  const persistRecent = useCallback((item: SearchResult) => {
    setRecentResults((current) => {
      const next = [item, ...current.filter((existing) => existing.href !== item.href)].slice(0, 6);
      try {
        window.localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(next));
      } catch {
        // Local storage is optional; search selection should never fail because of it.
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (item: SearchResult) => {
      persistRecent(item);
      onOpenChange(false);
      setSearch("");
      navigate(item.href);
    },
    [navigate, onOpenChange, persistRecent],
  );

  const showDiscovery = normalizedSearch.length < MIN_SEARCH_LENGTH;
  const hasResults = Object.keys(visibleGroups).length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="border-b bg-muted/20">
        <CommandInput
          placeholder="Search orders, parties, products, bills, payments..."
          value={search}
          onValueChange={setSearch}
          className="h-14 text-base"
        />
        <div className="flex items-center justify-between px-4 pb-3 text-xs text-muted-foreground">
          <span>{queryEnabled ? `${results.length} results` : "Global search"}</span>
          {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        </div>
      </div>

      <CommandList className="max-h-[470px] px-2 py-2">
        {!showDiscovery && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-2 py-6 text-sm text-muted-foreground">
              {isFetching ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : isError ? (
                <span>Search could not be completed.</span>
              ) : (
                <span>No results found.</span>
              )}
            </div>
          </CommandEmpty>
        )}

        {showDiscovery && recentResults.length > 0 && (
          <CommandGroup heading="Recent">
            {recentResults.map((item) => (
              <CommandItem
                key={`recent-${item.href}`}
                value={resultValue(item)}
                onSelect={() => handleSelect(item)}
                className="group gap-3 rounded-md px-2 py-2.5"
              >
                <SearchResultRow item={item} recent />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showDiscovery && recentResults.length > 0 && <CommandSeparator className="my-2" />}

        {showDiscovery && (
          <CommandGroup heading="Quick Links">
            {quickLinks.map((item) => (
              <CommandItem
                key={item.href}
                value={resultValue(item)}
                onSelect={() => handleSelect(item)}
                className="group gap-3 rounded-md px-2 py-2.5"
              >
                <SearchResultRow item={item} />
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!showDiscovery && hasResults && Object.entries(visibleGroups).map(([type, items], index) => (
          <CommandGroup key={type} heading={getGroupHeading(type)} className={index > 0 ? "pt-2" : undefined}>
            {items.map((item) => (
              <CommandItem
                key={`${item.type}-${item.href}-${item.label}`}
                value={resultValue(item)}
                onSelect={() => handleSelect(item)}
                className="group gap-3 rounded-md px-2 py-2.5"
              >
                <SearchResultRow item={item} />
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
