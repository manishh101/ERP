import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateSalesOrderMutation, useCustomersQuery, useProductsQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CreateSalesOrderFormProps = {
  onClose: () => void;
};

export function CreateSalesOrderForm({ onClose }: CreateSalesOrderFormProps) {
  const { push } = useToast();
  const createSO = useCreateSalesOrderMutation();
  const customers = useCustomersQuery();
  const products = useProductsQuery();
  
  const [formData, setFormData] = useState({
    customerId: "",
    status: "QUOTE",
    depositAmount: "0",
    deliveryDate: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState([{ productVariantId: "", quantity: "1", unitPrice: "0", discountPct: "0" }]);

  const handleSubmit = async () => {
    if (!formData.customerId) {
      push("Validation failed", "Please select a customer.");
      return;
    }

    const validLineItems = lineItems.filter(item => item.productVariantId && Number(item.quantity) > 0);
    if (validLineItems.length === 0) {
      push("Validation failed", "Please add at least one valid line item.");
      return;
    }

    try {
      await createSO.mutateAsync({
        customerId: formData.customerId,
        status: formData.status,
        depositAmount: Number(formData.depositAmount),
        deliveryDate: formData.deliveryDate ? new Date(formData.deliveryDate).toISOString() : undefined,
        notes: formData.notes || undefined,
        lineItems: validLineItems.map(item => ({
          productVariantId: item.productVariantId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPct: Number(item.discountPct)
        }))
      });
      
      push("Sales Order created", `Sales order/quote has been generated successfully.`);
      onClose();
    } catch (error) {
      push("Creation failed", getErrorMessage(error, "Unable to create sales order."));
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Create Sales Order</CardTitle>
          <CardDescription>Draft a new quote or sales order for a customer.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Customer *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            >
              <option value="">Select a customer</option>
              {customers.data?.items.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
              <option value="QUOTE">QUOTE</option>
              <option value="CONFIRMED">CONFIRMED</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Delivery Date</label>
            <NepaliDatePickerInput 
              value={formData.deliveryDate} 
              onChange={(date) => setFormData({ ...formData, deliveryDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Deposit Amount</label>
            <Input 
              type="number"
              step="0.01"
              value={formData.depositAmount} 
              onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })} 
            />
          </div>
          <Input 
            className="md:col-span-2 lg:col-span-3"
            placeholder="Internal or Customer Notes" 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Line Items</h4>
            <Button 
              variant="outline" 
              onClick={() => setLineItems([...lineItems, { productVariantId: "", quantity: "1", unitPrice: "0", discountPct: "0" }])}
            >
              Add Item
            </Button>
          </div>
          {lineItems.map((item, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-5 items-center bg-white p-3 rounded-xl border border-border">
              <div className="md:col-span-2">
                <select 
                  className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={item.productVariantId}
                  onChange={(e) => {
                    const newItems = [...lineItems];
                    newItems[index].productVariantId = e.target.value;
                    
                    // Unit price should be entered manually here as ProductRow does not expose it
                    // if needed, we'd fetch RawProduct directly.
                    
                    setLineItems(newItems);
                  }}
                >
                  <option value="">Select a Product</option>
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
                placeholder="Unit Price" 
                type="number"
                step="0.01"
                value={item.unitPrice} 
                onChange={(e) => {
                  const newItems = [...lineItems];
                  newItems[index].unitPrice = e.target.value;
                  setLineItems(newItems);
                }} 
              />
              <div className="flex gap-2">
                <Input 
                  placeholder="Discount %" 
                  type="number"
                  step="0.1"
                  value={item.discountPct} 
                  onChange={(e) => {
                    const newItems = [...lineItems];
                    newItems[index].discountPct = e.target.value;
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
          <Button variant="outline" onClick={onClose} disabled={createSO.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createSO.isPending}>
            {createSO.isPending ? "Creating..." : "Save Sales Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
