import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Download, Plus, Search, Wallet } from "lucide-react";
import { usePaymentsQuery, useSalesOrdersQuery, useSupplierInvoicesQuery, useRecordPaymentMutation } from "@/hooks/use-queries";
import type { PaymentCreatePayload } from "@/hooks/use-queries";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { YearMonthFilter } from "@/components/shared/year-month-filter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import type { PaymentRow, SalesOrderRow, SupplierInvoiceRow } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL, getErrorMessage } from "@/lib/api";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const { data, isLoading } = usePaymentsQuery(page, 500, search, filterYear, filterMonth);
  const { token } = useAuth();
  const [recordOpen, setRecordOpen] = useState(false);
  // Auto-open the record-payment sheet when navigated here from the Ctrl+K "Record Payment" command.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setRecordOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDownloadReceipt = (paymentId: string) => {
    window.open(`${API_BASE_URL}/payments/${paymentId}/receipt?token=${token}`, "_blank");
  };

  const columns: ColumnDef<PaymentRow, any>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div>
            <div className="font-medium">{formatDate(item.date)}</div>
            <div className="text-xs text-muted-foreground">{item.bsDate}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "relatedEntity",
      header: "Related Record",
      cell: ({ row }) => (
        <span className="font-medium text-primary">
          {row.original.relatedEntity}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-semibold tabular-nums">
          {formatCurrency(row.original.amount)}
        </div>
      ),
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="secondary" className="capitalize">
          {row.original.method.toLowerCase().replace("_", " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "reference",
      header: "Reference",
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadReceipt(row.original.id);
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            title="Download Receipt"
          >
            <Download className="h-3.5 w-3.5" />
            Receipt
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        actions={[
          {
            label: "Record Payment",
            onClick: () => setRecordOpen(true),
          },
        ]}
      />

      <div className="flex items-center justify-end gap-3 flex-wrap mb-2">
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

      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={data?.items || []}
          isLoading={isLoading}
          emptyMessage="No payments found. Click 'Record Payment' to add one."
          searchPlaceholder="Search by reference or customer..."
          pageSize={50}
        />
      </div>

      {/* Record Payment Sheet */}
      <Sheet open={recordOpen} onOpenChange={setRecordOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Record Payment</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <RecordPaymentInline
              onClose={() => setRecordOpen(false)}
              onDownloadReceipt={handleDownloadReceipt}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ─── Inline Record Payment Form ─────────────────────────────────────────── */

function RecordPaymentInline({
  onClose,
  onDownloadReceipt,
}: {
  onClose: () => void;
  onDownloadReceipt: (id: string) => void;
}) {
  const recordPayment = useRecordPaymentMutation();
  const salesOrders = useSalesOrdersQuery();
  const supplierInvoices = useSupplierInvoicesQuery();

  const [paymentType, setPaymentType] = useState<"CUSTOMER" | "SUPPLIER">("CUSTOMER");
  const [createdPaymentId, setCreatedPaymentId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    salesOrderId: "",
    supplierInvoiceId: "",
    amount: "",
    method: "CASH",
    paymentDate: new Date().toISOString().split("T")[0],
    reference: `PAY-${Date.now().toString().slice(-6)}`,
    note: "",
  });

  const selectedOrder = salesOrders.data?.items.find(
    (o) => o.id === formData.salesOrderId,
  );

  const selectedInvoice = supplierInvoices.data?.items.find(
    (inv) => inv.id === formData.supplierInvoiceId,
  );

  const handleSubmit = async () => {
    if (paymentType === "CUSTOMER" && (!formData.salesOrderId || !formData.amount)) {
      toast("Validation failed", {
        description: "Please select a sales order and enter a payment amount.",
      });
      return;
    }

    if (paymentType === "SUPPLIER" && (!formData.supplierInvoiceId || !formData.amount)) {
      toast("Validation failed", {
        description: "Please select a supplier invoice and enter a payment amount.",
      });
      return;
    }

    try {
      const payload: PaymentCreatePayload = {
        salesOrderId: paymentType === "CUSTOMER" ? formData.salesOrderId : undefined,
        supplierInvoiceId: paymentType === "SUPPLIER" ? formData.supplierInvoiceId : undefined,
        amount: Number(formData.amount),
        method: formData.method,
        paymentDate: formData.paymentDate
          ? new Date(formData.paymentDate).toISOString()
          : undefined,
        reference: formData.reference || undefined,
        note: formData.note || undefined,
      };
      const payment = await recordPayment.mutateAsync(payload);
      setCreatedPaymentId(payment.id);
      toast.success(`${paymentType === "CUSTOMER" ? "Customer" : "Supplier"} payment recorded successfully.`);
    } catch (error) {
      toast.error("Recording failed", {
        description: getErrorMessage(error),
      });
    }
  };

  // Success state
  if (createdPaymentId) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-5">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-9 w-9 text-emerald-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-lg font-semibold text-foreground">Payment Recorded</p>
          <p className="text-sm text-muted-foreground">
            The payment of{" "}
            <strong>{formatCurrency(Number(formData.amount))}</strong> has been
            successfully recorded.
          </p>
        </div>
        <div className="flex gap-3 mt-2">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
          {paymentType === "CUSTOMER" && (
            <Button onClick={() => onDownloadReceipt(createdPaymentId)}>
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Payment Type Selection Toggle */}
      <div className="flex rounded-xl bg-muted p-1 border">
        <button
          type="button"
          onClick={() => {
            setPaymentType("CUSTOMER");
            setFormData((prev) => ({ ...prev, supplierInvoiceId: "" }));
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            paymentType === "CUSTOMER"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Customer Payment (AR Receipt)
        </button>
        <button
          type="button"
          onClick={() => {
            setPaymentType("SUPPLIER");
            setFormData((prev) => ({ ...prev, salesOrderId: "" }));
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            paymentType === "SUPPLIER"
              ? "bg-background text-primary shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Supplier Payment (AP Outflow)
        </button>
      </div>

      {paymentType === "CUSTOMER" ? (
        <>
          {/* Sales Order Selector */}
          <OrderPicker
            orders={salesOrders.data?.items ?? []}
            selectedId={formData.salesOrderId}
            onSelect={(salesOrderId) => {
              const order = salesOrders.data?.items.find((o) => o.id === salesOrderId);
              setFormData({
                ...formData,
                salesOrderId,
                amount: order ? String(toNumber(order.balanceDue)) : formData.amount,
                reference: salesOrderId
                  ? `PAY-${salesOrderId.slice(0, 8).toUpperCase()}`
                  : `PAY-${Date.now().toString().slice(-6)}`,
              });
            }}
          />

          {/* Order Summary */}
          {selectedOrder && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Order Total</span>
                <span className="font-semibold tabular-nums">
                  {formatCurrency(toNumber(selectedOrder.total))}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid So Far</span>
                <span className="tabular-nums">
                  {formatCurrency(
                    toNumber(selectedOrder.total) -
                      toNumber(selectedOrder.balanceDue),
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-border pt-2">
                <span className="font-medium">Balance Due</span>
                <span className="font-bold text-primary tabular-nums">
                  {formatCurrency(toNumber(selectedOrder.balanceDue))}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Supplier Invoice Selector */}
          <SupplierInvoicePicker
            invoices={supplierInvoices.data?.items ?? []}
            selectedId={formData.supplierInvoiceId}
            onSelect={(supplierInvoiceId) => {
              const inv = supplierInvoices.data?.items.find((i) => i.id === supplierInvoiceId);
              setFormData({
                ...formData,
                supplierInvoiceId,
                amount: inv ? String(inv.balance) : formData.amount,
                reference: inv
                  ? `SUP-PAY-${inv.invoiceNumber}`
                  : `SUP-PAY-${Date.now().toString().slice(-6)}`,
              });
            }}
          />

          {/* Supplier Invoice Summary */}
          {selectedInvoice && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Supplier</span>
                <span className="font-semibold text-foreground">{selectedInvoice.supplier}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Invoice Total</span>
                <span className="font-semibold font-mono">{formatCurrency(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Already Paid</span>
                <span className="font-mono text-muted-foreground">{formatCurrency(selectedInvoice.amountPaid)}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-emerald-500/20 pt-2">
                <span className="font-medium">Outstanding Balance Due</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                  {formatCurrency(selectedInvoice.balance)}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Amount & Method */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount *</label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Payment Method *</label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={formData.method}
            onChange={(e) =>
              setFormData({ ...formData, method: e.target.value })
            }
          >
            <option value="CASH">Cash</option>
            <option value="BANK">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="QR">QR Payment</option>
            <option value="CARD">Card</option>
            <option value="INSTALLMENT">Installment</option>
          </select>
        </div>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Payment Date *</label>
        <NepaliDatePickerInput
          value={formData.paymentDate}
          onChange={(date) =>
            setFormData({
              ...formData,
              paymentDate: date.toISOString().split("T")[0],
            })
          }
        />
      </div>

      {/* Reference & Note */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Reference</label>
          <Input
            placeholder="e.g. TXN-987654"
            value={formData.reference}
            onChange={(e) =>
              setFormData({ ...formData, reference: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Particulars</label>
          <Input
            placeholder="e.g. Supplier payment settlement"
            value={formData.note}
            onChange={(e) =>
              setFormData({ ...formData, note: e.target.value })
            }
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={recordPayment.isPending}
        >
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={recordPayment.isPending}>
          {recordPayment.isPending ? "Recording..." : "Record Payment"}
        </Button>
      </div>
    </div>
  );
}

/* ─── Searchable Order Picker ─────────────────────────────────────────────── */

function OrderPicker({
  orders,
  selectedId,
  onSelect,
}: {
  orders: SalesOrderRow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  // Filter to orders with balance, sort newest first, and apply search
  const filteredOrders = useMemo(() => {
    const withBalance = orders.filter((so) => toNumber(so.balanceDue) > 0);
    const sorted = [...withBalance].sort(
      (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime(),
    );
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (so) =>
        so.customer.toLowerCase().includes(q) ||
        so.id.toLowerCase().includes(q),
    );
  }, [orders, query]);

  const selectedOrder = orders.find((o) => o.id === selectedId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Sales Order *</label>

      {/* Selected order chip */}
      {selectedOrder && (
        <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary truncate">{selectedOrder.customer}</p>
            <p className="text-xs text-muted-foreground">
              Order {selectedOrder.id.slice(0, 12)}… · Balance: {formatCurrency(toNumber(selectedOrder.balanceDue))}
            </p>
          </div>
          <button
            onClick={() => onSelect("")}
            className="ml-3 shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Change
          </button>
        </div>
      )}

      {/* Search + list (visible when no order is selected) */}
      {!selectedOrder && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer name or order ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {filteredOrders.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No orders with outstanding balance found.
              </p>
            )}
            {filteredOrders.map((so) => (
              <button
                key={so.id}
                onClick={() => onSelect(so.id)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{so.customer}</p>
                  <p className="text-xs text-muted-foreground">
                    {so.id.slice(0, 14)}… · {formatDate(so.orderDate)} · {so.status}
                  </p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-semibold tabular-nums text-primary">
                  {formatCurrency(toNumber(so.balanceDue))}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Searchable Supplier Invoice Picker ───────────────────────────────────── */

function SupplierInvoicePicker({
  invoices,
  selectedId,
  onSelect,
}: {
  invoices: SupplierInvoiceRow[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredInvoices = useMemo(() => {
    const withBalance = invoices.filter((inv) => (inv.balance ?? (inv.totalAmount - inv.amountPaid)) > 0);
    const sorted = [...withBalance].sort(
      (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime(),
    );
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      (inv) =>
        inv.supplier.toLowerCase().includes(q) ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.id.toLowerCase().includes(q),
    );
  }, [invoices, query]);

  const selectedInvoice = invoices.find((inv) => inv.id === selectedId);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Supplier Invoice / VAT Bill *</label>

      {/* Selected invoice chip */}
      {selectedInvoice && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300 truncate">
              {selectedInvoice.supplier} — Bill #{selectedInvoice.invoiceNumber}
            </p>
            <p className="text-xs text-muted-foreground">
              Date: {formatDate(selectedInvoice.issueDate)} · Balance Payable: {formatCurrency(selectedInvoice.balance)}
            </p>
          </div>
          <button
            onClick={() => onSelect("")}
            className="ml-3 shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Change
          </button>
        </div>
      )}

      {/* Search + list (visible when no invoice is selected) */}
      {!selectedInvoice && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by supplier name or bill number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-border divide-y divide-border">
            {filteredInvoices.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No supplier invoices with outstanding balance found.
              </p>
            )}
            {filteredInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => onSelect(inv.id)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-emerald-500/5 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{inv.supplier}</p>
                  <p className="text-xs text-muted-foreground">
                    Bill #{inv.invoiceNumber} · {formatDate(inv.issueDate)} · {inv.status}
                  </p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-semibold font-mono text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(inv.balance)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
