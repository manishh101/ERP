import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreatePurchaseOrderMutation, useSuppliersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  Calendar, 
  Truck, 
  FileText,
  Package,
  Layers
} from "lucide-react";

type CreatePurchaseOrderFormProps = {
  onClose: () => void;
};

type POLineItemState = {
  productVariantId?: string;
  productName: string;
  sku?: string;
  quantity: string;
  unitCost: string;
  taxMode: "EXEMPT_0" | "VAT_13" | "CUSTOM";
  taxAmount: string;
};

export function CreatePurchaseOrderForm({ onClose }: CreatePurchaseOrderFormProps) {
  const createPO = useCreatePurchaseOrderMutation();
  const suppliers = useSuppliersQuery();
  
  const [formData, setFormData] = useState({
    supplierId: "",
    status: "DRAFT",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDelivery: "",
    shippingTerms: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<POLineItemState[]>([
    { productName: "", quantity: "1", unitCost: "0", taxMode: "EXEMPT_0", taxAmount: "0" }
  ]);

  const updateLineItem = (index: number, updates: Partial<POLineItemState>) => {
    const newItems = [...lineItems];
    const current = newItems[index];
    const updated = { ...current, ...updates };

    const qty = Number(updated.quantity) || 0;
    const cost = Number(updated.unitCost) || 0;
    const subtotal = qty * cost;

    if (updated.taxMode === "VAT_13") {
      updated.taxAmount = (subtotal * 0.13).toFixed(2);
    } else if (updated.taxMode === "EXEMPT_0") {
      updated.taxAmount = "0";
    }

    newItems[index] = updated;
    setLineItems(newItems);
  };

  const handleProductNameChange = (index: number, value: string) => {
    updateLineItem(index, { productName: value, productVariantId: undefined, sku: undefined });
  };

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      { productName: "", quantity: "1", unitCost: "0", taxMode: "EXEMPT_0", taxAmount: "0" }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) {
      toast.error("At least one line item is required.");
      return;
    }
    const newItems = [...lineItems];
    newItems.splice(index, 1);
    setLineItems(newItems);
  };

  const handleSubmit = async () => {
    if (!formData.supplierId || !formData.orderDate) {
      toast.error("Validation failed", { description: "Please select a supplier and order date." });
      return;
    }

    const validLineItems = lineItems.filter(
      item => item.productName.trim() && Number(item.quantity) > 0
    );

    if (validLineItems.length === 0) {
      toast.error("Validation failed", { description: "Please add at least one valid line item with product name and quantity > 0." });
      return;
    }

    try {
      await createPO.mutateAsync({
        supplierId: formData.supplierId,
        status: formData.status,
        orderDate: new Date(formData.orderDate).toISOString(),
        expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery).toISOString() : undefined,
        shippingTerms: formData.shippingTerms.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        lineItems: validLineItems.map(item => ({
          productVariantId: item.productVariantId,
          productName: item.productName.trim(),
          sku: item.sku,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          taxAmount: Number(item.taxAmount) || 0
        }))
      });
      
      toast.success("Purchase Order created", { description: "PO generated and new product records saved to catalog for future procurement cycles." });
      onClose();
    } catch (error) {
      toast.error("Creation failed", { description: getErrorMessage(error) });
    }
  };

  // Financial summary
  const subtotal = lineItems.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitCost) || 0), 0);
  const totalTax = lineItems.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
  const grandTotal = subtotal + totalTax;

  return (
    <Card className="mb-6 border-primary/20 bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Create Purchase Order
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Issue a purchase order to a supplier. Enter raw materials or items you are procuring — these are kept separate from your company's sellable product catalog.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Form Metadata Section */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 bg-muted/30 p-4 rounded-xl border border-border/50">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Supplier *
            </label>
            <select 
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            >
              <option value="">Select a supplier</option>
              {suppliers.data?.items.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.panNo ? `(PAN: ${s.panNo})` : ""}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <Layers className="h-3.5 w-3.5 text-muted-foreground" />
              Status
            </label>
            <select 
              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Order Date *
            </label>
            <NepaliDatePickerInput 
              value={formData.orderDate} 
              onChange={(date) => setFormData({ ...formData, orderDate: date.toISOString().split("T")[0] })} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              Expected Delivery
            </label>
            <NepaliDatePickerInput 
              value={formData.expectedDelivery} 
              onChange={(date) => setFormData({ ...formData, expectedDelivery: date.toISOString().split("T")[0] })} 
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              Shipping / Delivery Terms
            </label>
            <Input 
              className="h-10 rounded-xl"
              placeholder="e.g. Freight Paid by Supplier, Delivery at Kathmandu Warehouse" 
              value={formData.shippingTerms} 
              onChange={(e) => setFormData({ ...formData, shippingTerms: e.target.value })} 
            />
          </div>

          <div className="space-y-1.5 md:col-span-2 lg:col-span-3">
            <label className="text-xs font-semibold flex items-center gap-1.5 text-foreground/80">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              Internal Notes / Instructions
            </label>
            <Input 
              className="h-10 rounded-xl"
              placeholder="Add any internal procurement remarks or payment instructions..." 
              value={formData.notes} 
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <div>
              <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                Purchased Line Items
                <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {lineItems.length} {lineItems.length === 1 ? "item" : "items"}
                </span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter raw materials or items you are buying from this supplier. Subtotal, Tax/VAT, and Line Total calculate automatically.
              </p>
            </div>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={handleAddItem}
              className="rounded-xl border-dashed border-primary/40 hover:border-primary text-primary"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Line Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => {
              const qty = Number(item.quantity) || 0;
              const cost = Number(item.unitCost) || 0;
              const lineSubtotal = qty * cost;
              const lineTax = Number(item.taxAmount) || 0;
              const lineTotal = lineSubtotal + lineTax;

              const isCatalogProduct = Boolean(item.productVariantId);
              const hasTypedName = Boolean(item.productName.trim());

              return (
                <div key={index} className="bg-card p-3 rounded-2xl border border-border shadow-xs hover:border-primary/30 transition-all">
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-12 items-center">
                    {/* Item Name Input */}
                    <div className="md:col-span-4 space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-semibold text-muted-foreground">Product / Item Name *</label>
                        {hasTypedName && (
                          isCatalogProduct ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded-md">
                              <CheckCircle2 className="h-3 w-3" /> Known Item
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.2 rounded-md">
                              <Sparkles className="h-3 w-3" /> New Procurement Item
                            </span>
                          )
                        )}
                      </div>
                      <Input 
                        className="h-10 rounded-xl text-sm"
                        placeholder="e.g. Steel Rod 12mm, Enamel Paint 1L, Handle Screws" 
                        value={item.productName} 
                        onChange={(e) => handleProductNameChange(index, e.target.value)} 
                      />
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Quantity *</label>
                      <Input 
                        placeholder="Qty" 
                        type="number"
                        min="1"
                        className="h-10 rounded-xl text-sm"
                        value={item.quantity} 
                        onChange={(e) => updateLineItem(index, { quantity: e.target.value })} 
                      />
                    </div>

                    {/* Unit Cost */}
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Unit Cost (Rs.) *</label>
                      <Input 
                        placeholder="Unit Cost" 
                        type="number"
                        step="0.01"
                        className="h-10 rounded-xl text-sm"
                        value={item.unitCost} 
                        onChange={(e) => updateLineItem(index, { unitCost: e.target.value })} 
                      />
                    </div>

                    {/* Tax Mode & Amount */}
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground">Tax / VAT</label>
                      <div className="flex gap-1.5">
                        <select
                          className="h-10 rounded-xl border border-input bg-background px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring w-28 shrink-0"
                          value={item.taxMode}
                          onChange={(e) => updateLineItem(index, { taxMode: e.target.value as POLineItemState["taxMode"] })}
                        >
                          <option value="EXEMPT_0">0% Exempt</option>
                          <option value="VAT_13">13% VAT</option>
                          <option value="CUSTOM">Custom</option>
                        </select>

                        <Input 
                          placeholder="Tax Rs." 
                          type="number"
                          step="0.01"
                          disabled={item.taxMode !== "CUSTOM"}
                          className="h-10 rounded-xl text-sm disabled:opacity-80 disabled:bg-muted/40"
                          value={item.taxAmount} 
                          onChange={(e) => updateLineItem(index, { taxMode: "CUSTOM", taxAmount: e.target.value })} 
                        />
                      </div>
                    </div>

                    {/* Action / Item Total */}
                    <div className="md:col-span-1 flex items-end justify-end pt-4 md:pt-0">
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon"
                        className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={() => handleRemoveItem(index)}
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Line Total preview */}
                  <div className="mt-2 flex flex-wrap items-center justify-between border-t pt-1.5 text-[11px] text-muted-foreground gap-2">
                    <div className="flex items-center gap-2">
                      <span>Subtotal: <strong className="text-foreground">Rs. {lineSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      <span>•</span>
                      <span>Tax/VAT: <strong className="text-foreground">Rs. {lineTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    </div>
                    <div>
                      Line Total: <span className="font-bold text-foreground text-xs">Rs. {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Totals & Actions */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t gap-4">
          <div className="bg-muted/30 px-4 py-3 rounded-2xl border border-border/40 w-full md:w-auto">
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Subtotal</span>
                <span className="font-semibold text-foreground">Rs. {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-l pl-6">
                <span className="text-xs text-muted-foreground block">Total Tax</span>
                <span className="font-semibold text-foreground">Rs. {totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="border-l pl-6">
                <span className="text-xs text-muted-foreground block">Grand Total</span>
                <span className="font-bold text-primary text-base">Rs. {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto justify-end">
            <Button variant="outline" onClick={onClose} disabled={createPO.isPending} className="rounded-xl px-5">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createPO.isPending} className="rounded-xl px-6 font-semibold">
              {createPO.isPending ? "Generating Order..." : "Save Purchase Order"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
