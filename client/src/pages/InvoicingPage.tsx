import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoicesQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { CreateInvoiceForm } from "@/components/invoicing/create-invoice-form";
import { RecordPaymentForm } from "@/components/invoicing/record-payment-form";

export function InvoicingPage() {
  const { data, error, isLoading } = useInvoicesQuery();
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

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
        eyebrow="Module 5"
        title="Invoicing & Payments"
        description="Generate sequenced invoices from confirmed sales orders, capture partial payments, manage overdue alerts, and prepare invoice and receipt PDFs."
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
          { label: "Bulk Send", variant: "outline" },
        ]}
      />

      {createInvoiceOpen ? <CreateInvoiceForm onClose={() => setCreateInvoiceOpen(false)} /> : null}
      {recordPaymentOpen ? <RecordPaymentForm onClose={() => setRecordPaymentOpen(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invoice Register</CardTitle>
              <CardDescription>Auto-generated numbering, payment status, and balance tracking.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={data.items}
              detailHref={() => "/invoicing"}
              columns={[
                { key: "invoiceNumber", header: "Invoice" },
                { key: "customer", header: "Customer" },
                { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
                { key: "dueDate", header: "Due Date", render: (row) => formatDate(row.dueDate) },
                { key: "amount", header: "Total", className: "text-right", render: (row) => formatCurrency(row.amount) },
                { key: "balance", header: "Balance", className: "text-right", render: (row) => formatCurrency(row.balance) },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Billing Controls</CardTitle>
              <CardDescription>Payment terms, overdue thresholds, bank details, and PDF output scaffolding.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Invoice numbering", "INV-2026-0001 sequence pattern"],
              ["Partial payments", "Cash, card, bank transfer, and installment plan supported"],
              ["Overdue alerts", "7, 14, and 30 day notifications configurable"],
              ["Receipt PDFs", "React-PDF output prepared for receipts and customer invoices"],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
            <Button className="w-full">Preview Invoice PDF</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
