import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function FilterBar({
  placeholder,
  filters,
  value,
  onValueChange,
  activeFilter,
  onFilterSelect,
}: {
  placeholder: string;
  filters: string[];
  value?: string;
  onValueChange?: (value: string) => void;
  activeFilter?: string;
  onFilterSelect?: (filter: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex-1">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange?.(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <Button
            key={filter}
            variant={filter === activeFilter ? "default" : "outline"}
            className="bg-white/80"
            onClick={() => onFilterSelect?.(filter)}
          >
            {filter}
          </Button>
        ))}
      </div>
    </div>
  );
}
