import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DashboardRecentSalesOrder } from "@/types/domain";
import { formatCurrency, formatDate } from "@/lib/utils";

const columns: ColumnDef<DashboardRecentSalesOrder, unknown>[] = [
  { accessorKey: "id", header: "Order" },
  { accessorKey: "customer", header: "Party" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
  },
  {
    accessorKey: "deliveryDate",
    header: "Delivery",
    cell: ({ row }) => formatDate(row.getValue("deliveryDate")),
  },
  {
    accessorKey: "total",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{formatCurrency(row.getValue("total") as number)}</div>
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
