import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useSalesOrderQuery,
  useCancelSalesOrderMutation,
  useCreateInvoiceMutation,
  useCreateDeliveryMutation,
  useConfirmSalesOrderMutation,
  useUpdateSalesOrderStatusMutation,
} from "@/hooks/use-queries";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL, getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft,
  XCircle,
  Truck,
  FileText,
  Printer,
  Receipt,
  Download,
  CheckCircle,
  ShieldCheck,
  PackageCheck,
  Clock,
  Warehouse,
  DollarSign,
} from "lucide-react";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { useState } from "react";
import { RecordDepositModal } from "@/components/sales/record-deposit-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateInvoiceForm } from "@/components/invoicing/create-invoice-form";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useSalesOrderQuery(id);
  const { token } = useAuth();
  

  const cancelMutation = useCancelSalesOrderMutation();
  const createInvoiceMutation = useCreateInvoiceMutation();
  const createDeliveryMutation = useCreateDeliveryMutation();
  const confirmOrderMutation = useConfirmSalesOrderMutation();
  const updateStatusMutation = useUpdateSalesOrderStatusMutation();

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [invoiceTypeToCreate, setInvoiceTypeToCreate] = useState<"VAT" | "ESTIMATE">("VAT");
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverDate, setDeliverDate] = useState<string>(new Date().toISOString().split("T")[0]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[400px] md:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  if (!order) return <div className="p-8 text-destructive">Order not found.</div>;

  // Derived data
  const customer = order.customer;
  const lineItems = order.lineItems ?? [];
  const payments = order.payments ?? [];
  const taxInvoices = order.taxInvoices ?? [];
  const delivery = order.delivery;
  const rawStatus = order.rawStatus ?? order.status;

  const existingVatPan = taxInvoices.find((i: any) => i.invoiceType === "VAT" || i.invoiceType === "PAN");
  const existingEstimate = taxInvoices.find((i: any) => i.invoiceType === "ESTIMATE");
  
  const computedTotal = lineItems.reduce((sum: number, li: any) => {
    const q = toNumber(li.quantity);
    const p = toNumber(li.unitPrice);
    const discAmt = li.discountAmount !== undefined && li.discountAmount !== null
      ? toNumber(li.discountAmount)
      : q * p * (toNumber(li.discountPct) / 100);
    return sum + (q * p - discAmt);
  }, 0);
  
  const computedPaid = payments.reduce((sum: number, p: any) => sum + toNumber(p.amount), 0);
  const computedBalance = Math.max(0, computedTotal - computedPaid);

  const total = computedTotal;
  const paid = computedPaid;
  const balance = computedBalance;

  // OTC Stepper Lifecycle definitions
  const OTC_STEPS = [
    { key: "DRAFT", label: "Draft / Quote", icon: Clock },
    { key: "CONFIRMED", label: "Confirmed", icon: ShieldCheck },
    { key: "DISPATCHED", label: "Dispatched", icon: Truck },
    { key: "DELIVERED", label: "Delivered", icon: CheckCircle },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case "QUOTE":
      case "DRAFT": return 0;
      case "CONFIRMED":
      case "IN_WAREHOUSE": return 1;
      case "OUT_FOR_DELIVERY":
      case "DISPATCHED": return 2;
      case "DELIVERED": return 3;
      default: return 0;
    }
  };

  const currentStepIdx = rawStatus === "CANCELLED" ? -1 : getStepIndex(rawStatus);

  const statusVariant = (status: string): "destructive" | "success" | "warning" => {
    switch (status) {
      case "CANCELLED": return "destructive";
      case "DELIVERED": return "success";
      case "DEPOSIT_PAID":
      case "PAID":
        return "success";
      case "CONFIRMED": return "warning";
      default: return "warning";
    }
  };

  const handleVoidOrder = () => {
    if (!id) return;
    cancelMutation.mutate(id, {
      onSuccess: () => {
        toast("Order voided", { description: "The order has been cancelled successfully." });
        navigate("/sales");
      },
      onError: (error) => toast("Failed to void", { description: getErrorMessage(error) }),
    });
  };

  const handleCreateInvoice = (type: "VAT" | "ESTIMATE") => {
    setInvoiceTypeToCreate(type);
    setCreateInvoiceOpen(true);
  };

  const handleScheduleDelivery = () => {
    if (!id || !customer) return;
    createDeliveryMutation.mutate(
      {
        soId: id,
        status: "SCHEDULED",
        scheduledDate: new Date().toISOString(),
        deliveryAddress: customer.address ?? "Customer address",
      },
      {
        onSuccess: () => {
          toast("Delivery scheduled", { description: "A delivery has been scheduled for this order." });
        },
        onError: (error) => toast("Delivery failed", { description: getErrorMessage(error) }),
      }
    );
  };

  const handleStatusChange = (nextStatus: string, label: string) => {
    if (!id) return;
    updateStatusMutation.mutate(
      { id, status: nextStatus },
      {
        onSuccess: () => toast.success(`Order advanced to ${label}`),
        onError: (err) => toast.error("Status update failed", { description: getErrorMessage(err) }),
      }
    );
  };

  const handleDownloadPdf = async (invoiceId: string, type: "invoice" | "estimate") => {
    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/auth/download-token`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to get download token");
      const { token: downloadToken } = await response.json();
      const url = `${baseUrl}/tax-invoices/${invoiceId}/pdf?token=${downloadToken}&type=${type}`;
      window.open(url, "_blank");
    } catch {
      toast("Download failed", { description: "Could not generate the PDF download link." });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/sales">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">Order #{order.id}</h1>
              <Badge variant={statusVariant(rawStatus)}>
                {rawStatus.replace(/_/g, " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">{customer?.name}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      {/* Visual Order-to-Cash Stepper */}
      {rawStatus !== "CANCELLED" ? (
        <Card className="shadow-xs border-primary/20 bg-muted/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between relative">
              {/* Stepper Progress Bar */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted-foreground/20 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
                style={{
                  width: `${(Math.max(0, currentStepIdx) / (OTC_STEPS.length - 1)) * 100}%`,
                }}
              />

              {OTC_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div
                    key={step.key}
                    className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-all shadow-sm ${
                        isCompleted
                          ? "bg-primary border-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-background border-primary text-primary ring-4 ring-primary/20"
                          : "bg-background border-muted-foreground/30 text-muted-foreground"
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <span
                      className={`text-xs font-semibold hidden sm:inline ${
                        isCurrent
                          ? "text-primary font-bold"
                          : isCompleted
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <XCircle className="h-5 w-5" />
            <div>
              <p className="font-bold text-sm">Order Cancelled</p>
              <p className="text-xs text-muted-foreground">
                This Sales Order was voided. Stock allocations have been restored to inventory.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column (2/3) ─── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order Info */}
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={statusVariant(order.status)}>{order.status.replace(/_/g, " ")}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(order.orderDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Delivery Date</p>
                  <p className="font-medium">{order.deliveryDate ? formatDate(order.deliveryDate) : "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Custom Order</p>
                  <p className="font-medium">{order.isCustomOrder ? "Yes" : "No"}</p>
                </div>
              </div>
              {order.notes && (
                <div className="mt-4 text-sm">
                  <p className="text-muted-foreground">Notes</p>
                  <p>{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">No line items.</p>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Disc %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((li: any) => {
                        const qty = toNumber(li.quantity);
                        const price = toNumber(li.unitPrice);
                        const disc = toNumber(li.discountPct);
                        const discAmt = li.discountAmount !== undefined && li.discountAmount !== null
                          ? toNumber(li.discountAmount)
                          : qty * price * (disc / 100);
                        const lineTotal = qty * price - discAmt;
                        const product = li.productVariant?.product;
                        const variant = li.productVariant;

                        return (
                          <TableRow key={li.id}>
                            <TableCell>
                              <p className="font-medium">{product?.name ?? li.customProductName ?? "Manual Entry"}</p>
                              {variant?.variantName && variant.variantName !== "Default" && (
                                <p className="text-xs text-muted-foreground">{variant.variantName}</p>
                              )}
                              {li.isCustom && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {li.fabricColor && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{li.fabricColor}</span>}
                                  {li.woodFinish && <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{li.woodFinish}</span>}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{variant?.sku ?? product?.sku ?? "—"}</TableCell>
                            <TableCell className="text-right">{qty}</TableCell>
                            <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                            <TableCell className="text-right">{disc > 0 ? `${disc}%` : "—"}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(lineTotal)}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/40 font-bold border-t-2">
                        <TableCell colSpan={5} className="text-right">Order Total</TableCell>
                        <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground uppercase">Total</p>
                  <p className="text-xl font-bold">{formatCurrency(total)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-green-600 uppercase">Paid</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(paid)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <p className="text-xs text-red-600 uppercase">Balance Due</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(balance)}</p>
                </div>
              </div>

              {balance > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setDepositModalOpen(true)}>
                    Record Payment
                  </Button>
                </div>
              )}

              {/* Payment History */}
              {payments.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold mb-2">Payment History</h4>
                  <div className="rounded-xl border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell>{formatDate(p.paymentDate ?? p.createdAt)}</TableCell>
                            <TableCell>{(p.method ?? "").replace(/_/g, " ")}</TableCell>
                            <TableCell className="font-mono text-xs">{p.reference ?? "—"}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(toNumber(p.amount))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right Column (1/3) ─── */}
        <div className="space-y-6">

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-lg">{customer?.name}</p>
              {customer?.type && (
                <p className="text-muted-foreground">{customer.type.replace(/_/g, " ")}</p>
              )}
              {customer?.email && (
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{customer.email}</p>
                </div>
              )}
              {customer?.phone && (
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p>{customer.phone}</p>
                </div>
              )}
              {customer?.address && (
                <div>
                  <p className="text-muted-foreground">Address</p>
                  <p>{customer.address}</p>
                </div>
              )}
              {customer?.panNo && (
                <div>
                  <p className="text-muted-foreground">PAN No.</p>
                  <p className="font-mono">{customer.panNo}</p>
                </div>
              )}
              {customer?.vatNo && (
                <div>
                  <p className="text-muted-foreground">VAT No.</p>
                  <p className="font-mono">{customer.vatNo}</p>
                </div>
              )}
              {customer?.creditLimit && (
                <div>
                  <p className="text-muted-foreground">Credit Limit</p>
                  <p className="font-semibold">{formatCurrency(toNumber(customer.creditLimit))}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow Action Panel */}
          <Card className="shadow-xs border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Workflow Actions</CardTitle>
              <CardDescription className="text-xs">
                Advance this order through its fulfillment lifecycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Step 1: Confirm Order */}
              {(rawStatus === "DRAFT" || rawStatus === "QUOTE") && (
                <Button
                  className="w-full justify-start rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => {
                    if (!id) return;
                    confirmOrderMutation.mutate(id, {
                      onSuccess: () => toast.success("Order confirmed! Stock allocated."),
                      onError: (err) => toast.error("Confirmation failed", { description: getErrorMessage(err) }),
                    });
                  }}
                  disabled={confirmOrderMutation.isPending}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {confirmOrderMutation.isPending ? "Confirming..." : "Confirm Sales Order"}
                </Button>
              )}

              {/* Step 2: Schedule Delivery */}
              {!delivery && rawStatus !== "CANCELLED" && (rawStatus === "CONFIRMED" || rawStatus === "IN_WAREHOUSE") && (
                <Button
                  variant="default"
                  className="w-full justify-start rounded-xl font-semibold bg-primary text-primary-foreground"
                  onClick={handleScheduleDelivery}
                  disabled={createDeliveryMutation.isPending}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  {createDeliveryMutation.isPending ? "Scheduling..." : "Schedule Delivery & Create Challan"}
                </Button>
              )}

              {/* Delivery Details Badge */}
              {delivery && (
                <div className="flex flex-col gap-1 rounded-xl border p-3 bg-muted/30">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    Delivery Challan Registered
                  </span>
                  <div className="text-xs font-medium flex items-center gap-2 text-foreground">
                    <Truck className="h-4 w-4 text-primary" /> {delivery.status?.replace(/_/g, " ")} — {formatDate(delivery.scheduledDate)}
                  </div>
                  {delivery.vehicle && <span className="text-[11px] text-muted-foreground ml-6">Vehicle: {delivery.vehicle}</span>}
                </div>
              )}

              {/* Step 3: Mark Complete / Delivered */}
              {rawStatus !== "DELIVERED" && rawStatus !== "CANCELLED" && rawStatus !== "DRAFT" && rawStatus !== "QUOTE" && (
                <Button
                  variant={delivery || rawStatus === "DISPATCHED" || rawStatus === "OUT_FOR_DELIVERY" ? "default" : "outline"}
                  className={`w-full justify-start rounded-xl font-semibold ${
                    delivery || rawStatus === "DISPATCHED" || rawStatus === "OUT_FOR_DELIVERY"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                  onClick={() => setDeliverModalOpen(true)}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {updateStatusMutation.isPending ? "Updating..." : "Mark Delivered & Complete"}
                </Button>
              )}

              {/* Tax Invoice & Estimate Actions */}
              {rawStatus !== "CANCELLED" && rawStatus !== "QUOTE" && (
                <div className="pt-2 border-t space-y-2">
                  {!existingVatPan && (
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl text-xs"
                      onClick={() => handleCreateInvoice("VAT")}
                    >
                      <FileText className="mr-2 h-4 w-4 text-emerald-600" />
                      Create Tax Invoice
                    </Button>
                  )}
                  {!existingEstimate && (
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl text-xs"
                      onClick={() => handleCreateInvoice("ESTIMATE")}
                    >
                      <Receipt className="mr-2 h-4 w-4 text-blue-600" />
                      Create Estimate Bill
                    </Button>
                  )}
                </div>
              )}

              {taxInvoices.map((inv: any) => (
                <div key={inv.id} className="flex flex-col gap-2 rounded-xl border p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{inv.invoiceType} INVOICE</span>
                    <Badge variant="secondary" className="text-[10px]">{inv.status}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start w-full bg-background rounded-lg text-xs"
                    onClick={() => handleDownloadPdf(inv.id, inv.invoiceType === "ESTIMATE" ? "estimate" : "invoice")}
                  >
                    {inv.invoiceType === "ESTIMATE" ? (
                      <><Receipt className="mr-2 h-3.5 w-3.5" /> Download Estimate</>
                    ) : (
                      <><Download className="mr-2 h-3.5 w-3.5" /> Download Invoice</>
                    )}
                  </Button>
                </div>
              ))}

              {rawStatus !== "CANCELLED" && rawStatus !== "DELIVERED" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10 text-xs mt-2"
                  onClick={handleVoidOrder}
                  disabled={cancelMutation.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {cancelMutation.isPending ? "Voiding..." : "Void Sales Order"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {depositModalOpen && (
        <RecordDepositModal
          orderId={order.id}
          orderNumber={order.id}
          onClose={() => setDepositModalOpen(false)}
          defaultAmount={order.total - order.depositAmount}
        />
      )}

      <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-y-auto max-h-[90vh]">
          <CreateInvoiceForm 
            onClose={() => setCreateInvoiceOpen(false)} 
            defaultSoId={id} 
            defaultInvoiceType={invoiceTypeToCreate} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Sales Order Delivered</DialogTitle>
            <DialogDescription>
              Select the official delivery date to log stock deduction and update Order-to-Cash status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-sm font-semibold">Delivery Date</label>
            <NepaliDatePickerInput
              value={deliverDate}
              onChange={(date) => setDeliverDate(date.toISOString().split("T")[0])}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!id) return;
                updateStatusMutation.mutate(
                  { id, status: "DELIVERED", deliveryDate: deliverDate },
                  {
                    onSuccess: () => {
                      setDeliverModalOpen(false);
                      toast.success("Sales order marked as Delivered");
                    },
                    onError: (err) =>
                      toast.error("Delivery update failed", {
                        description: getErrorMessage(err),
                      }),
                  }
                );
              }}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm Delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
