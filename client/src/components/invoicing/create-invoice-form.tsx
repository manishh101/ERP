import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateInvoiceMutation, useSalesOrdersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CreateInvoiceFormProps = {
  onClose: () => void;
};

export function CreateInvoiceForm({ onClose }: CreateInvoiceFormProps) {
  const { push } = useToast();
  const createInvoice = useCreateInvoiceMutation();
  const salesOrders = useSalesOrdersQuery();
  
  const [formData, setFormData] = useState({
    soId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "DRAFT",
    invoiceAmount: "0",
    taxAmount: "0",
    invoiceType: "VAT",
    notes: "",
    bsDate: "",
    fiscalYear: "",
  });

  // Find the selected sales order to show reference amount
  const selectedOrder = useMemo(() => {
    if (!formData.soId || !salesOrders.data?.items) return null;
    return salesOrders.data.items.find((so: any) => so.id === formData.soId);
  }, [formData.soId, salesOrders.data]);

  const handleSubmit = async () => {
    if (!formData.soId || !formData.invoiceAmount) {
      push("Validation failed", "Please select a sales order and enter a total amount.");
      return;
    }

    if (Number(formData.invoiceAmount) <= 0) {
      push("Validation failed", "Invoice amount must be greater than 0.");
      return;
    }

    try {
      await createInvoice.mutateAsync({
        soId: formData.soId,
        issueDate: formData.issueDate ? new Date(formData.issueDate).toISOString() : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        status: formData.status,
        invoiceAmount: Number(formData.invoiceAmount),
        taxAmount: Number(formData.taxAmount),
        invoiceType: formData.invoiceType,
        notes: formData.notes || undefined,
        bsDate: formData.bsDate || undefined,
        fiscalYear: formData.fiscalYear || undefined,
      });
      
      push("Invoice created", `Invoice generated successfully.`);
      onClose();
    } catch (error) {
      push("Creation failed", getErrorMessage(error, "Unable to create invoice."));
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Create Invoice</CardTitle>
          <CardDescription>Generate a tax invoice (VAT/PAN) for an existing sales order.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Order Amount Reference */}
        {selectedOrder && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">Order Reference</p>
                <p className="text-xs text-amber-700 mt-1">
                  Customer: <span className="font-medium">{selectedOrder.customer}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-900">
                  {formatCurrency(selectedOrder.orderAmount || selectedOrder.total || 0)}
                </p>
                <p className="text-xs text-amber-600">Order Amount</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-2 border-t border-amber-200 pt-2">
              ⚠️ Invoice amount below may differ from order amount. Enter the actual amount for the tax document.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Sales Order *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.soId}
              onChange={(e) => {
                const soId = e.target.value;
                setFormData({ ...formData, soId });
              }}
            >
              <option value="">Select a sales order</option>
              {salesOrders.data?.items.map((so: any) => (
                <option key={so.id} value={so.id}>
                  {so.id.slice(-8)} — {so.customer} — {formatCurrency(so.orderAmount || so.total || 0)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Type *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.invoiceType}
              onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
            >
              <option value="VAT">VAT Invoice (कर बिजक)</option>
              <option value="PAN">PAN Invoice (बिजक)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              {formData.invoiceType === "VAT" ? "13% VAT will be shown on the bill" : "No VAT line — PAN number only"}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Issue Date</label>
            <NepaliDatePickerInput 
              value={formData.issueDate} 
              onChange={(date) => setFormData({ ...formData, issueDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <NepaliDatePickerInput 
              value={formData.dueDate} 
              onChange={(date) => setFormData({ ...formData, dueDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Amount (for tax bill) *</label>
            <Input 
              type="number"
              step="0.01"
              placeholder="Enter amount to show on the VAT/PAN bill"
              value={formData.invoiceAmount} 
              onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })} 
            />
            <p className="text-xs text-muted-foreground">User-entered — not auto-computed from line items</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {formData.invoiceType === "VAT" ? "VAT Amount" : "Tax Amount"}
            </label>
            <Input 
              type="number"
              step="0.01"
              placeholder={formData.invoiceType === "VAT" ? "e.g. 7800 for 13% on 60000" : "0 for PAN bill"}
              value={formData.taxAmount} 
              onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })} 
            />
            <p className="text-xs text-muted-foreground">
              {formData.invoiceType === "VAT" ? "User-entered — do not assume 13% automatically" : "Usually 0 for PAN bills"}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">B.S. Date (e.g. 2081-09-15)</label>
            <Input 
              placeholder="YYYY-MM-DD"
              value={formData.bsDate} 
              onChange={(e) => setFormData({ ...formData, bsDate: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fiscal Year (e.g. 2081/82)</label>
            <Input 
              placeholder="YYYY/YY"
              value={formData.fiscalYear} 
              onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })} 
            />
          </div>
          <Input 
            className="md:col-span-1 lg:col-span-1"
            placeholder="Invoice Notes / Payment Terms" 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
          />
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={createInvoice.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? "Creating..." : "Save Invoice"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
