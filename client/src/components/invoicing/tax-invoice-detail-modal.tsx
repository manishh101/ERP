import { useTaxInvoiceQuery } from "@/hooks/use-queries";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, FileText, Building, Calendar, AlertCircle } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL } from "@/lib/api";

type TaxInvoiceDetailModalProps = {
  invoiceId: string | null;
  onClose: () => void;
};

export function TaxInvoiceDetailModal({ invoiceId, onClose }: TaxInvoiceDetailModalProps) {
  const { data: invoice, isLoading, error } = useTaxInvoiceQuery(invoiceId ?? undefined);
  const { token } = useAuth();

  const handleDownloadPdf = async () => {
    if (!invoiceId) return;
    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/auth/download-token`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to generate download token");
      const { token: downloadToken } = await response.json();

      const queryParams = new URLSearchParams({
        token: downloadToken,
        type: invoice?.invoiceType === "ESTIMATE" ? "estimate" : "invoice",
      }).toString();

      const url = `${baseUrl}/tax-invoices/${invoiceId}/pdf?${queryParams}`;
      window.open(url, "_blank");
    } catch (err) {
      console.error("PDF download error:", err);
      alert("Failed to download PDF document.");
    }
  };

  return (
    <Dialog open={Boolean(invoiceId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice Details"}
              </DialogTitle>
              <DialogDescription>
                Official statutory billing document issued under IRD Nepal rules.
              </DialogDescription>
            </div>
            {invoice && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-primary/10 text-primary border border-primary/20">
                  {invoice.invoiceType}
                </span>
                <StatusBadge value={invoice.status} />
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading ? (
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        ) : error || !invoice ? (
          <div className="py-8 text-center text-muted-foreground">
            Failed to load invoice details. Please try again.
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* Header info cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl border border-border bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Building className="h-4 w-4" /> Buyer / Customer
                </div>
                <p className="text-base font-bold text-foreground">
                  {invoice.salesOrder?.customer?.name ?? invoice.customer?.name ?? "Customer"}
                </p>
                {invoice.salesOrder?.customer?.panNo && (
                  <p className="text-xs font-mono text-muted-foreground">
                    PAN/VAT: {invoice.salesOrder.customer.panNo}
                  </p>
                )}
                {invoice.salesOrder?.customer?.address && (
                  <p className="text-xs text-muted-foreground">
                    {invoice.salesOrder.customer.address}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl border border-border bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Issue & Fiscal Details
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">BS Date:</span>{" "}
                    <span className="font-semibold">{invoice.bsDate || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fiscal Year:</span>{" "}
                    <span className="font-semibold">{invoice.fiscalYear || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issue Date (AD):</span>{" "}
                    <span className="font-medium">{formatDate(invoice.issueDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Due Date:</span>{" "}
                    <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sales order reference notice */}
            {invoice.salesOrder && (
              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/80 text-amber-900 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold">Linked Commercial Sales Order:</span>{" "}
                  #{invoice.salesOrder.id.slice(-8)} &mdash; Total:{" "}
                  <span className="font-bold">{formatCurrency(Number(invoice.salesOrder.orderAmount || invoice.salesOrder.totalAmount || 0))}</span>
                </div>
                <span className="text-[11px] text-amber-700 italic">
                  Commercial balance tracked in AR Ledger
                </span>
              </div>
            )}

            {/* Line items table */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Line Items</h4>
              <div className="rounded-2xl border border-border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/70 border-b border-border text-muted-foreground">
                    <tr>
                      <th className="p-3">Item Description</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Disc</th>
                      <th className="p-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {invoice.lineItems?.map((li: any) => {
                      const qty = Number(li.quantity);
                      const price = Number(li.unitPrice);
                      const discAmt = li.discountAmount ? Number(li.discountAmount) : (qty * price * Number(li.discountPct || 0)) / 100;
                      const lineTotal = qty * price - discAmt;
                      const name = li.productVariant
                        ? `${li.productVariant.product?.name ?? "Product"} (${li.productVariant.variantName})`
                        : li.customProductName || "Item";
                      return (
                        <tr key={li.id}>
                          <td className="p-3 font-medium">{name}</td>
                          <td className="p-3 text-center">{qty}</td>
                          <td className="p-3 text-right">{formatCurrency(price)}</td>
                          <td className="p-3 text-right text-muted-foreground">{discAmt > 0 ? formatCurrency(discAmt) : "-"}</td>
                          <td className="p-3 text-right font-semibold">{formatCurrency(lineTotal)}</td>
                        </tr>
                      );
                    })}
                    {(!invoice.lineItems || invoice.lineItems.length === 0) && (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground italic">
                          No itemized lines specified.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Accounting Breakdown */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 pt-2 border-t border-border">
              <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-sm">
                <AlertCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <p>
                  <strong>PRD Compliance Note:</strong> The Taxable Value and VAT amounts above (TaxInvoice.invoiceAmount) represent official compliance figures posted to the VAT Register (Annex 7).
                </p>
              </div>

              <div className="w-full md:w-64 p-4 rounded-2xl border border-primary/20 bg-primary/5 space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Taxable Subtotal:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(Number(invoice.invoiceAmount) - Number(invoice.taxAmount))}
                  </span>
                </div>
                {invoice.invoiceType === "VAT" && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>VAT (13%):</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(Number(invoice.taxAmount))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-primary pt-2 border-t border-primary/20">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(Number(invoice.invoiceAmount))}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleDownloadPdf} className="gap-2">
                <Download className="h-4 w-4" /> Download PDF Tax Invoice
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
