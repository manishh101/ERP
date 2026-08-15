import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
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
  const [lineItems, setLineItems] = useState<Array<{
    productVariantId?: string;
    customProductName?: string;
    quantity: string;
    unitPrice: string;
    discountPct: string;
    isCustom: boolean;
    fabricColor: string;
    woodFinish: string;
    customizationNotes: string;
    discountAmount: string;
  }>>([{ 
    productVariantId: "", 
    customProductName: undefined,
    quantity: "", 
    unitPrice: "", 
    discountPct: "0",
    discountAmount: "0",
    isCustom: false,
    fabricColor: "",
    woodFinish: "",
    customizationNotes: ""
  }]);

  const handleSubmit = async () => {
    if (!formData.customerId) {
      toast("Validation failed", { description: "Please select a customer." });
      return;
    }

    const validLineItems = lineItems.filter(item => (item.productVariantId || item.customProductName) && Number(item.quantity) > 0);
    if (validLineItems.length === 0) {
      toast("Validation failed", { description: "Please add at least one valid line item with quantity." });
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
          productVariantId: item.productVariantId || undefined,
          customProductName: item.customProductName || undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPct: Number(item.discountPct),
          discountAmount: Number(item.discountAmount),
          isCustom: item.isCustom,
          fabricColor: item.fabricColor || undefined,
          woodFinish: item.woodFinish || undefined,
          customizationNotes: item.customizationNotes || undefined
        }))
      });
      
      toast("Sales Order created", { description: `Sales order/quote has been generated successfully.` });
      onClose();
    } catch (error) {
      toast.error("Creation failed", { description: getErrorMessage(error) });
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
      <CardContent className="space-y-8 pt-2 pb-8">
        {/* ── Row 1: Customer + Status ── */}
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold">Customer *</label>
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
            <CustomerPicker 
              customers={customers.data?.items ?? []} 
              selectedId={formData.customerId}
              onSelect={(customerId) => setFormData({ ...formData, customerId })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Status</label>
            <select 
              className="flex h-12 w-full rounded-xl border border-border bg-white px-4 text-sm font-medium"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="QUOTE">Draft / Quote</option>
              <option value="CONFIRMED">Confirmed Order</option>
            </select>
          </div>
        </div>

        {/* ── Row 2: Delivery Date + Deposit + Custom Project ── */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Delivery Date</label>
            <NepaliDatePickerInput 
              value={formData.deliveryDate} 
              onChange={(date) => setFormData({ ...formData, deliveryDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Deposit Amount</label>
            <Input 
              type="number"
              step="0.01"
              className="h-12"
              value={formData.depositAmount} 
              onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold">Project Type</label>
            <div className="flex items-center gap-3 h-12 border border-border bg-white px-4 rounded-xl">
              <input 
                type="checkbox" 
                id="isCustomOrder"
                className="w-4 h-4"
                checked={formData.isCustomOrder} 
                onChange={(e) => setFormData({ ...formData, isCustomOrder: e.target.checked })} 
              />
              <label htmlFor="isCustomOrder" className="text-sm cursor-pointer">Custom <span className="text-xs text-muted-foreground">(bespoke)</span></label>
            </div>
          </div>
        </div>

        {/* ── Custom project extra fields ── */}
        {formData.isCustomOrder && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Expected Ready Date</label>
              <NepaliDatePickerInput 
                value={formData.expectedReadyDate} 
                onChange={(date) => setFormData({ ...formData, expectedReadyDate: date.toISOString().split("T")[0] })} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Notes</label>
              <Input 
                className="h-12"
                placeholder="Internal or customer notes" 
                value={formData.notes} 
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
              />
            </div>
          </div>
        )}

        {/* ── Line Items ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Line Items</h4>
            <div className="flex gap-2">
              <Button 
                variant="link" 
                className="h-9 px-2 text-primary text-xs"
                onClick={() => setCreateProductOpen(true)}
              >
                + New Product
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setLineItems([...lineItems, { 
                  productVariantId: "", 
                  customProductName: undefined,
                  quantity: "", 
                  unitPrice: "", 
                  discountPct: "0",
                  discountAmount: "0",
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
            const rowGross = toNumber(item.quantity) * toNumber(item.unitPrice);
            const rowDiscAmt = toNumber(item.discountAmount);
            const rowTotal = rowGross - rowDiscAmt;
            
            return (
              <div key={index} className="grid gap-3 md:grid-cols-12 items-center bg-white p-4 rounded-xl border border-border">
                <div className="md:col-span-4 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Product</label>
                    <button 
                      type="button"
                      className="text-[10px] text-primary hover:underline font-medium"
                      onClick={() => {
                        setLineItems(lineItems.map((it, idx) => 
                          idx === index 
                            ? (it.customProductName === undefined 
                                ? { ...it, productVariantId: undefined, customProductName: "" } 
                                : { ...it, productVariantId: "", customProductName: undefined })
                            : it
                        ));
                      }}
                    >
                      {item.customProductName !== undefined ? "Select from catalog" : "Enter manually"}
                    </button>
                  </div>
                  {item.customProductName !== undefined ? (
                    <Input 
                      placeholder="Enter product name..."
                      className="h-11 rounded-2xl border-primary/20 focus:border-primary"
                      value={item.customProductName}
                      onChange={(e) => {
                        setLineItems(lineItems.map((it, idx) => 
                          idx === index ? { ...it, customProductName: e.target.value } : it
                        ));
                      }}
                    />
                  ) : (
                    <select 
                      className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={products.data?.items.find(p => p.defaultVariantId === item.productVariantId)?.id || ""}
                      onChange={(e) => {
                        const productId = e.target.value;
                        const selectedProduct = products.data?.items.find(p => p.id === productId);
                        setLineItems(lineItems.map((it, idx) => 
                          idx === index 
                            ? { 
                                ...it, 
                                productVariantId: selectedProduct?.defaultVariantId || "", 
                                unitPrice: selectedProduct ? String(selectedProduct.sellingPrice) : it.unitPrice,
                                quantity: (!it.quantity && selectedProduct) ? "1" : it.quantity
                              } 
                            : it
                        ));
                      }}
                    >
                      <option value="">Select a Product</option>
                      {products.data?.items.map(p => {
                        const sizeDisplay = p.sizeLabel && p.sizeLabel !== "Standard" 
                          ? p.sizeLabel 
                          : (p.height || p.width || p.length) 
                            ? `${p.height || 0}x${p.width || 0}x${p.length || 0}`
                            : "";
                        return (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku}) {sizeDisplay ? `- ${sizeDisplay}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Qty</label>
                  <Input 
                    placeholder="0" 
                    type="number"
                    className="h-11 rounded-2xl"
                    value={item.quantity} 
                    onChange={(e) => {
                      const qtyStr = e.target.value;
                      const qty = Number(qtyStr) || 0;
                      const price = Number(item.unitPrice) || 0;
                      
                      setLineItems(lineItems.map((it, idx) => {
                        if (idx !== index) return it;
                        const updated = { ...it, quantity: qtyStr };
                        if (qty * price > 0) {
                          const pct = (Number(it.discountAmount) / (qty * price)) * 100;
                          updated.discountPct = String(Math.round(pct * 100) / 100);
                        }
                        return updated;
                      }));
                    }} 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Unit Price</label>
                  <Input 
                    placeholder="0.00" 
                    type="number"
                    step="0.01"
                    className="h-11 rounded-2xl"
                    value={item.unitPrice} 
                    onChange={(e) => {
                      const priceStr = e.target.value;
                      const price = Number(priceStr) || 0;
                      const qty = Number(item.quantity) || 0;
                      
                      setLineItems(lineItems.map((it, idx) => {
                        if (idx !== index) return it;
                        const updated = { ...it, unitPrice: priceStr };
                        if (qty * price > 0) {
                          const pct = (Number(it.discountAmount) / (qty * price)) * 100;
                          updated.discountPct = String(Math.round(pct * 100) / 100);
                        }
                        return updated;
                      }));
                    }} 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Disc %</label>
                  <Input 
                    placeholder="0" 
                    type="number"
                    step="0.1"
                    className="h-11 rounded-2xl"
                    value={item.discountPct} 
                    onChange={(e) => {
                      const pct = e.target.value;
                      const qty = Number(item.quantity) || 0;
                      const price = Number(item.unitPrice) || 0;
                      
                      setLineItems(lineItems.map((it, idx) => {
                        if (idx !== index) return it;
                        const amt = (qty * price) * (Number(pct) / 100);
                        return { 
                          ...it, 
                          discountPct: pct, 
                          discountAmount: String(Math.round(amt * 100) / 100) 
                        };
                      }));
                    }} 
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Disc Amt</label>
                  <Input 
                    placeholder="0" 
                    type="number"
                    step="1"
                    className="h-11 rounded-2xl"
                    value={item.discountAmount} 
                    onChange={(e) => {
                      const amt = e.target.value;
                      const qty = Number(item.quantity) || 0;
                      const price = Number(item.unitPrice) || 0;
                      
                      setLineItems(lineItems.map((it, idx) => {
                        if (idx !== index) return it;
                        const updated = { ...it, discountAmount: amt };
                        if (qty * price > 0) {
                          const pct = (Number(amt) / (qty * price)) * 100;
                          updated.discountPct = String(Math.round(pct * 100) / 100);
                        }
                        return updated;
                      }));
                    }} 
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1 mb-1 block">Line Total</label>
                  <Input 
                    type="number"
                    step="0.01"
                    className="h-11 rounded-2xl font-bold"
                    value={((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discountAmount) || 0)).toFixed(2)}
                    onChange={(e) => {
                      const newTotal = Number(e.target.value);
                      const qty = Number(item.quantity) || 0;
                      const price = Number(item.unitPrice) || 0;
                      
                      setLineItems(lineItems.map((it, idx) => {
                        if (idx !== index) return it;
                        const newAmt = (qty * price) - newTotal;
                        const updated = { ...it, discountAmount: String(Math.round(newAmt * 100) / 100) };
                        if (qty * price > 0) {
                          const pct = (newAmt / (qty * price)) * 100;
                          updated.discountPct = String(Math.round(pct * 100) / 100);
                        }
                        return updated;
                      }));
                    }}
                  />
                </div>
                <div className="md:col-span-1 flex justify-end pt-5">
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
                    sum + ((toNumber(item.quantity) * toNumber(item.unitPrice)) - toNumber(item.discountAmount)), 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 justify-end pt-2 border-t">
          <Button variant="outline" size="lg" onClick={onClose} disabled={createSO.isPending}>
            Cancel
          </Button>
          <Button size="lg" onClick={handleSubmit} disabled={createSO.isPending}>
            {createSO.isPending ? "Creating..." : "Save Sales Order"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Searchable Customer Picker ─────────────────────────────────────────────── */

function CustomerPicker({
  customers,
  selectedId,
  onSelect,
}: {
  customers: any[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!query.trim()) return customers;
    const q = query.toLowerCase();
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q));
  }, [customers, query]);

  const selectedCustomer = customers.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      {/* Selected Customer Chip */}
      {selectedCustomer ? (
        <div className="flex h-12 items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-4">
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <p className="text-sm font-semibold text-primary truncate leading-tight">{selectedCustomer.name}</p>
            {selectedCustomer.phone && (
              <p className="text-[10px] text-muted-foreground leading-tight">{selectedCustomer.phone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onSelect("")}
            className="ml-3 shrink-0 text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            Change
          </button>
        </div>
      ) : (
        /* Search Input */
        <div className="relative">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              // Delay hiding to allow click events on the list
              setTimeout(() => setIsOpen(false), 200);
            }}
            className="pl-10 h-12 rounded-xl bg-white"
          />
          {/* Dropdown List */}
          {isOpen && (
            <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-white shadow-lg divide-y divide-border">
              {filteredCustomers.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No customers found.
                </p>
              ) : (
                filteredCustomers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onSelect(c.id);
                      setIsOpen(false);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
