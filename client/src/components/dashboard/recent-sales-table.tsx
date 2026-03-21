import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { DashboardRecentSalesOrder } from "@/types/domain";
import { formatCurrency, formatDate } from "@/lib/utils";

export function RecentSalesTable({ rows }: { rows: DashboardRecentSalesOrder[] }) {
  return (
    <DataTable
      rows={rows}
      detailHref={() => "/sales"}
      columns={[
        { key: "id", header: "Order" },
        { key: "customer", header: "Customer" },
        { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
        { key: "deliveryDate", header: "Delivery", render: (row) => formatDate(row.deliveryDate) },
        { key: "total", header: "Total", className: "text-right", render: (row) => formatCurrency(row.total) },
      ]}
    />
  );
}
