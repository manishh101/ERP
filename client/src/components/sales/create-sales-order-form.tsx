import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateSalesOrderMutation, useCustomersQuery, useProductsQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { formatCurrency, toNumber } from "@/lib/utils";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { CreateProductForm } from "@/components/inventory/create-product-form";

type CreateSalesOrderFormProps = {
  onClose: () => void;
};

export function CreateSalesOrderForm({ onClose }: CreateSalesOrderFormProps) {
  const { push } = useToast();
  const createSO = useCreateSalesOrderMutation();
  const customers = useCustomersQuery();
  const products = useProductsQuery();
  
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [formData, setFormData] = useState({
    customerId: "",
    status: "QUOTE",
    depositAmount: "0",
    deliveryDate: "",
    notes: "",
    isCustomOrder: false,
    expectedReadyDate: "",
  });
  
  const [lineItems, setLineItems] = useState([{ 
    productVariantId: "", 
    quantity: "", 
    unitPrice: "", 
    discountPct: "",
    isCustom: false,
    fabricColor: "",
    woodFinish: "",
    customizationNotes: ""
  }]);

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
        isCustomOrder: formData.isCustomOrder,
        expectedReadyDate: formData.expectedReadyDate ? new Date(formData.expectedReadyDate).toISOString() : undefined,
        lineItems: validLineItems.map(item => ({
          productVariantId: item.productVariantId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPct: Number(item.discountPct),
          isCustom: item.isCustom,
          fabricColor: item.fabricColor || undefined,
          woodFinish: item.woodFinish || undefined,
          customizationNotes: item.customizationNotes || undefined
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
      {createCustomerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative rounded-[2rem]">
            <CreateCustomerForm onClose={() => setCreateCustomerOpen(false)} />
          </div>
        </div>
      )}
      {createProductOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative rounded-[2rem]">
            <CreateProductForm onClose={() => setCreateProductOpen(false)} />
          </div>
        </div>
      )}
      <CardHeader>
        <div>
          <CardTitle>Create Sales Order</CardTitle>
          <CardDescription>Draft a new quote or sales order for a customer.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium">Customer *</label>
              <Button 
                variant="link" 
                className="h-auto p-0 text-xs text-primary" 
                onClick={(e) => {
                  e.preventDefault();
                  setCreateCustomerOpen(true);
                }}
              >
                + New Customer
              </Button>
            </div>
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
          <div className="flex items-center gap-2 px-4 h-11 border border-border bg-white/90 rounded-2xl">
            <input 
              type="checkbox" 
              id="isCustomOrder"
              checked={formData.isCustomOrder} 
              onChange={(e) => setFormData({ ...formData, isCustomOrder: e.target.checked })} 
            />
            <label htmlFor="isCustomOrder" className="text-sm">Custom Project <span className="text-xs text-muted-foreground">(bespoke order)</span></label>
          </div>
          {formData.isCustomOrder && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expected Ready Date</label>
                <NepaliDatePickerInput 
                  value={formData.expectedReadyDate} 
                  onChange={(date) => setFormData({ ...formData, expectedReadyDate: date.toISOString().split("T")[0] })} 
                />
              </div>
              <Input 
                className="md:col-span-1 lg:col-span-1"
                placeholder="Internal or Customer Notes" 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              />
            </>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Line Items</h4>
            <div className="flex gap-2">
              <Button 
                variant="link" 
                className="h-9 px-2 text-primary"
                onClick={() => setCreateProductOpen(true)}
              >
                + New Product
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setLineItems([...lineItems, { 
                  productVariantId: "", 
                  quantity: "", 
                  unitPrice: "", 
                  discountPct: "",
                  isCustom: false,
                  fabricColor: "",
                  woodFinish: "",
                  customizationNotes: ""
                }])}
              >
                Add Item
              </Button>
            </div>
          </div>
          {lineItems.map((item, index) => {
            const rowTotal = toNumber(item.quantity) * toNumber(item.unitPrice) * (1 - (toNumber(item.discountPct) / 100));
            
            return (
              <div key={index} className="grid gap-3 md:grid-cols-12 items-center bg-white p-3 rounded-xl border border-border">
                <div className="md:col-span-4">
                  <select 
                    className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={products.data?.items.find(p => p.defaultVariantId === item.productVariantId)?.id || ""}
                    onChange={(e) => {
                      const productId = e.target.value;
                      const newItems = [...lineItems];
                      const selectedProduct = products.data?.items.find(p => p.id === productId);
                      
                      if (selectedProduct) {
                        newItems[index].productVariantId = selectedProduct.defaultVariantId;
                        newItems[index].unitPrice = String(selectedProduct.sellingPrice);
                        if (!newItems[index].quantity) newItems[index].quantity = "1";
                        if (!newItems[index].discountPct) newItems[index].discountPct = "0";
                      } else {
                        newItems[index].productVariantId = "";
                      }
                      setLineItems(newItems);
                    }}
                  >
                    <option value="">Select a Product</option>
                    {products.data?.items.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-1">
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
                </div>
                <div className="md:col-span-2">
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
                </div>
                <div className="md:col-span-2">
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
                </div>
                <div className="md:col-span-2">
                  <div className="h-11 flex items-center px-4 bg-muted/30 rounded-2xl text-sm font-medium">
                    {formatCurrency(rowTotal)}
                  </div>
                </div>
                <div className="md:col-span-1 flex justify-end">
                  <Button 
                    variant="ghost" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full w-9 h-9 p-0"
                    onClick={() => {
                      const newItems = [...lineItems];
                      newItems.splice(index, 1);
                      setLineItems(newItems);
                    }}
                  >
                    X
                  </Button>
                </div>
                {item.productVariantId && (
                  <div className="md:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-dashed mt-1">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        checked={item.isCustom}
                        onChange={(e) => {
                          const newItems = [...lineItems];
                          newItems[index].isCustom = e.target.checked;
                          setLineItems(newItems);
                        }}
                      />
                      <label className="text-xs font-medium">Custom Specs <span className="text-muted-foreground">(fabric/finish)</span></label>
                    </div>
                    {item.isCustom && (
                      <>
                        <Input 
                          placeholder="Fabric Color" 
                          className="h-8 text-xs"
                          value={item.fabricColor}
                          onChange={(e) => {
                            const newItems = [...lineItems];
                            newItems[index].fabricColor = e.target.value;
                            setLineItems(newItems);
                          }}
                        />
                        <Input 
                          placeholder="Wood Finish" 
                          className="h-8 text-xs"
                          value={item.woodFinish}
                          onChange={(e) => {
                            const newItems = [...lineItems];
                            newItems[index].woodFinish = e.target.value;
                            setLineItems(newItems);
                          }}
                        />
                        <Input 
                          placeholder="Customization Notes" 
                          className="h-8 text-xs"
                          value={item.customizationNotes}
                          onChange={(e) => {
                            const newItems = [...lineItems];
                            newItems[index].customizationNotes = e.target.value;
                            setLineItems(newItems);
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {lineItems.length > 0 && (
            <div className="flex justify-end pt-2 px-3">
              <div className="text-right">
                <span className="text-sm text-muted-foreground mr-4">Total Order Value:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(lineItems.reduce((sum, item) => 
                    sum + (toNumber(item.quantity) * toNumber(item.unitPrice) * (1 - (toNumber(item.discountPct) / 100))), 0))}
                </span>
              </div>
            </div>
          )}
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
