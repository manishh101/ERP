import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import type { DashboardStockRow } from "@/types/domain";
import { formatNumber } from "@/lib/utils";

const columns: ColumnDef<DashboardStockRow, unknown>[] = [
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
    cell: ({ row }) => (
      <div className="text-right font-semibold tabular-nums text-red-700">{formatNumber(row.getValue("quantity") as number)}</div>
    ),
  },
];

/** Variants that are fully out of stock. Links to inventory. */
export function OutOfStockTable({ rows }: { rows: DashboardStockRow[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      detailHref={() => "/inventory"}
      pageSize={8}
      searchPlaceholder="Search out of stock..."
      emptyMessage="Nothing out of stock."
    />
  );
}
