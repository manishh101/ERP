import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Download, Eye, FileText, Link2, ShoppingCart, Trash2, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";

import { CreateSupplierInvoiceForm } from "@/components/purchasing/create-supplier-invoice-form";
import { DataTable, type DropdownAction } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { YearMonthFilter, useYearMonthFilteredRows } from "@/components/shared/year-month-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeleteSupplierInvoiceAttachmentMutation,
  useRecordPaymentMutation,
  useSupplierInvoicesQuery,
  useUploadSupplierInvoiceAttachmentMutation,
} from "@/hooks/use-queries";
import { API_BASE_URL, getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { SupplierInvoiceAttachment, SupplierInvoiceRow } from "@/types/domain";
import { useAuth } from "@/components/auth/auth-provider";

type InvoiceFilter = "ALL" | "OPEN" | "OVERDUE" | "PAID";
const today = () => new Date().toISOString().slice(0, 10);
const isOpen = (invoice: SupplierInvoiceRow) => invoice.balance > 0.005 && invoice.status !== "Cancelled";
const isOverdue = (invoice: SupplierInvoiceRow) => Boolean(invoice.dueDate) && isOpen(invoice) && new Date(invoice.dueDate!).getTime() < new Date(`${today()}T00:00:00`).getTime();

export function SupplierInvoicesPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { data, error, isLoading } = useSupplierInvoicesQuery();
  const uploadAttachment = useUploadSupplierInvoiceAttachmentMutation();
  const deleteAttachment = useDeleteSupplierInvoiceAttachmentMutation();
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoiceRow | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<SupplierInvoiceRow | null>(null);

  const datedItems = useYearMonthFilteredRows(data?.items ?? [], (invoice) => invoice.issueDate, filterYear, filterMonth);
  const metrics = useMemo(() => ({
    open: datedItems.filter(isOpen),
    overdue: datedItems.filter(isOverdue),
    paid: datedItems.filter((invoice) => invoice.status === "Paid"),
  }), [datedItems]);
  const filteredItems = useMemo(() => {
    if (invoiceFilter === "OPEN") return metrics.open;
    if (invoiceFilter === "OVERDUE") return metrics.overdue;
    if (invoiceFilter === "PAID") return metrics.paid;
    return datedItems;
  }, [datedItems, invoiceFilter, metrics]);
  const counts: Record<InvoiceFilter, number> = { ALL: datedItems.length, OPEN: metrics.open.length, OVERDUE: metrics.overdue.length, PAID: metrics.paid.length };

  const columns: ColumnDef<SupplierInvoiceRow, unknown>[] = useMemo(() => [
    { accessorKey: "invoiceNumber", header: "Supplier invoice", cell: ({ row }) => <span className="font-semibold">{row.original.invoiceNumber}</span> },
    { accessorKey: "supplier", header: "Supplier" },
    { id: "po", header: "Purchase order", cell: ({ row }) => row.original.purchaseOrderId ? <span className="font-mono text-xs text-primary">PO #{row.original.purchaseOrderId.slice(0, 8)}</span> : <span className="text-sm text-muted-foreground">Direct bill</span> },
    { accessorKey: "issueDate", header: "Bill date", cell: ({ row }) => formatDate(row.original.issueDate) },
    { accessorKey: "dueDate", header: "Due date", cell: ({ row }) => row.original.dueDate ? <span className={isOverdue(row.original) ? "font-medium text-destructive" : undefined}>{formatDate(row.original.dueDate)}</span> : <span className="text-muted-foreground">Not set</span> },
    { id: "documents", header: () => <FileText className="h-4 w-4" aria-label="Documents" />, cell: ({ row }) => row.original.attachments.length ? <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-semibold text-primary">{row.original.attachments.length}</span> : <span className="text-muted-foreground">-</span> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { accessorKey: "totalAmount", header: () => <div className="text-right">Bill total</div>, cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{formatCurrency(row.original.totalAmount)}</div> },
    { accessorKey: "balance", header: () => <div className="text-right">Balance</div>, cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{formatCurrency(row.original.balance)}</div> },
  ], []);

  const actions = (invoice: SupplierInvoiceRow): DropdownAction<SupplierInvoiceRow>[] => [
    { label: "View invoice", icon: <Eye className="h-4 w-4" />, onClick: setSelectedInvoice },
    ...(isOpen(invoice) ? [{ label: "Record payment", icon: <Wallet className="h-4 w-4" />, onClick: setPaymentInvoice }] : []),
    ...(invoice.purchaseOrderId ? [{ label: "View purchase order", icon: <Link2 className="h-4 w-4" />, href: (row: SupplierInvoiceRow) => `/purchasing/${row.purchaseOrderId}` }] : []),
    { label: "View supplier", icon: <ShoppingCart className="h-4 w-4" />, href: (row) => `/suppliers/${row.supplierId}` },
  ];

  if (isLoading) return <Skeleton className="h-[520px]" />;
  if (error) return <Card><CardContent className="py-10"><p className="font-semibold">Supplier invoices could not be loaded.</p><p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p></CardContent></Card>;
  if (!data) return null;

  const openBalance = metrics.open.reduce((sum, invoice) => sum + invoice.balance, 0);
  const overdueBalance = metrics.overdue.reduce((sum, invoice) => sum + invoice.balance, 0);

  return <div className="space-y-6">
    <PageHeader title="Supplier Invoice" actions={[{ label: "Open Purchase Orders", variant: "outline", onClick: () => navigate("/purchasing") }, { label: "New Supplier Invoice", onClick: () => setCreateOpen(true) }]} />

    <div className="grid gap-4 md:grid-cols-3">
      <Metric label="Open payable" value={formatCurrency(openBalance)} detail={`${metrics.open.length} invoice${metrics.open.length === 1 ? "" : "s"} awaiting payment`} />
      <Metric label="Overdue" value={formatCurrency(overdueBalance)} detail={`${metrics.overdue.length} invoice${metrics.overdue.length === 1 ? "" : "s"} past the due date`} tone="danger" />
      <Metric label="Paid bills" value={String(metrics.paid.length)} detail="Bills fully settled in this period" tone="success" />
    </div>

    <div className="flex flex-wrap items-center gap-3 border-b pb-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {(["ALL", "OPEN", "OVERDUE", "PAID"] as InvoiceFilter[]).map((filter) => <Button key={filter} variant={invoiceFilter === filter ? "default" : "ghost"} size="sm" className="h-8 px-3" onClick={() => setInvoiceFilter(filter)}>{filter.charAt(0) + filter.slice(1).toLowerCase()}<span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 text-[10px]">{counts[filter]}</span></Button>)}
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
        <YearMonthFilter year={filterYear} month={filterMonth} onYearChange={(year) => { setFilterYear(year); setFilterMonth(""); }} onMonthChange={setFilterMonth} />
        {(filterYear || filterMonth) && <Button variant="link" size="sm" onClick={() => { setFilterYear(""); setFilterMonth(""); }}>Clear filter</Button>}
      </div>
    </div>

    <Card><CardHeader className="pb-4"><CardTitle>Supplier Bill Register</CardTitle><CardDescription>Track supplier bills from receipt through payment. Linked bills can be checked against their purchase order.</CardDescription></CardHeader><CardContent><DataTable data={filteredItems} columns={columns} actions={actions} onRowClick={setSelectedInvoice} searchPlaceholder="Search by invoice number or supplier..." emptyMessage="No supplier invoices match these filters." /></CardContent></Card>

    <Sheet open={createOpen} onOpenChange={setCreateOpen}><SheetContent className="sm:max-w-2xl overflow-y-auto p-0"><SheetHeader><SheetTitle>New supplier invoice</SheetTitle><SheetDescription>Record a direct supplier bill or link it to an existing purchase order.</SheetDescription></SheetHeader><CreateSupplierInvoiceForm onClose={() => setCreateOpen(false)} /></SheetContent></Sheet>

    <Sheet open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}><SheetContent className="sm:max-w-xl overflow-y-auto">{selectedInvoice && <InvoiceDetail invoice={selectedInvoice} onPayment={() => { setSelectedInvoice(null); setPaymentInvoice(selectedInvoice); }} onPurchaseOrder={() => navigate(`/purchasing/${selectedInvoice.purchaseOrderId}`)} onUpload={async (file) => { try { await uploadAttachment.mutateAsync({ invoiceId: selectedInvoice.id, file }); toast.success("Invoice document saved privately"); } catch (error) { toast.error("Document could not be uploaded", { description: getErrorMessage(error) }); } }} onOpenDocument={async (attachment) => { try { const baseUrl = API_BASE_URL.replace(/\/$/, ""); const response = await fetch(`${baseUrl}/suppliers/invoices/${selectedInvoice.id}/attachments/${attachment.id}/download`, { headers: { Authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error("Document could not be opened"); const objectUrl = URL.createObjectURL(await response.blob()); window.open(objectUrl, "_blank", "noopener,noreferrer"); window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000); } catch (error) { toast.error("Document could not be opened", { description: getErrorMessage(error) }); } }} onDeleteDocument={async (attachment) => { try { await deleteAttachment.mutateAsync({ invoiceId: selectedInvoice.id, attachmentId: attachment.id }); toast.success("Invoice document removed"); } catch (error) { toast.error("Document could not be removed", { description: getErrorMessage(error) }); } }} />}</SheetContent></Sheet>
    <Dialog open={Boolean(paymentInvoice)} onOpenChange={(open) => !open && setPaymentInvoice(null)}><DialogContent className="sm:max-w-md">{paymentInvoice && <PaymentForm invoice={paymentInvoice} onClose={() => setPaymentInvoice(null)} />}</DialogContent></Dialog>
  </div>;
}

function Metric({ label, value, detail, tone = "default" }: { label: string; value: string; detail: string; tone?: "default" | "danger" | "success" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground";
  return <Card className="shadow-xs"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p><p className={`mt-1 font-mono text-2xl font-bold ${color}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></CardContent></Card>;
}

function InvoiceDetail({ invoice, onPayment, onPurchaseOrder, onUpload, onOpenDocument, onDeleteDocument }: { invoice: SupplierInvoiceRow; onPayment: () => void; onPurchaseOrder: () => void; onUpload: (file: File) => Promise<void>; onOpenDocument: (attachment: SupplierInvoiceAttachment) => Promise<void>; onDeleteDocument: (attachment: SupplierInvoiceAttachment) => Promise<void> }) {
  return <><SheetHeader><div className="flex items-start justify-between gap-4 pr-8"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supplier invoice detail</p><SheetTitle>{invoice.invoiceNumber}</SheetTitle><SheetDescription>{invoice.supplier}</SheetDescription></div><StatusBadge value={invoice.status} /></div></SheetHeader><div className="space-y-6 p-6 pt-2">
    {isOverdue(invoice) && <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />This bill is overdue. Confirm payment status or contact the supplier.</div>}
    <div className="grid gap-3 rounded-md border bg-muted/30 p-4 sm:grid-cols-2"><Detail label="Bill date" value={formatDate(invoice.issueDate)} /><Detail label="Due date" value={invoice.dueDate ? formatDate(invoice.dueDate) : "Not set"} /><Detail label="Taxable amount" value={formatCurrency(invoice.subtotal)} /><Detail label="VAT amount" value={formatCurrency(invoice.taxAmount)} /><Detail label="Bill total" value={formatCurrency(invoice.totalAmount)} strong /><Detail label="Paid so far" value={formatCurrency(invoice.amountPaid)} /><Detail label="Balance due" value={formatCurrency(invoice.balance)} strong /></div>
    <DocumentSection invoice={invoice} onUpload={onUpload} onOpen={onOpenDocument} onDelete={onDeleteDocument} />
    <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purchase order</p>{invoice.purchaseOrderId ? <Button variant="outline" className="w-full justify-between" onClick={onPurchaseOrder}><span className="flex items-center gap-2"><Link2 className="h-4 w-4" />PO #{invoice.purchaseOrderId.slice(0, 8)}</span><Eye className="h-4 w-4" /></Button> : <p className="text-sm text-muted-foreground">Direct supplier bill with no purchase-order link.</p>}</div>
    {invoice.notes && <div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</p><p className="mt-2 rounded-md border bg-muted/20 p-3 text-sm">{invoice.notes}</p></div>}
    {isOpen(invoice) && <Button className="w-full" onClick={onPayment}><Wallet className="mr-2 h-4 w-4" />Record payment</Button>}
  </div></>;
}

function DocumentSection({ invoice, onUpload, onOpen, onDelete }: { invoice: SupplierInvoiceRow; onUpload: (file: File) => Promise<void>; onOpen: (attachment: SupplierInvoiceAttachment) => Promise<void>; onDelete: (attachment: SupplierInvoiceAttachment) => Promise<void> }) {
  return <div className="space-y-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice documents</p><p className="mt-1 text-xs text-muted-foreground">Private PDF or image archive</p></div><label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-border bg-white/80 px-3 text-xs font-semibold hover:bg-secondary"><Upload className="mr-1.5 h-3.5 w-3.5" />Upload<input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={async (event) => { const file = event.target.files?.[0]; if (file) await onUpload(file); event.currentTarget.value = ""; }} /></label></div>{invoice.attachments.length === 0 ? <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground"><FileText className="mx-auto mb-2 h-5 w-5" />No bill document attached yet.</div> : <div className="space-y-2">{invoice.attachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-3 rounded-md border p-3"><FileText className="h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{attachment.fileName}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(attachment.sizeBytes)} · Added {formatDate(attachment.createdAt)}</p></div><Button variant="ghost" size="icon" className="h-8 w-8" title="Open document" onClick={() => void onOpen(attachment)}><Download className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Remove document" onClick={() => void onDelete(attachment)}><Trash2 className="h-4 w-4" /></Button></div>)}</div>}</div>;
}

function formatFileSize(sizeBytes: number) { return sizeBytes < 1024 * 1024 ? `${Math.max(1, Math.round(sizeBytes / 1024))} KB` : `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`; }

function Detail({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className={strong ? "mt-1 font-semibold tabular-nums" : "mt-1 tabular-nums"}>{value}</p></div>; }

function PaymentForm({ invoice, onClose }: { invoice: SupplierInvoiceRow; onClose: () => void }) {
  const recordPayment = useRecordPaymentMutation();
  const [form, setForm] = useState({ amount: invoice.balance.toFixed(2), method: "BANK", paymentDate: today(), reference: `PAY-${invoice.invoiceNumber}` });
  const submit = async () => {
    const amount = Number(form.amount);
    if (!amount || amount <= 0 || amount > invoice.balance + 0.005) return toast.error("Enter an amount no greater than the outstanding balance.");
    try { await recordPayment.mutateAsync({ supplierInvoiceId: invoice.id, amount, method: form.method, paymentDate: new Date(form.paymentDate).toISOString(), reference: form.reference || undefined, note: `Payment for supplier invoice ${invoice.invoiceNumber}` }); toast.success("Supplier payment recorded"); onClose(); } catch (error) { toast.error("Payment could not be recorded", { description: getErrorMessage(error) }); }
  };
  return <div className="space-y-5"><DialogHeader><DialogTitle>Record supplier payment</DialogTitle><DialogDescription>{invoice.supplier} - {invoice.invoiceNumber}</DialogDescription></DialogHeader><div className="rounded-md border bg-muted/30 p-4 text-sm"><span className="text-muted-foreground">Balance due</span><p className="mt-1 font-mono text-lg font-semibold">{formatCurrency(invoice.balance)}</p></div><label className="block space-y-1.5"><span className="text-sm font-medium">Payment amount *</span><Input type="number" min="0.01" max={invoice.balance} step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label><label className="block space-y-1.5"><span className="text-sm font-medium">Payment method *</span><select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.method} onChange={(event) => setForm({ ...form, method: event.target.value })}><option value="BANK">Bank transfer</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option><option value="QR">QR payment</option><option value="CARD">Card</option></select></label><label className="block space-y-1.5"><span className="text-sm font-medium">Payment date *</span><NepaliDatePickerInput value={form.paymentDate} onChange={(date) => setForm({ ...form, paymentDate: date.toISOString().split("T")[0] })} /></label><label className="block space-y-1.5"><span className="text-sm font-medium">Reference</span><Input placeholder="Cheque no. or bank reference" value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label><div className="flex justify-end gap-3 border-t pt-4"><Button variant="outline" onClick={onClose} disabled={recordPayment.isPending}>Cancel</Button><Button onClick={submit} disabled={recordPayment.isPending}>{recordPayment.isPending ? "Recording..." : "Record payment"}</Button></div></div>;
}
