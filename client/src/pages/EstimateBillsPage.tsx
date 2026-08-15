import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type DropdownAction } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useEstimateBillsQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { CreateInvoiceForm } from "@/components/invoicing/create-invoice-form";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL } from "@/lib/api";
import { Download } from "lucide-react";
import { YearMonthFilter, useYearMonthFilteredRows } from "@/components/shared/year-month-filter";
import type { TaxInvoiceRow } from "@/types/domain";

export function EstimateBillsPage() {
  const { data, error, isLoading } = useEstimateBillsQuery();
  const { token } = useAuth();
  const [createEstimateOpen, setCreateEstimateOpen] = useState(false);
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/auth/download-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to get download token');
      const { token: downloadToken } = await response.json();
 
      const queryParams = new URLSearchParams({
        token: downloadToken,
        type: "estimate"
      }).toString();

      const url = `${baseUrl}/tax-invoices/${invoiceId}/pdf?${queryParams}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to generate secure download link');
    }
  };

  const columns: ColumnDef<TaxInvoiceRow, unknown>[] = [
    { accessorKey: "invoiceNumber", header: "Estimate No." },
    { accessorKey: "bsDate", header: "Date (BS)" },
    { accessorKey: "customer", header: "Party" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{formatCurrency(row.getValue("amount") as number)}</div>
      ),
    },
  ];

  const filteredItems = useYearMonthFilteredRows(
    data?.items ?? [],
    (invoice) => invoice.bsDate,
    filterYear,
    filterMonth,
  );

  const rowActions = (row: TaxInvoiceRow): DropdownAction<TaxInvoiceRow>[] => [
    {
      label: "Download Estimate",
      icon: <Download className="h-4 w-4" />,
      onClick: (r) => handleDownloadPdf(r.id),
    },
  ];

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Estimate bills could not be loaded.</p>
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
        title="Estimate Bills"
        actions={[
          {
            label: createEstimateOpen ? "Close Form" : "Create Estimate",
            onClick: () => setCreateEstimateOpen(c => !c),
          },
        ]}
      />

      {createEstimateOpen ? (
        <CreateInvoiceForm
          onClose={() => setCreateEstimateOpen(false)}
          defaultInvoiceType="ESTIMATE"
        />
      ) : null}

      <div className="flex items-center gap-3 flex-wrap">
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
          <div>
            <CardTitle>Estimate Register</CardTitle>
            <CardDescription>All estimate bills issued to customers.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredItems}
            columns={columns}
            actions={rowActions}
            searchPlaceholder="Search estimates..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
