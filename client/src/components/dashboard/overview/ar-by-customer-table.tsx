import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import type { DashboardArCustomerRow } from "@/types/domain";
import { cn, formatCurrency, formatEnumLabel } from "@/lib/utils";

type Row = DashboardArCustomerRow & { id: string };

const columns: ColumnDef<Row, unknown>[] = [
  {
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("customerName") as string}</span>,
  },
  {
    accessorKey: "customerType",
    header: "Type",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">{formatEnumLabel(row.getValue("customerType") as string)}</span>
    ),
  },
  {
    accessorKey: "bucket90_plus",
    header: () => <div className="text-right">90+ days</div>,
    cell: ({ row }) => {
      const value = row.getValue("bucket90_plus") as number;
      return (
        <div className={cn("text-right tabular-nums", value > 0 ? "font-semibold text-red-700" : "text-muted-foreground")}>
          {formatCurrency(value)}
        </div>
      );
    },
  },
  {
    accessorKey: "totalOutstanding",
    header: () => <div className="text-right">Outstanding</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold tabular-nums text-foreground">
        {formatCurrency(row.getValue("totalOutstanding") as number)}
      </div>
    ),
  },
];

/** Outstanding AR by customer (commercial balance). Links to the AR ledger. */
export function ArByCustomerTable({ rows }: { rows: DashboardArCustomerRow[] }) {
  const data: Row[] = rows.map((row) => ({ ...row, id: row.customerId }));

  return (
    <DataTable
      data={data}
      columns={columns}
      detailHref={() => "/accounting/ledger"}
      pageSize={8}
      searchPlaceholder="Search customers..."
      emptyMessage="No outstanding receivables."
    />
  );
}
