import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DashboardRecentSalesOrder } from "@/types/domain";
import { formatCurrency, formatDate, formatEnumLabel } from "@/lib/utils";

const columns: ColumnDef<DashboardRecentSalesOrder, unknown>[] = [
  { accessorKey: "id", header: "Order", cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("id") as string}</span> },
  {
    accessorKey: "customer",
    header: "Party",
    cell: ({ row }) => <span className="font-medium text-foreground">{row.getValue("customer") as string}</span>
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={formatEnumLabel(row.getValue("status") as string)} />,
  },
  {
    accessorKey: "deliveryDate",
    header: "Delivery",
    cell: ({ row }) => <span className="text-sm">{formatDate(row.getValue("deliveryDate"))}</span>,
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums font-bold text-foreground">{formatCurrency(row.getValue("total") as number)}</div>
    ),
  },
];

export function RecentSalesTable({ rows }: { rows: DashboardRecentSalesOrder[] }) {
  return (
    <DataTable
      data={rows}
      columns={columns}
      detailHref={() => "/sales"}
      pageSize={5}
      searchPlaceholder="Search recent orders..."
    />
  );
}
