import { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Building,
  Sparkles,
  Info,
  X,
  Clock,
  ShieldCheck,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCreateSalesOrderMutation, useCustomersQuery, useProductsQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { formatCurrency, toNumber } from "@/lib/utils";
import { CustomerPicker } from "@/components/sales/customer-picker";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { CreateProductForm } from "@/components/inventory/create-product-form";
import type { ProductRow, ProductVariantOption } from "@/types/domain";

type CreateSalesOrderFormProps = {
  onClose: () => void;
};

interface LineItemState {
  productId?: string;
  productVariantId?: string;
  customProductName?: string;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  discountAmount: string;
  isCustom: boolean;
  fabricColor: string;
  woodFinish: string;
  customizationNotes: string;
  expandedDetails: boolean;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank Transfer" },
  { value: "QR", label: "QR / Fonepay" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "POS / Card" },
  { value: "INSTALLMENT", label: "Installment Plan" },
];

export function CreateSalesOrderForm({ onClose }: CreateSalesOrderFormProps) {
  const createSO = useCreateSalesOrderMutation();
  const customers = useCustomersQuery();
  const products = useProductsQuery();

  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);

  const [customerId, setCustomerId] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isCustomOrder, setIsCustomOrder] = useState(false);
  const [expectedReadyDate, setExpectedReadyDate] = useState("");
  const [depositAmount, setDepositAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  const [lineItems, setLineItems] = useState<LineItemState[]>([
    {
      productId: "",
      productVariantId: "",
      customProductName: undefined,
      quantity: "1",
      unitPrice: "0",
      discountPct: "0",
      discountAmount: "0",
      isCustom: false,
      fabricColor: "",
      woodFinish: "",
      customizationNotes: "",
      expandedDetails: false,
    },
  ]);

  // Derived financial computations
  const financialSummary = useMemo(() => {
    let grossSubtotal = 0;
    let totalDiscount = 0;

    for (const item of lineItems) {
      const q = toNumber(item.quantity);
      const p = toNumber(item.unitPrice);
      const rowGross = q * p;
      const rowDiscount = toNumber(item.discountAmount);

      grossSubtotal += rowGross;
      totalDiscount += rowDiscount;
    }

    const netTotal = Math.max(0, grossSubtotal - totalDiscount);
    const deposit = toNumber(depositAmount);
    const balanceDue = Math.max(0, netTotal - deposit);

    return {
      grossSubtotal,
      totalDiscount,
      netTotal,
      deposit,
      balanceDue,
    };
  }, [lineItems, depositAmount]);

  // Stock inspection helper
  const getVariantStockInfo = (productId?: string, variantId?: string) => {
    if (!productId || !products.data?.items) return null;
    const product = products.data.items.find((p) => p.id === productId);
    if (!product) return null;

    if (!variantId && product.variants && product.variants.length > 0) {
      const defaultVar = product.variants[0];
      return {
        product,
        variant: defaultVar,
        stock: defaultVar.stockQuantity,
      };
    }

    const variant = product.variants?.find((v) => v.id === variantId);
    return {
      product,
      variant,
      stock: variant ? variant.stockQuantity : product.stock,
    };
  };

  // Preset deposit handlers
  const handleDepositPreset = (pct: number) => {
    if (financialSummary.netTotal <= 0) return;
    const amount = (financialSummary.netTotal * (pct / 100)).toFixed(2);
    setDepositAmount(String(Math.round(Number(amount) * 100) / 100));
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: "",
        productVariantId: "",
        customProductName: undefined,
        quantity: "1",
        unitPrice: "0",
        discountPct: "0",
        discountAmount: "0",
        isCustom: false,
        fabricColor: "",
        woodFinish: "",
        customizationNotes: "",
        expandedDetails: false,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) {
      // Clear single item instead of removing
      setLineItems([
        {
          productId: "",
          productVariantId: "",
          customProductName: undefined,
          quantity: "1",
          unitPrice: "0",
          discountPct: "0",
          discountAmount: "0",
          isCustom: false,
          fabricColor: "",
          woodFinish: "",
          customizationNotes: "",
          expandedDetails: false,
        },
      ]);
      return;
    }
    const updated = [...lineItems];
    updated.splice(index, 1);
    setLineItems(updated);
  };

  const handleProductSelect = (index: number, selectedProduct: ProductRow) => {
    const defaultVariant = selectedProduct.variants?.[0];
    const initialPrice = selectedProduct.sellingPrice + (defaultVariant?.additionalCost || 0);

    setLineItems(
      lineItems.map((item, idx) => {
        if (idx !== index) return item;
        const qty = toNumber(item.quantity) || 1;
        const rowDiscount = toNumber(item.discountAmount);
        const newDiscountPct =
          qty * initialPrice > 0 ? ((rowDiscount / (qty * initialPrice)) * 100).toFixed(1) : "0";

        return {
          ...item,
          productId: selectedProduct.id,
          productVariantId: defaultVariant?.id || selectedProduct.defaultVariantId,
          customProductName: undefined,
          quantity: String(qty),
          unitPrice: String(initialPrice),
          discountPct: newDiscountPct,
          fabricColor: defaultVariant?.fabricColor || "",
          woodFinish: defaultVariant?.woodFinish || "",
        };
      })
    );
  };

  const handleVariantSelect = (index: number, variantId: string) => {
    const item = lineItems[index];
    const product = products.data?.items.find((p) => p.id === item.productId);
    const variant = product?.variants?.find((v) => v.id === variantId);

    if (product && variant) {
      const newPrice = product.sellingPrice + (variant.additionalCost || 0);
      setLineItems(
        lineItems.map((it, idx) => {
          if (idx !== index) return it;
          return {
            ...it,
            productVariantId: variant.id,
            unitPrice: String(newPrice),
            fabricColor: variant.fabricColor || it.fabricColor,
            woodFinish: variant.woodFinish || it.woodFinish,
          };
        })
      );
    }
  };

  const handleQuantityChange = (index: number, qtyStr: string) => {
    const qty = Number(qtyStr) || 0;
    setLineItems(
      lineItems.map((it, idx) => {
        if (idx !== index) return it;
        const price = Number(it.unitPrice) || 0;
        const updated = { ...it, quantity: qtyStr };

        if (qty * price > 0) {
          const pct = (Number(it.discountAmount) / (qty * price)) * 100;
          updated.discountPct = String(Math.round(pct * 10) / 10);
        }
        return updated;
      })
    );
  };

  const handleUnitPriceChange = (index: number, priceStr: string) => {
    const price = Number(priceStr) || 0;
    setLineItems(
      lineItems.map((it, idx) => {
        if (idx !== index) return it;
        const qty = Number(it.quantity) || 0;
        const updated = { ...it, unitPrice: priceStr };

        if (qty * price > 0) {
          const pct = (Number(it.discountAmount) / (qty * price)) * 100;
          updated.discountPct = String(Math.round(pct * 10) / 10);
        }
        return updated;
      })
    );
  };

  const handleDiscountPctChange = (index: number, pctStr: string) => {
    const pct = Number(pctStr) || 0;
    setLineItems(
      lineItems.map((it, idx) => {
        if (idx !== index) return it;
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitPrice) || 0;
        const amt = qty * price * (pct / 100);

        return {
          ...it,
          discountPct: pctStr,
          discountAmount: String(Math.round(amt * 100) / 100),
        };
      })
    );
  };

  const handleDiscountAmountChange = (index: number, amtStr: string) => {
    const amt = Number(amtStr) || 0;
    setLineItems(
      lineItems.map((it, idx) => {
        if (idx !== index) return it;
        const qty = Number(it.quantity) || 0;
        const price = Number(it.unitPrice) || 0;
        const updated = { ...it, discountAmount: amtStr };

        if (qty * price > 0) {
          const pct = (amt / (qty * price)) * 100;
          updated.discountPct = String(Math.round(pct * 10) / 10);
        }
        return updated;
      })
    );
  };

  const handleSubmit = async (submitStatus: "QUOTE" | "CONFIRMED") => {
    if (!customerId) {
      toast.error("Customer required", { description: "Please select a customer for this order." });
      return;
    }

    const validLineItems = lineItems.filter(
      (item) => (item.productVariantId || item.customProductName) && Number(item.quantity) > 0
    );

    if (validLineItems.length === 0) {
      toast.error("No items specified", {
        description: "Please add at least one line item with a quantity greater than zero.",
      });
      return;
    }

    // Check for stock availability warnings if confirming immediately
    if (submitStatus === "CONFIRMED") {
      const stockIssues: string[] = [];
      for (const item of validLineItems) {
        if (!item.productVariantId) continue;
        const stockInfo = getVariantStockInfo(item.productId, item.productVariantId);
        if (stockInfo && Number(item.quantity) > stockInfo.stock) {
          stockIssues.push(
            `${stockInfo.product.name} (Req: ${item.quantity}, Available: ${stockInfo.stock})`
          );
        }
      }

      if (stockIssues.length > 0) {
        toast.error("Insufficient Stock Available", {
          description: `Cannot confirm order with insufficient stock:\n${stockIssues.join(", ")}`,
        });
        return;
      }
    }

    try {
      await createSO.mutateAsync({
        customerId,
        status: submitStatus,
        depositAmount: toNumber(depositAmount),
        paymentMethod: toNumber(depositAmount) > 0 ? paymentMethod : undefined,
        deliveryDate: deliveryDate ? new Date(deliveryDate).toISOString() : undefined,
        notes: notes || undefined,
        isCustomOrder,
        expectedReadyDate: expectedReadyDate ? new Date(expectedReadyDate).toISOString() : undefined,
        lineItems: validLineItems.map((item) => ({
          productVariantId: item.productVariantId || undefined,
          customProductName: item.customProductName || undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountPct: Number(item.discountPct) || 0,
          discountAmount: Number(item.discountAmount) || 0,
          isCustom: item.isCustom,
          fabricColor: item.fabricColor || undefined,
          woodFinish: item.woodFinish || undefined,
          customizationNotes: item.customizationNotes || undefined,
        })),
      });

      toast.success(
        submitStatus === "CONFIRMED" ? "Sales Order Confirmed" : "Sales Quote Drafted",
        {
          description:
            submitStatus === "CONFIRMED"
              ? "Order confirmed! Stock reserved and AR balance updated."
              : "Draft quote created successfully.",
        }
      );
      onClose();
    } catch (error) {
      toast.error("Order creation failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="relative space-y-6">
      {/* Sub-modals for inline creation */}
      {createCustomerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 p-4 sm:p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative rounded-3xl shadow-2xl bg-card border border-border">
            <CreateCustomerForm onClose={() => setCreateCustomerOpen(false)} />
          </div>
        </div>
      )}
      {createProductOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/40 p-4 sm:p-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto relative rounded-3xl shadow-2xl bg-card border border-border">
            <CreateProductForm onClose={() => setCreateProductOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Order Workspace Card */}
      <Card className="border-primary/20 shadow-md bg-gradient-to-b from-card to-muted/20">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Package className="h-4 w-4" />
                </span>
                <CardTitle className="text-xl font-bold">New Sales Order</CardTitle>
              </div>
              <CardDescription>
                Fast-entry sales workspace with live inventory allocation and commercial payment terms.
              </CardDescription>
            </div>

            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-8">
          {/* ── SECTION 1: Customer Context ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-primary" />
                1. Customer & Account Context <span className="text-rose-500">*</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 px-2"
                onClick={() => setCreateCustomerOpen(true)}
              >
                <Plus className="h-3 w-3 mr-1" />
                New Customer
              </Button>
            </div>

            <CustomerPicker
              customers={customers.data?.items ?? []}
              selectedId={customerId}
              onSelect={setCustomerId}
              onAddNew={() => setCreateCustomerOpen(true)}
              isLoading={customers.isLoading}
            />
          </div>

          {/* ── SECTION 2: Order Details & Dates ── */}
          <div className="rounded-2xl border bg-card/60 p-4 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              2. Order Configuration & Schedule
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Delivery Date (BS / AD)</label>
                <NepaliDatePickerInput
                  value={deliveryDate}
                  onChange={(date) => setDeliveryDate(date.toISOString().split("T")[0])}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Project Classification</label>
                <div
                  className="flex items-center gap-3 h-12 border border-border/80 bg-background px-4 rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => setIsCustomOrder(!isCustomOrder)}
                >
                  <input
                    type="checkbox"
                    id="isCustomOrderToggle"
                    checked={isCustomOrder}
                    onChange={(e) => setIsCustomOrder(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <label htmlFor="isCustomOrderToggle" className="text-xs font-medium cursor-pointer flex-1">
                    Bespoke Custom Furniture{" "}
                    <span className="text-[10px] text-muted-foreground">(made to order)</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Order Notes / Ref</label>
                <Input
                  placeholder="Reference, project tags or special notes"
                  className="h-12 rounded-xl text-xs"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            {isCustomOrder && (
              <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-dashed">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Expected Workshop Ready Date
                  </label>
                  <NepaliDatePickerInput
                    value={expectedReadyDate}
                    onChange={(date) => setExpectedReadyDate(date.toISOString().split("T")[0])}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Production Instructions</label>
                  <Input
                    placeholder="E.g., custom upholstery batch, site measurements"
                    className="h-12 rounded-xl text-xs"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── SECTION 3: Rapid Line Item Editor ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                3. Products & Line Items <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-primary font-semibold hover:bg-primary/10 px-2"
                  onClick={() => setCreateProductOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Product
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-semibold rounded-lg"
                  onClick={handleAddLineItem}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Line Item
                </Button>
              </div>
            </div>

            {/* Line Items List */}
            <div className="space-y-3">
              {lineItems.map((item, index) => {
                const q = toNumber(item.quantity);
                const p = toNumber(item.unitPrice);
                const discAmt = toNumber(item.discountAmount);
                const rowGross = q * p;
                const rowTotal = Math.max(0, rowGross - discAmt);

                const currentProduct = products.data?.items.find((prod) => prod.id === item.productId);
                const stockInfo = getVariantStockInfo(item.productId, item.productVariantId);
                const isInsufficientStock =
                  stockInfo && !item.customProductName && q > stockInfo.stock;

                return (
                  <div
                    key={index}
                    className={`relative rounded-2xl border bg-card p-4 transition-all shadow-xs ${
                      isInsufficientStock
                        ? "border-amber-500/50 bg-amber-500/[0.02]"
                        : "border-border/80 hover:border-border"
                    }`}
                  >
                    <div className="grid gap-3 md:grid-cols-12 items-start">
                      {/* Col 1-4: Product Picker or Manual Entry */}
                      <div className="md:col-span-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Product #{index + 1}
                          </label>
                          <button
                            type="button"
                            className="text-[10px] text-primary hover:underline font-semibold"
                            onClick={() => {
                              setLineItems(
                                lineItems.map((it, idx) =>
                                  idx === index
                                    ? it.customProductName !== undefined
                                      ? {
                                          ...it,
                                          customProductName: undefined,
                                          productId: "",
                                          productVariantId: "",
                                        }
                                      : {
                                          ...it,
                                          productId: undefined,
                                          productVariantId: undefined,
                                          customProductName: "",
                                        }
                                    : it
                                )
                              );
                            }}
                          >
                            {item.customProductName !== undefined
                              ? "← Select Catalog Product"
                              : "+ Enter Custom / Unlisted"}
                          </button>
                        </div>

                        {item.customProductName !== undefined ? (
                          <Input
                            placeholder="Custom item name (e.g. Bespoke Velvet Headboard)"
                            value={item.customProductName}
                            onChange={(e) => {
                              setLineItems(
                                lineItems.map((it, idx) =>
                                  idx === index ? { ...it, customProductName: e.target.value } : it
                                )
                              );
                            }}
                            className="h-11 rounded-xl text-sm border-primary/30 font-medium"
                          />
                        ) : (
                          <div className="space-y-1.5">
                            {/* Product Selector */}
                            <select
                              className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              value={item.productId || ""}
                              onChange={(e) => {
                                const prodId = e.target.value;
                                const prod = products.data?.items.find((p) => p.id === prodId);
                                if (prod) {
                                  handleProductSelect(index, prod);
                                }
                              }}
                            >
                              <option value="">Select Catalog Product...</option>
                              {products.data?.items.map((prod) => (
                                <option key={prod.id} value={prod.id}>
                                  {prod.name} ({prod.sku}) — {formatCurrency(prod.sellingPrice)}
                                </option>
                              ))}
                            </select>

                            {/* Variant Selector & Stock Badge (if multiple variants or variant selected) */}
                            {currentProduct && currentProduct.variants && currentProduct.variants.length > 0 && (
                              <div className="flex items-center gap-2 pt-0.5">
                                {currentProduct.variants.length > 1 && (
                                  <select
                                    className="flex h-8 flex-1 rounded-lg border border-border/80 bg-muted/30 px-2 text-[11px] font-medium"
                                    value={item.productVariantId || ""}
                                    onChange={(e) => handleVariantSelect(index, e.target.value)}
                                  >
                                    {currentProduct.variants.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.variantName} {v.sizeLabel ? `(${v.sizeLabel})` : ""}{" "}
                                        {v.additionalCost ? `(+${formatCurrency(v.additionalCost)})` : ""}
                                      </option>
                                    ))}
                                  </select>
                                )}

                                {/* Stock Indicator Badge */}
                                {stockInfo && (
                                  <div
                                    className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 ${
                                      stockInfo.stock > 10
                                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                        : stockInfo.stock > 0
                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                        : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                    }`}
                                  >
                                    {stockInfo.stock > 0 ? (
                                      <CheckCircle2 className="h-3 w-3" />
                                    ) : (
                                      <AlertTriangle className="h-3 w-3" />
                                    )}
                                    Stock: {stockInfo.stock} units
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Col 5: Quantity */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Quantity
                        </label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-9 rounded-lg shrink-0 text-xs font-bold"
                            onClick={() => {
                              const curr = Math.max(1, toNumber(item.quantity) - 1);
                              handleQuantityChange(index, String(curr));
                            }}
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(index, e.target.value)}
                            className="h-11 rounded-lg text-center font-bold text-sm"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-11 w-9 rounded-lg shrink-0 text-xs font-bold"
                            onClick={() => {
                              const curr = toNumber(item.quantity) + 1;
                              handleQuantityChange(index, String(curr));
                            }}
                          >
                            +
                          </Button>
                        </div>

                        {/* Stock warning notification */}
                        {isInsufficientStock && stockInfo && (
                          <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                            <AlertTriangle className="h-3 w-3" />
                            Req: {q} &gt; Avail: {stockInfo.stock}
                          </p>
                        )}
                      </div>

                      {/* Col 6-7: Unit Price */}
                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Unit Price (Rs.)
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={item.unitPrice}
                          onChange={(e) => handleUnitPriceChange(index, e.target.value)}
                          className="h-11 rounded-xl text-sm font-semibold"
                        />
                      </div>

                      {/* Col 8: Disc % */}
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Disc %
                        </label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={item.discountPct}
                          onChange={(e) => handleDiscountPctChange(index, e.target.value)}
                          className="h-11 rounded-xl text-xs text-center"
                        />
                      </div>

                      {/* Col 9: Disc Rs */}
                      <div className="md:col-span-1 space-y-1">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Disc Rs.
                        </label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="0"
                          value={item.discountAmount}
                          onChange={(e) => handleDiscountAmountChange(index, e.target.value)}
                          className="h-11 rounded-xl text-xs text-center"
                        />
                      </div>

                      {/* Col 10-11: Line Total & Actions */}
                      <div className="md:col-span-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Line Total
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-destructive transition-colors"
                            onClick={() => handleRemoveLineItem(index)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex h-11 items-center justify-end rounded-xl bg-muted/40 px-3 font-bold text-sm text-primary">
                          {formatCurrency(rowTotal)}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible custom specs toggle */}
                    <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                      <button
                        type="button"
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                        onClick={() => {
                          setLineItems(
                            lineItems.map((it, idx) =>
                              idx === index ? { ...it, expandedDetails: !it.expandedDetails } : it
                            )
                          );
                        }}
                      >
                        {item.expandedDetails ? (
                          <ChevronUp className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-primary" />
                        )}
                        Custom Specs / Fabric / Finish
                        {(item.fabricColor || item.woodFinish || item.customizationNotes) && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                            Configured
                          </Badge>
                        )}
                      </button>

                      {rowGross > 0 && discAmt > 0 && (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Discount: -{formatCurrency(discAmt)} ({item.discountPct}%)
                        </span>
                      )}
                    </div>

                    {/* Custom Furniture Specs Fields */}
                    {item.expandedDetails && (
                      <div className="mt-2.5 grid gap-3 sm:grid-cols-3 bg-muted/20 p-3 rounded-xl border border-dashed">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Fabric / Color
                          </label>
                          <Input
                            placeholder="E.g. Teal Velvet, Charcoal"
                            value={item.fabricColor}
                            onChange={(e) => {
                              setLineItems(
                                lineItems.map((it, idx) =>
                                  idx === index
                                    ? { ...it, fabricColor: e.target.value, isCustom: true }
                                    : it
                                )
                              );
                            }}
                            className="h-9 text-xs rounded-lg bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Wood Finish
                          </label>
                          <Input
                            placeholder="E.g. Natural Teak, Walnut Matte"
                            value={item.woodFinish}
                            onChange={(e) => {
                              setLineItems(
                                lineItems.map((it, idx) =>
                                  idx === index
                                    ? { ...it, woodFinish: e.target.value, isCustom: true }
                                    : it
                                )
                              );
                            }}
                            className="h-9 text-xs rounded-lg bg-background"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold uppercase text-muted-foreground">
                            Customization Notes
                          </label>
                          <Input
                            placeholder="Special dimensions, piping, etc."
                            value={item.customizationNotes}
                            onChange={(e) => {
                              setLineItems(
                                lineItems.map((it, idx) =>
                                  idx === index
                                    ? { ...it, customizationNotes: e.target.value, isCustom: true }
                                    : it
                                )
                              );
                            }}
                            className="h-9 text-xs rounded-lg bg-background"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SECTION 4: Financial Summary & Deposit Management ── */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.03] via-card to-background p-5 space-y-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                4. Commercial Terms & Deposit Handling
              </label>
              <div className="text-right">
                <span className="text-xs text-muted-foreground mr-2">Commercial Net Order Total:</span>
                <span className="text-2xl font-black text-primary">
                  {formatCurrency(financialSummary.netTotal)}
                </span>
              </div>
            </div>

            {/* Financial Grid */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-3 bg-muted/40 rounded-xl space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Gross Subtotal
                </div>
                <div className="text-base font-bold text-foreground">
                  {formatCurrency(financialSummary.grossSubtotal)}
                </div>
              </div>

              <div className="p-3 bg-emerald-500/10 rounded-xl space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Total Discount Applied
                </div>
                <div className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                  -{formatCurrency(financialSummary.totalDiscount)}
                </div>
              </div>

              <div className="p-3 bg-rose-500/10 rounded-xl space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Estimated Balance Due
                </div>
                <div className="text-base font-bold text-rose-700 dark:text-rose-300">
                  {formatCurrency(financialSummary.balanceDue)}
                </div>
              </div>
            </div>

            {/* Deposit Inputs & Quick Presets */}
            <div className="rounded-xl border bg-background p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-semibold text-foreground">
                  Initial Deposit Received (Rs.)
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] rounded-lg px-2.5"
                    onClick={() => setDepositAmount("0")}
                  >
                    0% (No Deposit)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] rounded-lg px-2.5"
                    onClick={() => handleDepositPreset(25)}
                  >
                    25%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] rounded-lg px-2.5"
                    onClick={() => handleDepositPreset(50)}
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] rounded-lg px-2.5 text-emerald-600 font-semibold"
                    onClick={() => handleDepositPreset(100)}
                  >
                    100% Full Payment
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="h-11 rounded-xl text-base font-bold"
                  />
                </div>

                {toNumber(depositAmount) > 0 && (
                  <div className="space-y-1">
                    <select
                      className="flex h-11 w-full rounded-xl border border-border bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>
                          Payment Method: {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Accounting Semantics Notice */}
            <div className="flex items-start gap-2 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-800 dark:text-blue-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                <strong>Accounting Invariant:</strong> Creating this Sales Order records commercial
                truth and posts to the AR ledger. Compliance Tax Invoices (with statutory VAT) can be
                issued separately upon fulfillment or billing.
              </span>
            </div>
          </div>

          {/* ── SECTION 5: Fast Action Footer ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={onClose}
              disabled={createSO.isPending}
              className="w-full sm:w-auto rounded-xl"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleSubmit("QUOTE")}
                disabled={createSO.isPending}
                className="w-full sm:w-auto rounded-xl border-border/80 font-semibold"
              >
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                Save as Quote (Draft)
              </Button>

              <Button
                type="button"
                size="lg"
                onClick={() => handleSubmit("CONFIRMED")}
                disabled={createSO.isPending}
                className="w-full sm:w-auto rounded-xl font-bold bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all"
              >
                <ShieldCheck className="h-4 w-4 mr-2" />
                {createSO.isPending ? "Submitting..." : "Confirm & Place Order"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
