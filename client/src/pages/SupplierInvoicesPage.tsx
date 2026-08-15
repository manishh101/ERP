import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, ShoppingCart } from "lucide-react";

import { DataTable, type DropdownAction } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { YearMonthFilter, useYearMonthFilteredRows } from "@/components/shared/year-month-filter";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSupplierInvoicesQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SupplierInvoiceRow } from "@/types/domain";

export function SupplierInvoicesPage() {
  const navigate = useNavigate();
  const { data, error, isLoading } = useSupplierInvoicesQuery();
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const columns: ColumnDef<SupplierInvoiceRow, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "invoiceNumber",
        header: "Supplier Invoice",
        cell: ({ row }) => (
          <span className="font-semibold text-foreground">
            {row.getValue("invoiceNumber")}
          </span>
        ),
      },
      { accessorKey: "supplier", header: "Supplier" },
      {
        accessorKey: "issueDate",
        header: "Bill Date",
        cell: ({ row }) => formatDate(row.getValue("issueDate")),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
      },
      {
        accessorKey: "taxAmount",
        header: () => <div className="text-right">VAT Tax</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.getValue("taxAmount") as number)}
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums">
            {formatCurrency(row.getValue("totalAmount") as number)}
          </div>
        ),
      },
      {
        accessorKey: "balance",
        header: () => <div className="text-right">Balance</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums">
            {formatCurrency(row.getValue("balance") as number)}
          </div>
        ),
      },
    ],
    [],
  );

  const filteredItems = useYearMonthFilteredRows(
    data?.items ?? [],
    (invoice) => invoice.issueDate,
    filterYear,
    filterMonth,
  );

  const rowActions = (invoice: SupplierInvoiceRow): DropdownAction<SupplierInvoiceRow>[] => {
    const actions: DropdownAction<SupplierInvoiceRow>[] = [];

    if (invoice.purchaseOrderId) {
      actions.push({
        label: "View Purchase Order",
        icon: <Eye className="h-4 w-4" />,
        href: (row) => `/purchasing/${row.purchaseOrderId}`,
      });
    }

    actions.push({
      label: "View Supplier",
      icon: <ShoppingCart className="h-4 w-4" />,
      href: (row) => `/suppliers/${row.supplierId}`,
    });

    return actions;
  };

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Supplier invoices could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier Invoice"
        actions={[
          {
            label: "Open Purchase Orders",
            variant: "outline",
            onClick: () => navigate("/purchasing"),
          },
        ]}
      />

      <div className="flex items-center justify-end gap-3 flex-wrap">
        <YearMonthFilter
          year={filterYear}
          month={filterMonth}
          onYearChange={(y) => { setFilterYear(y); setFilterMonth(""); }}
          onMonthChange={setFilterMonth}
        />
        {(filterYear || filterMonth) && (
          <button
            onClick={() => { setFilterYear(""); setFilterMonth(""); }}
            className="text-xs text-muted-foreground underline hover:text-foreground"
          >
            Clear filter
          </button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Bill Register</CardTitle>
          <CardDescription>
            Supplier VAT bills recorded during goods receipt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredItems}
            columns={columns}
            actions={rowActions}
            onRowClick={(row) => {
              if (row.purchaseOrderId) navigate(`/purchasing/${row.purchaseOrderId}`);
            }}
            searchPlaceholder="Search supplier invoices..."
            emptyMessage="No supplier invoices found."
          />
        </CardContent>
      </Card>
    </div>
  );
}
