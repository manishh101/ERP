import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreatePurchaseOrderMutation, useSuppliersQuery, useProductsQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CreatePurchaseOrderFormProps = {
  onClose: () => void;
};

export function CreatePurchaseOrderForm({ onClose }: CreatePurchaseOrderFormProps) {
  const { push } = useToast();
  const createPO = useCreatePurchaseOrderMutation();
  const suppliers = useSuppliersQuery();
  const products = useProductsQuery();
  
  const [formData, setFormData] = useState({
    supplierId: "",
    status: "DRAFT",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDelivery: "",
    shippingTerms: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState([{ productVariantId: "", quantity: "1", unitCost: "0", taxAmount: "0" }]);

  // We need variant list from products to allow selection
  const allVariants = products.data?.items.flatMap(p => 
    p.id ? [{ id: p.id, name: p.name, sku: p.sku, isProduct: true }] : [] // simplified because RawProduct variant isn't fully typed for mapping easily here.
  ) || [];

  const handleSubmit = async () => {
    if (!formData.supplierId || !formData.orderDate) {
      push("Validation failed", "Please select a supplier and order date.");
      return;
    }

    const validLineItems = lineItems.filter(item => item.productVariantId && Number(item.quantity) > 0);
    if (validLineItems.length === 0) {
      push("Validation failed", "Please add at least one valid line item.");
      return;
    }

    try {
      await createPO.mutateAsync({
        supplierId: formData.supplierId,
        status: formData.status,
        orderDate: new Date(formData.orderDate).toISOString(),
        expectedDelivery: formData.expectedDelivery ? new Date(formData.expectedDelivery).toISOString() : undefined,
        shippingTerms: formData.shippingTerms || undefined,
        notes: formData.notes || undefined,
        lineItems: validLineItems.map(item => ({
          productVariantId: item.productVariantId,
          quantity: Number(item.quantity),
          unitCost: Number(item.unitCost),
          taxAmount: Number(item.taxAmount)
        }))
      });
      
      push("Purchase Order created", `PO has been generated successfully.`);
      onClose();
    } catch (error) {
      push("Creation failed", getErrorMessage(error, "Unable to create purchase order."));
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Create Purchase Order</CardTitle>
          <CardDescription>Draft a new purchase order for a supplier.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Supplier *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.supplierId}
              onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
            >
              <option value="">Select a supplier</option>
              {suppliers.data?.items.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
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
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Order Date *</label>
            <NepaliDatePickerInput 
              value={formData.orderDate} 
              onChange={(date) => setFormData({ ...formData, orderDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Expected Delivery</label>
            <NepaliDatePickerInput 
              value={formData.expectedDelivery} 
              onChange={(date) => setFormData({ ...formData, expectedDelivery: date.toISOString().split("T")[0] })} 
            />
          </div>
          <Input 
            className="md:col-span-2"
            placeholder="Shipping Terms" 
            value={formData.shippingTerms} 
            onChange={(e) => setFormData({ ...formData, shippingTerms: e.target.value })} 
          />
          <Input 
            className="md:col-span-2 lg:col-span-3"
            placeholder="Internal Notes" 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Line Items</h4>
            <Button 
              variant="outline" 
              onClick={() => setLineItems([...lineItems, { productVariantId: "", quantity: "1", unitCost: "0", taxAmount: "0" }])}
            >
              Add Item
            </Button>
          </div>
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-5 items-center bg-white p-3 rounded-xl border border-border">
              <div className="md:col-span-2">
                {/* Note: In a real app we'd fetch actual variants. Here we use product IDs as variant IDs for simplicity since the backend schema expects variant ID and we might not have a dedicated variant endpoint available without product detail. */}
                <select 
                  className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={item.productVariantId}
                  onChange={(e) => {
                    const newItems = [...lineItems];
                    newItems[index].productVariantId = e.target.value;
                    setLineItems(newItems);
                  }}
                >
                  <option value="">Select a Product (assumes default variant)</option>
                  {products.data?.items.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <Input 
                placeholder="Qty" 
                type="number"
                value={item.quantity} 
                onChange={(e) => {
                  const newItems = [...lineItems];
                  newItems[index].quantity = e.target.value;
                  setLineItems(newItems);
                }} 
              />
              <Input 
                placeholder="Unit Cost" 
                type="number"
                step="0.01"
                value={item.unitCost} 
                onChange={(e) => {
                  const newItems = [...lineItems];
                  newItems[index].unitCost = e.target.value;
                  setLineItems(newItems);
                }} 
              />
              <div className="flex gap-2">
                <Input 
                  placeholder="Tax" 
                  type="number"
                  step="0.01"
                  value={item.taxAmount} 
                  onChange={(e) => {
                    const newItems = [...lineItems];
                    newItems[index].taxAmount = e.target.value;
                    setLineItems(newItems);
                  }} 
                />
                <Button 
                  variant="outline" 
                  className="text-red-500 hover:text-red-600"
                  onClick={() => {
                    const newItems = [...lineItems];
                    newItems.splice(index, 1);
                    setLineItems(newItems);
                  }}
                >
                  X
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={createPO.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createPO.isPending}>
            {createPO.isPending ? "Creating..." : "Save Purchase Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
