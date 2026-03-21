import { Badge } from "@/components/ui/badge";

export function StatusBadge({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone =
    normalized.includes("delivered") ||
    normalized.includes("paid") ||
    normalized.includes("received") ||
    normalized.includes("active")
      ? "green"
      : normalized.includes("overdue") ||
          normalized.includes("failed") ||
          normalized.includes("cancelled") ||
          normalized.includes("low")
        ? "red"
        : "amber";

  return <Badge tone={tone}>{value}</Badge>;
}

