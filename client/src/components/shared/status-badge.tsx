import { Badge, type BadgeVariant } from "@/components/ui/badge";

const statusMap: Record<string, BadgeVariant> = {
  delivered: "success",
  paid: "success",
  received: "success",
  active: "success",
  completed: "success",
  confirmed: "success",

  pending: "warning",
  partial: "warning",
  processing: "warning",
  deposit_paid: "warning",
  in_warehouse: "warning",
  quote: "warning",
  draft: "warning",

  overdue: "destructive",
  failed: "destructive",
  cancelled: "destructive",
  low: "destructive",
  void: "destructive",
};

function getVariantForStatus(status: string): BadgeVariant {
  const normalized = status.toLowerCase().replace(/\s+/g, "_");

  for (const [key, variant] of Object.entries(statusMap)) {
    if (normalized.includes(key)) return variant;
  }

  return "secondary";
}

export function StatusBadge({ value }: { value: string }) {
  return <Badge variant={getVariantForStatus(value)}>{value}</Badge>;
}
