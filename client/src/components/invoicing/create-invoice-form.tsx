import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreateInvoiceMutation, useSalesOrdersQuery, useSalesOrderQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CreateInvoiceFormProps = {
  onClose: () => void;
};

export function CreateInvoiceForm({ onClose }: CreateInvoiceFormProps) {
  
  const createInvoice = useCreateInvoiceMutation();
  const salesOrders = useSalesOrdersQuery();
  
  const [formData, setFormData] = useState({
    soId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "DRAFT",
    invoiceType: "VAT",
    notes: "",
    bsDate: "",
    fiscalYear: "",
  });

  const fullOrder = useSalesOrderQuery(formData.soId);
  
  const [lineItems, setLineItems] = useState<Array<{
    productVariantId: string;
    productName: string;
    quantity: string;
    unitPrice: string;
    discountPct: string;
  }>>([]);

  useEffect(() => {
    setLineItems([]);
  }, [formData.soId]);

  useEffect(() => {
    if (fullOrder.data?.lineItems && lineItems.length === 0) {
      setLineItems(
        fullOrder.data.lineItems.map((item: any) => ({
          productVariantId: item.productVariantId,
          productName: item.productVariant.product.name + (item.productVariant.variantName !== "Default" ? ` (${item.productVariant.variantName})` : ""),
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          discountPct: String(item.discountPct || "0"),
        }))
      );
    }
  }, [fullOrder.data]);

  const { subtotal } = useMemo(() => {
    const st = lineItems.reduce((acc, item) => {
      const q = Number(item.quantity) || 0;
      const p = Number(item.unitPrice) || 0;
      const d = Number(item.discountPct) || 0;
      return acc + (q * p * (1 - d / 100));
    }, 0);
    return { subtotal: st };
  }, [lineItems]);

  const vatAmount = formData.invoiceType === "VAT" ? subtotal * 0.13 : 0;
  const totalAmount = subtotal + vatAmount;

  // Find the selected sales order to show reference amount
  const selectedOrder = useMemo(() => {
    if (!formData.soId || !salesOrders.data?.items) return null;
    return salesOrders.data.items.find((so: any) => so.id === formData.soId);
  }, [formData.soId, salesOrders.data]);

  const handleSubmit = async () => {
    if (!formData.soId || lineItems.length === 0) {
      toast("Validation failed", { description: "Please select a sales order and assure line items exist." });
      return;
    }

    if (totalAmount <= 0) {
      toast("Validation failed", { description: "Invoice amount must be greater than 0." });
      return;
    }

    try {
      await createInvoice.mutateAsync({
        soId: formData.soId,
        lineItems: lineItems.map(item => ({
          productVariantId: item.productVariantId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPct: Number(item.discountPct)
        })),
        issueDate: formData.issueDate ? new Date(formData.issueDate).toISOString() : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        status: formData.status,
        invoiceType: formData.invoiceType,
        notes: formData.notes || undefined,
        bsDate: formData.bsDate || undefined,
        fiscalYear: formData.fiscalYear || undefined,
      });
      
      toast("Invoice created", { description: `Invoice generated successfully.` });
      onClose();
    } catch (error) {
      toast.error("Creation failed", { description: getErrorMessage(error) });
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
                  {formatCurrency(selectedOrder.total || 0)}
                </p>
                <p className="text-xs text-amber-600">Order Amount</p>
              </div>
            </div>
            <p className="text-xs text-amber-700 mt-2 border-t border-amber-200 pt-2">
              ⚠️ You can modify the quantities/prices below to issue a partial invoice.
            </p>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Sales Order *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.soId}
              onChange={(e) => setFormData({ ...formData, soId: e.target.value })}
            >
              <option value="">Select a sales order</option>
              {salesOrders.data?.items.map((so: any) => (
                <option key={so.id} value={so.id}>
                  {so.id.slice(-8)} — {so.customer} — {formatCurrency(so.total || 0)}
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
                <option value="ESTIMATE">Estimate Bill (अनुमानित बिल)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {formData.invoiceType === "VAT" ? "13% VAT will be shown on the bill" : 
                 formData.invoiceType === "ESTIMATE" ? "Non-tax estimate for customer reference" : 
                 "No VAT line — PAN number only"}
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
        </div>

        {/* Dynamic Line Items Section matching Sales Order formatting */}
        {lineItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-primary">Invoice Line Items</h4>
              <p className="text-xs text-muted-foreground">Modify quantities below for partial billing</p>
            </div>
            {lineItems.map((item, index) => {
              const q = Number(item.quantity) || 0;
              const p = Number(item.unitPrice) || 0;
              const d = Number(item.discountPct) || 0;
              const rowTotal = q * p * (1 - d / 100);
              
              return (
                <div key={index} className="grid gap-3 md:grid-cols-12 items-center bg-white p-3 rounded-xl border border-border">
                  {/* Product Name (readonly since inherited) */}
                  <div className="md:col-span-4">
                    <Input disabled value={item.productName} className="font-medium bg-gray-50/50" />
                  </div>
                  
                  {/* Quantity */}
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold px-1 tracking-wider">Qty</span>
                      <Input 
                        placeholder="Qty" 
                        type="number"
                        min="1"
                        value={item.quantity} 
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].quantity = e.target.value;
                          setLineItems(newItems);
                        }} 
                      />
                    </div>
                  </div>
                  
                  {/* Unit Price */}
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold px-1 tracking-wider">Price</span>
                      <Input 
                        placeholder="Price" 
                        type="number"
                        step="0.01"
                        value={item.unitPrice} 
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].unitPrice = e.target.value;
                          setLineItems(newItems);
                        }} 
                      />
                    </div>
                  </div>
                  
                  {/* Discount */}
                  <div className="md:col-span-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase text-muted-foreground font-semibold px-1 tracking-wider">Discount %</span>
                      <Input 
                        placeholder="%" 
                        type="number"
                        min="0"
                        max="100"
                        value={item.discountPct} 
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].discountPct = e.target.value;
                          setLineItems(newItems);
                        }} 
                      />
                    </div>
                  </div>
                  
                  {/* Total and Remove */}
                  <div className="md:col-span-2 flex items-center justify-between pl-2">
                    <span className="font-semibold text-sm">
                      {formatCurrency(rowTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLineItems(lineItems.filter((_, i) => i !== index))}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors flex shrink-0 items-center justify-center opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                      aria-label="Remove item"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Auto-calculated Invoice Totals */}
            <div className="flex justify-end pt-4 border-t mt-4">
              <div className="w-full md:w-1/2 lg:w-1/3 space-y-2 text-sm bg-white p-4 rounded-xl border border-primary/20 shadow-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-medium">Subtotal</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {formData.invoiceType === "VAT" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">VAT (13%)</span>
                    <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t mt-2 text-primary">
                  <span>Total Due</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nepal Legal Info */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
