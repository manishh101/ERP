import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type DropdownAction } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxInvoicesQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { CreateInvoiceForm } from "@/components/invoicing/create-invoice-form";
import { RecordPaymentForm } from "@/components/invoicing/record-payment-form";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL } from "@/lib/api";
import { Download, FileText } from "lucide-react";
import type { TaxInvoiceRow } from "@/types/domain";

export function InvoicingPage() {
  const { data, error, isLoading } = useTaxInvoicesQuery();
  const { token } = useAuth();
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  const handleDownloadPdf = async (invoiceId: string, type: "invoice" | "estimate" = "invoice") => {
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
        type: type
      }).toString();

      const url = `${baseUrl}/tax-invoices/${invoiceId}/pdf?${queryParams}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to generate secure download link');
    }
  };

  const columns: ColumnDef<TaxInvoiceRow, unknown>[] = [
    { accessorKey: "invoiceNumber", header: "Invoice" },
    { accessorKey: "bsDate", header: "Date (BS)" },
    { accessorKey: "customer", header: "Party" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => formatDate(row.getValue("dueDate")),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums">{formatCurrency(row.getValue("amount") as number)}</div>
      ),
    },
    {
      accessorKey: "balance",
      header: () => <div className="text-right">Balance</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium tabular-nums">{formatCurrency(row.getValue("balance") as number)}</div>
      ),
    },
  ];

  const rowActions = (row: TaxInvoiceRow): DropdownAction<TaxInvoiceRow>[] => [
    {
      label: "Download Tax Invoice",
      icon: <Download className="h-4 w-4" />,
      onClick: (r) => handleDownloadPdf(r.id, "invoice"),
    },
    {
      label: "Download Estimate",
      icon: <FileText className="h-4 w-4" />,
      onClick: (r) => handleDownloadPdf(r.id, "estimate"),
    },
  ];

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">VAT/PAN Bills could not be loaded.</p>
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
        title="VAT/PAN Bills"
        actions={[
          {
            label: createInvoiceOpen ? "Close Form" : "Create Bill",
            onClick: () => {
              setCreateInvoiceOpen(c => !c);
              setRecordPaymentOpen(false);
            }
          },
          {
            label: recordPaymentOpen ? "Close Form" : "Record Payment",
            variant: "outline",
            onClick: () => {
              setRecordPaymentOpen(c => !c);
              setCreateInvoiceOpen(false);
            }
          },
        ]}
      />

      {createInvoiceOpen ? <CreateInvoiceForm onClose={() => setCreateInvoiceOpen(false)} /> : null}
      {recordPaymentOpen ? <RecordPaymentForm onClose={() => setRecordPaymentOpen(false)} /> : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Bill Register</CardTitle>
            <CardDescription>All VAT/PAN bills with payment status.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={data.items}
            columns={columns}
            actions={rowActions}
            searchPlaceholder="Search bills..."
          />
        </CardContent>
      </Card>
    </div>
  );
}
