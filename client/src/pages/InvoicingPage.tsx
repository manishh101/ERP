import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Invoices could not be loaded.</p>
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
        eyebrow="Billing"
        title="Invoicing & Payments"
        description="Create invoices, record payments, and download PDFs."
        actions={[
          {
            label: createInvoiceOpen ? "Close Form" : "Create Invoice",
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
            <CardTitle>Invoice Register</CardTitle>
            <CardDescription>All invoices with payment status and balances.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            rows={data.items}
            detailHref={() => "/invoicing"}
            columns={[
              { key: "invoiceNumber", header: "Invoice" },
              { key: "bsDate", header: "Date (BS)" },
              { key: "customer", header: "Customer" },
              { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
              { key: "dueDate", header: "Due Date", render: (row) => formatDate(row.dueDate) },
              { key: "amount", header: "Total", className: "text-right", render: (row) => formatCurrency(row.amount) },
              { key: "balance", header: "Balance", className: "text-right", render: (row) => formatCurrency(row.balance) },
              { 
                key: "actions", 
                header: "", 
                className: "text-right",
                render: (row) => (
                  <div className="flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      title="Download Tax Invoice PDF"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPdf(row.id, "invoice");
                      }}
                      className="h-8 w-8 p-0 hover:text-green-600"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      title="Download Estimate Bill PDF"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadPdf(row.id, "estimate");
                      }}
                      className="h-8 w-8 p-0 hover:text-blue-600 text-muted-foreground"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                )
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
