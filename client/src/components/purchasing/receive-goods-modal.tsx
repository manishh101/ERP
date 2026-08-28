import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { toast } from "sonner";
import { useReceivePurchaseOrderMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Receipt, FileText, CheckCircle2, AlertTriangle, PackageCheck } from "lucide-react";

type ReceiveGoodsModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
};

type ReceiveLineState = {
  poLineItemId: string;
  productName: string;
  supplierItemName: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  pendingQty: number;
  quantityReceived: string;
  unitCost: string;
  taxMode: "EXEMPT_0" | "VAT_13" | "CUSTOM";
  taxAmount: string;
};

export function ReceiveGoodsModal({ open, onOpenChange, order }: ReceiveGoodsModalProps) {
  const receiveMutation = useReceivePurchaseOrderMutation();

  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<ReceiveLineState[]>([]);

  useEffect(() => {
    if (order && order.lineItems) {
      const hasPending = order.lineItems.some((item: any) => (item.quantity || 0) > (item.receivedQuantity || 0));
      const initialLines: ReceiveLineState[] = order.lineItems
        .map((item: any) => {
          const ordered = item.quantity || 0;
          const prev = item.receivedQuantity || 0;
          const pending = Math.max(0, ordered - prev);
          const defaultQty = hasPending ? pending : ordered;
          const currentUnitCost = Number(item.unitCost) || 0;
          const currentTax = Number(item.taxAmount) || 0;
          const nameFromBill = item.supplierItemName || item.productVariant?.product?.name || item.productVariant?.variantName || "Item";

          let initialTaxMode: "EXEMPT_0" | "VAT_13" | "CUSTOM" = "EXEMPT_0";
          if (currentTax > 0 && currentUnitCost > 0) {
            const expectedVat = (ordered * currentUnitCost) * 0.13;
            if (Math.abs(currentTax - expectedVat) < 1) {
              initialTaxMode = "VAT_13";
            } else {
              initialTaxMode = "CUSTOM";
            }
          }

          return {
            poLineItemId: item.id,
            productName: item.productVariant?.product?.name || item.productVariant?.variantName || "Item",
            supplierItemName: nameFromBill,
            orderedQty: ordered,
            previouslyReceivedQty: prev,
            pendingQty: pending,
            quantityReceived: String(defaultQty),
            unitCost: currentUnitCost > 0 ? String(currentUnitCost) : "0",
            taxMode: initialTaxMode,
            taxAmount: currentTax > 0 ? String(currentTax) : "0",
          };
        })
        .filter((line: ReceiveLineState) => (hasPending ? line.pendingQty > 0 : true));

      setLines(initialLines);
      setSupplierInvoiceNo("");
      setNotes("");
    }
  }, [order, open]);

  const updateLine = (index: number, updates: Partial<ReceiveLineState>) => {
    const newLines = [...lines];
    const current = newLines[index];
    const updated = { ...current, ...updates };

    const qty = Number(updated.quantityReceived) || 0;
    const cost = Number(updated.unitCost) || 0;
    const subtotal = qty * cost;

    if (updated.taxMode === "VAT_13") {
      updated.taxAmount = (subtotal * 0.13).toFixed(2);
    } else if (updated.taxMode === "EXEMPT_0") {
      updated.taxAmount = "0";
    }

    newLines[index] = updated;
    setLines(newLines);
  };

  const handleSubmitting = async () => {
    if (!order) return;

    if (!supplierInvoiceNo.trim()) {
      toast.error("Supplier Bill Number Required", {
        description: "Please enter the Supplier Invoice / VAT Bill Number (e.g. VAT-9901).",
      });
      return;
    }

    // Check for over-receiving validation
    const overReceivedLine = lines.find(
      (l) => (Number(l.quantityReceived) || 0) > l.pendingQty
    );
    if (overReceivedLine) {
      toast.error("Over-Receiving Error", {
        description: `Cannot receive ${overReceivedLine.quantityReceived} units for ${overReceivedLine.productName}. Maximum pending is ${overReceivedLine.pendingQty}.`,
      });
      return;
    }

    const validLines = lines
      .map((l) => ({
        poLineItemId: l.poLineItemId,
        quantityReceived: Number(l.quantityReceived) || 0,
        unitCost: Number(l.unitCost) || 0,
        taxAmount: Number(l.taxAmount) || 0,
        supplierItemName: l.supplierItemName.trim() || undefined,
      }))
      .filter((l) => l.quantityReceived > 0);

    if (validLines.length === 0) {
      toast.error("No Quantities Received", {
        description: "Please enter a received quantity greater than 0 for at least one item.",
      });
      return;
    }

    try {
      await receiveMutation.mutateAsync({
        id: order.id,
        supplierInvoiceNo: supplierInvoiceNo.trim(),
        supplierInvoiceDate: receivedDate,
        notes: notes.trim() || `Goods receipt with Supplier VAT Bill #${supplierInvoiceNo.trim()}`,
        lines: validLines,
      });

      toast.success("Goods Received & Stock Updated", {
        description: `Logged receipt for PO #${order.id.slice(0, 8)} with Supplier Bill ${supplierInvoiceNo.trim()}.`,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error("Receipt failed", { description: getErrorMessage(e) });
    }
  };

  // Check if this receipt is partial or complete
  const isPartialReceipt = lines.some((line) => {
    const receivingNow = Number(line.quantityReceived) || 0;
    return line.pendingQty - receivingNow > 0;
  });

  // Financial Calculations
  const billSubtotal = lines.reduce(
    (sum, line) => sum + (Number(line.quantityReceived) || 0) * (Number(line.unitCost) || 0),
    0
  );
  const billTaxTotal = lines.reduce((sum, line) => sum + (Number(line.taxAmount) || 0), 0);
  const billGrandTotal = billSubtotal + billTaxTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600" />
            Goods Receipt & Supplier VAT Bill Verification
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record physical stock received into warehouse and enter actual cost & tax from supplier's VAT bill.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Supplier Bill Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/30 p-3 rounded-xl border border-border/50">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-primary" />
                Supplier Bill / Invoice No. *
              </label>
              <Input
                placeholder="e.g. VAT-2083-9981"
                className="h-9 text-sm rounded-lg"
                value={supplierInvoiceNo}
                onChange={(e) => setSupplierInvoiceNo(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Bill Received Date *</label>
              <NepaliDatePickerInput
                value={receivedDate}
                onChange={(d: Date) =>
                  setReceivedDate(d ? d.toISOString().split("T")[0] : new Date().toISOString().split("T")[0])
                }
              />
            </div>
          </div>

          {/* Receipt Status Notice */}
          {lines.length > 0 && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between text-xs font-medium ${
                isPartialReceipt
                  ? "bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {isPartialReceipt ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
                <span>
                  {isPartialReceipt
                    ? "Partial Receipt Mode: PO status will update to PARTIALLY_RECEIVED."
                    : "Full Receipt Mode: PO will be marked as fully RECEIVED."}
                </span>
              </div>
              <Badge
                variant="outline"
                className={`font-semibold text-xs ${
                  isPartialReceipt
                    ? "border-amber-400 text-amber-700 bg-amber-100 dark:bg-amber-900/50"
                    : "border-emerald-400 text-emerald-700 bg-emerald-100 dark:bg-emerald-900/50"
                }`}
              >
                {isPartialReceipt ? "Partial Delivery" : "Full Receipt"}
              </Badge>
            </div>
          )}

          {/* Line Items Table */}
          <div className="border rounded-xl overflow-hidden shadow-xs">
            <div className="bg-muted/60 p-2.5 text-xs font-bold border-b flex justify-between items-center">
              <span>Items Being Received</span>
              <span className="text-muted-foreground font-normal">
                Set Receiving Qty, Unit Cost & Tax/VAT per Supplier Bill
              </span>
            </div>

            <div className="divide-y divide-border/60">
              {lines.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  All items in this Purchase Order have already been fully received.
                </div>
              ) : (
                lines.map((line, idx) => {
                  const qty = Number(line.quantityReceived) || 0;
                  const cost = Number(line.unitCost) || 0;
                  const tax = Number(line.taxAmount) || 0;
                  const lineTotal = qty * cost + tax;
                  const remainingAfter = Math.max(0, line.pendingQty - qty);

                  return (
                    <div key={line.poLineItemId} className="p-3 bg-card space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-[11px] font-semibold text-foreground">
                              {line.productName}
                            </label>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              Ordered: {line.orderedQty} | Prev Received: {line.previouslyReceivedQty} | Pending: {line.pendingQty}
                            </Badge>
                          </div>
                          <Input
                            placeholder="Supplier item description"
                            className="h-8 text-xs font-medium rounded-lg"
                            value={line.supplierItemName}
                            onChange={(e) => updateLine(idx, { supplierItemName: e.target.value })}
                          />
                        </div>
                        <div className="text-right font-mono text-xs font-bold text-primary min-w-[120px] self-end pb-1">
                          Line Total: {formatCurrency(lineTotal)}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center pt-1">
                        {/* Qty Receiving Now */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] text-muted-foreground font-medium">
                            Receiving Now *
                          </label>
                          <Input
                            type="number"
                            min="0"
                            max={line.pendingQty}
                            className={`h-8 text-xs rounded-lg font-mono font-bold ${
                              qty > line.pendingQty ? "border-red-500 text-red-600 bg-red-50" : ""
                            }`}
                            value={line.quantityReceived}
                            onChange={(e) => updateLine(idx, { quantityReceived: e.target.value })}
                          />
                        </div>

                        {/* Remaining After */}
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] text-muted-foreground font-medium">
                            Remaining Qty
                          </label>
                          <div className="h-8 rounded-lg border bg-muted/30 px-2 flex items-center justify-center font-mono font-semibold text-xs text-foreground">
                            {remainingAfter} units
                          </div>
                        </div>

                        {/* Unit Cost */}
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[11px] text-muted-foreground font-medium">
                            Unit Cost (NPR)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Unit cost"
                            className="h-8 text-xs rounded-lg font-mono"
                            value={line.unitCost}
                            onChange={(e) => updateLine(idx, { unitCost: e.target.value })}
                          />
                        </div>

                        {/* Tax Mode */}
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] text-muted-foreground font-medium">
                            Tax Mode
                          </label>
                          <select
                            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                            value={line.taxMode}
                            onChange={(e) =>
                              updateLine(idx, {
                                taxMode: e.target.value as "EXEMPT_0" | "VAT_13" | "CUSTOM",
                              })
                            }
                          >
                            <option value="EXEMPT_0">0% Exempt</option>
                            <option value="VAT_13">13% VAT</option>
                            <option value="CUSTOM">Custom</option>
                          </select>
                        </div>

                        {/* Tax Amount */}
                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] text-muted-foreground font-medium">
                            VAT Amount
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            disabled={line.taxMode !== "CUSTOM"}
                            className="h-8 text-xs rounded-lg font-mono"
                            value={line.taxAmount}
                            onChange={(e) => updateLine(idx, { taxAmount: e.target.value })}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Receipt Notes / Remarks</label>
            <Input
              placeholder="e.g. Inspected and received at Kathmandu Central Store."
              className="h-9 text-xs rounded-lg"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Live Summary Bar */}
          <div className="bg-primary/5 border border-primary/20 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-foreground">Supplier VAT Bill Summary</p>
                <p className="text-[11px] text-muted-foreground">
                  Subtotal: {formatCurrency(billSubtotal)} | VAT: {formatCurrency(billTaxTotal)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Grand Total</p>
              <p className="text-lg font-bold font-mono text-primary">
                {formatCurrency(billGrandTotal)}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmitting}
            disabled={receiveMutation.isPending || lines.length === 0}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            {receiveMutation.isPending ? "Posting Receipt..." : "Submit Receipt & Update Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
