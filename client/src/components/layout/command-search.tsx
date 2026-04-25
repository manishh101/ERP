import { useEffect, useDeferredValue, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Package, Receipt, ShoppingCart } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useSearchQuery } from "@/hooks/use-queries";

export function CommandSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const { data: results = [] } = useSearchQuery(deferredSearch);
  const navigate = useNavigate();

  // Cmd+K keyboard shortcut
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

  const handleSelect = useCallback(
    (href: string) => {
      onOpenChange(false);
      setSearch("");
      navigate(href);
    },
    [navigate, onOpenChange],
  );

  const iconForType = (type: string) => {
    switch (type.toLowerCase()) {
      case "product":
        return <Package className="mr-2 h-4 w-4 text-muted-foreground" />;
      case "customer":
        return <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />;
      case "invoice":
        return <Receipt className="mr-2 h-4 w-4 text-muted-foreground" />;
      case "order":
        return <ShoppingCart className="mr-2 h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  // Group results by type
  const grouped = results.reduce<Record<string, typeof results>>((acc, result) => {
    const group = result.type;
    if (!acc[group]) acc[group] = [];
    acc[group].push(result);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search parties, orders, products, bills..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(grouped).map(([type, items]) => (
          <CommandGroup key={type} heading={type + "s"}>
            {items.map((item) => (
              <CommandItem
                key={`${item.type}-${item.label}`}
                value={item.label}
                onSelect={() => handleSelect(item.href)}
              >
                {iconForType(item.type)}
                <span>{item.label}</span>
                {item.meta && (
                  <span className="ml-auto text-xs text-muted-foreground">{item.meta}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
