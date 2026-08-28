import type { ColumnDef } from "@tanstack/react-table";
import { DataTable, type DropdownAction } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTaxInvoicesQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState, useMemo } from "react";
import { CreateInvoiceForm } from "@/components/invoicing/create-invoice-form";
import { RecordPaymentForm } from "@/components/invoicing/record-payment-form";
import { TaxInvoiceDetailModal } from "@/components/invoicing/tax-invoice-detail-modal";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL } from "@/lib/api";
import { Download, Eye, ShieldAlert, FileCheck, Receipt, DollarSign, RefreshCw } from "lucide-react";
import { YearMonthFilter, useYearMonthFilteredRows } from "@/components/shared/year-month-filter";
import type { TaxInvoiceRow } from "@/types/domain";
import { Input } from "@/components/ui/input";

export function InvoicingPage() {
  const { data, error, isLoading } = useTaxInvoicesQuery();
  const { token } = useAuth();
  
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [invoiceTypeFilter, setInvoiceTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  const handleDownloadPdf = async (invoiceId: string, type: "invoice" | "estimate" = "invoice") => {
    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/auth/download-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to get download token");
      const { token: downloadToken } = await response.json();

      const queryParams = new URLSearchParams({
        token: downloadToken,
        type: type,
      }).toString();

      const url = `${baseUrl}/tax-invoices/${invoiceId}/pdf?${queryParams}`;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Download error:", err);
      alert("Failed to generate secure download link");
    }
  };

  // Filtering pipeline
  const yearMonthFiltered = useYearMonthFilteredRows(
    data?.items ?? [],
    (invoice) => invoice.bsDate,
    filterYear,
    filterMonth,
  );

  const filteredItems = useMemo(() => {
    return yearMonthFiltered.filter((inv) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNum = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesCust = inv.customer.toLowerCase().includes(q);
        if (!matchesNum && !matchesCust) return false;
      }
      // Invoice Type
      if (invoiceTypeFilter && inv.invoiceType !== invoiceTypeFilter) {
        return false;
      }
      // Status
      if (statusFilter && inv.status.toUpperCase() !== statusFilter.toUpperCase()) {
        return false;
      }
      return true;
    });
  }, [yearMonthFiltered, searchQuery, invoiceTypeFilter, statusFilter]);

  // Financial KPI totals
  const totals = useMemo(() => {
    return filteredItems.reduce(
      (acc, inv) => {
        acc.taxable += inv.taxableAmount || (inv.amount - (inv.taxAmount || 0));
        acc.vat += inv.taxAmount || 0;
        acc.grandTotal += inv.amount || 0;
        return acc;
      },
      { taxable: 0, vat: 0, grandTotal: 0 },
    );
  }, [filteredItems]);

  const columns: ColumnDef<TaxInvoiceRow, unknown>[] = [
    {
      accessorKey: "invoiceNumber",
      header: "Invoice No",
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedInvoiceId(row.original.id)}
          className="font-mono text-xs font-semibold text-primary hover:underline text-left"
        >
          {row.original.invoiceNumber}
        </button>
      ),
    },
    {
      accessorKey: "invoiceType",
      header: "Type",
      cell: ({ row }) => (
        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
          {row.original.invoiceType}
        </span>
      ),
    },
    { accessorKey: "bsDate", header: "Date (BS)" },
    { accessorKey: "customer", header: "Party / Customer" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
    },
    {
      accessorKey: "taxableAmount",
      header: () => <div className="text-right">Taxable Subtotal</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-xs font-medium">
          {formatCurrency(row.original.taxableAmount)}
        </div>
      ),
    },
    {
      accessorKey: "taxAmount",
      header: () => <div className="text-right">VAT (13%)</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums text-xs font-semibold text-emerald-600">
          {formatCurrency(row.original.taxAmount)}
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Grand Total</div>,
      cell: ({ row }) => (
        <div className="text-right tabular-nums font-bold text-primary">
          {formatCurrency(row.getValue("amount") as number)}
        </div>
      ),
    },
  ];

  const rowActions = (row: TaxInvoiceRow): DropdownAction<TaxInvoiceRow>[] => [
    {
      label: "View Details",
      icon: <Eye className="h-4 w-4" />,
      onClick: (r) => setSelectedInvoiceId(r.id),
    },
    {
      label: "Download Tax Invoice PDF",
      icon: <Download className="h-4 w-4" />,
      onClick: (r) => handleDownloadPdf(r.id, r.invoiceType === "ESTIMATE" ? "estimate" : "invoice"),
    },
  ];

  if (isLoading) {
    return <Skeleton className="h-[420px] rounded-2xl" />;
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-destructive/20 bg-destructive/5">
        <CardContent className="py-10">
          <p className="font-semibold text-destructive">VAT/PAN Bills could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  const hasActiveFilters = Boolean(searchQuery || invoiceTypeFilter || statusFilter || filterYear || filterMonth);

  return (
    <div className="space-y-6">
      <PageHeader
        title="VAT/PAN Bills & Invoicing"
        actions={[
          {
            label: createInvoiceOpen ? "Close Form" : "Create Tax Bill",
            onClick: () => {
              setCreateInvoiceOpen((c) => !c);
              setRecordPaymentOpen(false);
            },
          },
          {
            label: recordPaymentOpen ? "Close Form" : "Record Payment",
            variant: "outline",
            onClick: () => {
              setRecordPaymentOpen((c) => !c);
              setCreateInvoiceOpen(false);
            },
          },
        ]}
      />

      {/* Forms */}
      {createInvoiceOpen ? <CreateInvoiceForm onClose={() => setCreateInvoiceOpen(false)} /> : null}
      {recordPaymentOpen ? <RecordPaymentForm onClose={() => setRecordPaymentOpen(false)} /> : null}

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Taxable Subtotal
              </p>
              <p className="text-xl font-display font-bold text-foreground mt-1">
                {formatCurrency(totals.taxable)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Output VAT (13%)
              </p>
              <p className="text-xl font-display font-bold text-emerald-600 mt-1">
                {formatCurrency(totals.vat)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <FileCheck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Grand Total Invoiced
              </p>
              <p className="text-xl font-display font-bold text-primary mt-1">
                {formatCurrency(totals.grandTotal)}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border bg-card shadow-sm">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Total Bills
              </p>
              <p className="text-xl font-display font-bold text-foreground mt-1">
                {filteredItems.length}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AR vs VAT Separation Compliance Notice */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold text-primary">
            Statutory Accounting Invariant &mdash; IRD Nepal Compliance:
          </p>
          <p className="text-muted-foreground leading-relaxed">
            These Tax Invoices and VAT Registers represent official statutory legal compliance figures under Inland Revenue Department (IRD Nepal) regulations. Commercial receivables, customer balances, and line item transactions are managed independently through the Sales Order and AR Khata Ledger.
          </p>
        </div>
      </div>

      {/* Multi-faceted Filters */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span>Filter Invoices & Bills</span>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setInvoiceTypeFilter("");
                  setStatusFilter("");
                  setFilterYear("");
                  setFilterMonth("");
                }}
                className="text-xs font-normal text-muted-foreground hover:text-foreground flex items-center gap-1 underline"
              >
                <RefreshCw className="h-3 w-3" /> Reset Filters
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Search Invoice / Customer
            </label>
            <Input
              placeholder="Search by invoice # or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          {/* Invoice Type */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Invoice Type
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-border bg-white px-3 text-xs"
              value={invoiceTypeFilter}
              onChange={(e) => setInvoiceTypeFilter(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="VAT">VAT Invoice (कर बिजक)</option>
              <option value="PAN">PAN Invoice (बिजक)</option>
              <option value="ESTIMATE">Estimate Bill (अनुमानित बिल)</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1 sm:col-span-1 lg:col-span-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Status
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-border bg-white px-3 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="PAID">PAID</option>
            </select>
          </div>

          {/* Year/Month */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2 min-w-0">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase block">
              BS Period Filter
            </label>
            <YearMonthFilter
              year={filterYear}
              month={filterMonth}
              onYearChange={(y) => {
                setFilterYear(y);
                setFilterMonth("");
              }}
              onMonthChange={setFilterMonth}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bill Register Table */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bill Register</CardTitle>
              <CardDescription>
                Official VAT/PAN tax bills issued to customers with payment compliance tracking.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredItems}
            columns={columns}
            actions={rowActions}
            searchPlaceholder="Filter items in view..."
          />
        </CardContent>
      </Card>

      {/* Invoice Detail Slide-over / Modal */}
      <TaxInvoiceDetailModal
        invoiceId={selectedInvoiceId}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </div>
  );
}
