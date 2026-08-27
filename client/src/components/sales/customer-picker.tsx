import { useState, useMemo, useRef, useEffect } from "react";
import { Search, UserCheck, AlertTriangle, Building2, User, Phone, MapPin, X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, toNumber } from "@/lib/utils";
import type { RawCustomer } from "@/hooks/use-queries";

interface CustomerPickerProps {
  customers: RawCustomer[];
  selectedId: string;
  onSelect: (id: string) => void;
  onAddNew?: () => void;
  isLoading?: boolean;
}

export function CustomerPicker({
  customers,
  selectedId,
  onSelect,
  onAddNew,
  isLoading = false,
}: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedId);
  }, [customers, selectedId]);

  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.panNo && c.panNo.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q))
    );
  }, [customers, query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      {selectedCustomer ? (
        /* Selected Customer Card View */
        <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.02] p-4 shadow-sm transition-all hover:border-primary/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Left info */}
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-base shadow-inner">
                {selectedCustomer.type === "SHOWROOM" ? (
                  <Building2 className="h-5 w-5 text-primary" />
                ) : (
                  <User className="h-5 w-5 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base text-foreground truncate">
                    {selectedCustomer.name}
                  </h3>
                  <Badge
                    variant="outline"
                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 ${
                      selectedCustomer.type === "SHOWROOM"
                        ? "bg-purple-500/10 text-purple-700 border-purple-300 dark:text-purple-300"
                        : "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300"
                    }`}
                  >
                    {selectedCustomer.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {selectedCustomer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedCustomer.phone}
                    </span>
                  )}
                  {(selectedCustomer.district || selectedCustomer.address) && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {[selectedCustomer.district, selectedCustomer.address].filter(Boolean).join(", ")}
                    </span>
                  )}
                  {selectedCustomer.panNo && (
                    <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                      PAN: {selectedCustomer.panNo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial context & Change Action */}
            <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-border/60 pt-2 sm:pt-0 sm:pl-4 shrink-0">
              <div className="text-left sm:text-right space-y-0.5">
                <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  AR Balance
                </div>
                <div
                  className={`font-bold text-sm ${
                    toNumber(selectedCustomer.outstandingBalance) > toNumber(selectedCustomer.creditLimit) && toNumber(selectedCustomer.creditLimit) > 0
                      ? "text-rose-600 dark:text-rose-400 flex items-center gap-1"
                      : toNumber(selectedCustomer.outstandingBalance) > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {toNumber(selectedCustomer.outstandingBalance) > toNumber(selectedCustomer.creditLimit) && toNumber(selectedCustomer.creditLimit) > 0 && (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  )}
                  {formatCurrency(toNumber(selectedCustomer.outstandingBalance))}
                </div>
                {toNumber(selectedCustomer.creditLimit) > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    Limit: {formatCurrency(toNumber(selectedCustomer.creditLimit))}
                  </div>
                )}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-3 rounded-lg border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors text-xs"
                onClick={() => {
                  onSelect("");
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Change
              </Button>
            </div>
          </div>

          {/* Over Credit Limit Warning Alert */}
          {toNumber(selectedCustomer.creditLimit) > 0 &&
            toNumber(selectedCustomer.outstandingBalance) > toNumber(selectedCustomer.creditLimit) && (
              <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 text-xs text-rose-700 dark:text-rose-300">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>
                  <strong>Credit Warning:</strong> Outstanding balance exceeds credit limit by{" "}
                  {formatCurrency(
                    toNumber(selectedCustomer.outstandingBalance) - toNumber(selectedCustomer.creditLimit)
                  )}.
                </span>
              </div>
            )}
        </div>
      ) : (
        /* Search Combobox Input */
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder={isLoading ? "Loading customers..." : "Search customer by name, phone, PAN, location..."}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="pl-10 pr-24 h-12 rounded-xl bg-background border-border/80 text-sm shadow-xs focus-visible:ring-primary/20"
            />
            {onAddNew && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onAddNew}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg px-2.5"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                New Party
              </Button>
            )}
          </div>

          {/* Dropdown Options List */}
          {isOpen && (
            <div className="absolute z-50 mt-1.5 w-full max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl divide-y divide-border/40 backdrop-blur-md">
              {filteredCustomers.length === 0 ? (
                <div className="py-6 px-4 text-center">
                  <p className="text-sm text-muted-foreground font-medium">No matching customers found</p>
                  {onAddNew && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsOpen(false);
                        onAddNew();
                      }}
                      className="mt-2 text-xs text-primary"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Create &quot;{query}&quot; as new customer
                    </Button>
                  )}
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const balance = toNumber(c.outstandingBalance);
                  const limit = toNumber(c.creditLimit);
                  const isOverLimit = limit > 0 && balance > limit;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelect(c.id);
                        setIsOpen(false);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left rounded-lg hover:bg-muted/70 transition-colors group"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {c.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              c.type === "SHOWROOM"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                            }`}
                          >
                            {c.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          {c.phone && <span>{c.phone}</span>}
                          {[c.district, c.address].filter(Boolean).length > 0 && (
                            <span className="truncate max-w-[180px]">
                              {[c.district, c.address].filter(Boolean).join(", ")}
                            </span>
                          )}
                          {c.panNo && <span className="font-mono text-[10px]">PAN: {c.panNo}</span>}
                        </div>
                      </div>

                      {/* Financial info */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-semibold ${
                            isOverLimit
                              ? "text-rose-600 dark:text-rose-400"
                              : balance > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          Bal: {formatCurrency(balance)}
                        </div>
                        {limit > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            Limit: {formatCurrency(limit)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
