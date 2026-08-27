import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import type { DashboardLowStockRow } from "@/types/domain";
import { cn, formatNumber } from "@/lib/utils";

const columns: ColumnDef<DashboardLowStockRow, unknown>[] = [
  {
    accessorKey: "product",
    header: "Product",
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("product") as string}</span>,
  },
  {
    accessorKey: "variant",
    header: "Variant",
    cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.getValue("variant") as string}</span>,
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">In stock</div>,
    cell: ({ row }) => {
      const quantity = row.getValue("quantity") as number;
      return (
        <div className={cn("text-right tabular-nums font-semibold", quantity <= 0 ? "text-red-700" : "text-amber-700")}>
          {formatNumber(quantity)}
        </div>
      );
    },
  },
  {
    accessorKey: "threshold",
    header: () => <div className="text-right">Threshold</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-muted-foreground">{formatNumber(row.getValue("threshold") as number)}</div>
    ),
  },
];

/** Variants at or below their low-stock threshold. Links to inventory. */
export function LowStockTable({ rows }: { rows: DashboardLowStockRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      detailHref={() => "/inventory"}
      pageSize={8}
      searchPlaceholder="Search low stock..."
      emptyMessage="No items below threshold."
    />
  );
}
