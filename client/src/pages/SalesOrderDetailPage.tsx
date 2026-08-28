import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useSalesOrderQuery,
  useCancelSalesOrderMutation,
  useCreateInvoiceMutation,
  useCreateDeliveryMutation,
  useUpdateDeliveryMutation,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock,
  Warehouse,
  DollarSign,
  User,
  Phone,
  MapPin,
  Building,
  CreditCard,
  Sparkles,
  Info,
  Calendar,
  AlertTriangle,
  Plus,
  Package,
} from "lucide-react";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { RecordDepositModal } from "@/components/sales/record-deposit-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateInvoiceForm } from "@/components/invoicing/create-invoice-form";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { ScheduleDeliveryForm } from "@/components/delivery/schedule-delivery-form";

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useSalesOrderQuery(id);
  const { token } = useAuth();

  const cancelMutation = useCancelSalesOrderMutation();
  const createInvoiceMutation = useCreateInvoiceMutation();
  const confirmOrderMutation = useConfirmSalesOrderMutation();
  const updateStatusMutation = useUpdateSalesOrderStatusMutation();
  const updateDeliveryMutation = useUpdateDeliveryMutation();

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [invoiceTypeToCreate, setInvoiceTypeToCreate] = useState<"VAT" | "ESTIMATE">("VAT");
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [scheduleDeliveryModalOpen, setScheduleDeliveryModalOpen] = useState(false);
  const [deliverDate, setDeliverDate] = useState<string>(new Date().toISOString().split("T")[0]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[500px] lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center max-w-lg mx-auto space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <XCircle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Sales Order Not Found</h2>
        <p className="text-sm text-muted-foreground">
          The requested sales order could not be located in your organization workspace.
        </p>
        <Button asChild variant="outline">
          <Link to="/sales">Return to Sales List</Link>
        </Button>
      </div>
    );
  }

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
    const discAmt =
      li.discountAmount !== undefined && li.discountAmount !== null
        ? toNumber(li.discountAmount)
        : q * p * (toNumber(li.discountPct) / 100);
    return sum + (q * p - discAmt);
  }, 0);

  const computedPaid = payments.reduce((sum: number, p: any) => sum + toNumber(p.amount), 0);
  const total = toNumber(order.total) || computedTotal;
  const paid = toNumber(order.paidAmount) || computedPaid;
  const balance = Math.max(0, total - paid);

  // OTC Stepper Lifecycle definitions
  const OTC_STEPS = [
    { key: "QUOTE", label: "Draft / Quote", icon: Clock },
    { key: "CONFIRMED", label: "Order Confirmed", icon: ShieldCheck },
    { key: "IN_WAREHOUSE", label: "In Warehouse", icon: Warehouse },
    { key: "DISPATCHED", label: "Dispatched", icon: Truck },
    { key: "DELIVERED", label: "Delivered", icon: CheckCircle },
  ];

  const getStepIndex = (st: string) => {
    switch (st) {
      case "QUOTE":
      case "DRAFT":
        return 0;
      case "CONFIRMED":
      case "DEPOSIT_PAID":
      case "PAID":
        return 1;
      case "IN_WAREHOUSE":
        return 2;
      case "OUT_FOR_DELIVERY":
      case "DISPATCHED":
        return 3;
      case "DELIVERED":
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = rawStatus === "CANCELLED" ? -1 : getStepIndex(rawStatus);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Delivered</Badge>;
      case "PAID":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Paid (100%)</Badge>;
      case "DEPOSIT_PAID":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-700">Deposit Paid</Badge>;
      case "CONFIRMED":
        return <Badge className="bg-amber-600 text-white hover:bg-amber-700">Confirmed</Badge>;
      case "IN_WAREHOUSE":
        return <Badge className="bg-purple-600 text-white hover:bg-purple-700">In Warehouse</Badge>;
      case "DISPATCHED":
      case "OUT_FOR_DELIVERY":
        return <Badge className="bg-indigo-600 text-white hover:bg-indigo-700">Dispatched</Badge>;
      case "QUOTE":
      case "DRAFT":
      default:
        return <Badge variant="outline" className="text-muted-foreground border-border">Draft / Quote</Badge>;
    }
  };

  const handleVoidOrder = () => {
    if (!id) return;
    cancelMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Order voided", { description: "The order has been cancelled successfully." });
        navigate("/sales");
      },
      onError: (error) => toast.error("Failed to void", { description: getErrorMessage(error) }),
    });
  };

  const handleCreateInvoice = (type: "VAT" | "ESTIMATE") => {
    setInvoiceTypeToCreate(type);
    setCreateInvoiceOpen(true);
  };

  const handleScheduleDelivery = () => {
    setScheduleDeliveryModalOpen(true);
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
      toast.error("Download failed", { description: "Could not generate the PDF download link." });
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Top Navigation & Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link to="/sales">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="space-y-0.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground font-mono">
                SO #{order.id}
              </h1>
              {getStatusBadge(rawStatus)}
              {order.isCustomOrder && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-300 dark:text-amber-300">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Custom Bespoke
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <span className="font-semibold text-foreground">{customer?.name}</span>
              <span>•</span>
              <span>Order Date: {formatDate(order.orderDate)}</span>
              {order.bsDate && <span className="font-mono">({order.bsDate})</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl">
            <Printer className="mr-2 h-4 w-4" /> Print Workspace
          </Button>
        </div>
      </div>

      {/* ── Visual Order-to-Cash Stepper ── */}
      {rawStatus !== "CANCELLED" ? (
        <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.03] via-card to-background shadow-xs">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between relative">
              {/* Stepper Progress Bar */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted-foreground/15 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-500"
                style={{
                  width: `${(Math.max(0, currentStepIdx) / (OTC_STEPS.length - 1)) * 100}%`,
                }}
              />

              {OTC_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = currentStepIdx > idx;
                const isCurrent = currentStepIdx === idx;

                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-all shadow-xs ${
                        isCompleted
                          ? "bg-primary border-primary text-primary-foreground"
                          : isCurrent
                          ? "bg-background border-primary text-primary ring-4 ring-primary/20 scale-110"
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
            <XCircle className="h-6 w-6 shrink-0" />
            <div>
              <p className="font-bold text-sm">Order Cancelled &amp; Voided</p>
              <p className="text-xs text-muted-foreground">
                This Sales Order was cancelled. Inventory reservations were released back to stock and AR
                entries reversed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Financial KPI Strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Commercial Order Total
            </p>
            <p className="text-2xl font-black text-foreground">{formatCurrency(total)}</p>
            <p className="text-[10px] text-muted-foreground">Commercial agreement value</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Paid to Date
            </p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(paid)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {paid >= total ? "Fully settled" : `${Math.round((paid / (total || 1)) * 100)}% of total`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Outstanding Balance Due
            </p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400">
              {formatCurrency(balance)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {balance <= 0 ? "Zero balance" : "Due from customer"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Invoicing Compliance Status
            </p>
            <div className="flex items-center gap-1.5 pt-1">
              {existingVatPan ? (
                <Badge className="bg-emerald-600 text-white text-xs">Tax Invoice Issued</Badge>
              ) : existingEstimate ? (
                <Badge className="bg-blue-600 text-white text-xs">Estimate Bill Issued</Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-muted-foreground">Uninvoiced</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {taxInvoices.length} billing document(s)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Workspace Content: Left Detail Tabs (2/3) + Right Actions (1/3) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Left Column: Tabs ── */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid grid-cols-4 w-full rounded-2xl h-11 bg-muted/50 p-1">
              <TabsTrigger value="items" className="rounded-xl text-xs font-semibold">
                Items &amp; Specs ({lineItems.length})
              </TabsTrigger>
              <TabsTrigger value="party" className="rounded-xl text-xs font-semibold">
                Party &amp; Delivery
              </TabsTrigger>
              <TabsTrigger value="payments" className="rounded-xl text-xs font-semibold">
                Payments ({payments.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="rounded-xl text-xs font-semibold">
                Invoices ({taxInvoices.length})
              </TabsTrigger>
            </TabsList>

            {/* ── TAB 1: Line Items ── */}
            <TabsContent value="items" className="space-y-4 pt-3">
              <Card className="rounded-2xl border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">Line Items &amp; Specifications</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {lineItems.length} Product(s)
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {lineItems.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground italic">
                      No line items recorded for this sales order.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Product / Variant</TableHead>
                          <TableHead className="font-bold text-xs">SKU</TableHead>
                          <TableHead className="text-right font-bold text-xs">Qty</TableHead>
                          <TableHead className="text-right font-bold text-xs">Unit Price</TableHead>
                          <TableHead className="text-right font-bold text-xs">Disc % / Rs</TableHead>
                          <TableHead className="text-right font-bold text-xs">Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems.map((li: any) => {
                          const qty = toNumber(li.quantity);
                          const price = toNumber(li.unitPrice);
                          const disc = toNumber(li.discountPct);
                          const discAmt =
                            li.discountAmount !== undefined && li.discountAmount !== null
                              ? toNumber(li.discountAmount)
                              : qty * price * (disc / 100);
                          const lineTotal = qty * price - discAmt;
                          const product = li.productVariant?.product;
                          const variant = li.productVariant;

                          return (
                            <TableRow key={li.id} className="hover:bg-muted/20">
                              <TableCell>
                                <div className="space-y-0.5">
                                  <p className="font-semibold text-sm text-foreground">
                                    {product?.name ?? li.customProductName ?? "Custom Product"}
                                  </p>
                                  {variant?.variantName && variant.variantName !== "Default" && (
                                    <p className="text-xs text-muted-foreground">
                                      Variant: {variant.variantName}
                                    </p>
                                  )}
                                  {li.isCustom && (
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {li.fabricColor && (
                                        <span className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md font-medium">
                                          Fabric: {li.fabricColor}
                                        </span>
                                      )}
                                      {li.woodFinish && (
                                        <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-md font-medium">
                                          Finish: {li.woodFinish}
                                        </span>
                                      )}
                                      {li.customizationNotes && (
                                        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-md text-muted-foreground">
                                          {li.customizationNotes}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {variant?.skuVariant ?? product?.sku ?? "—"}
                              </TableCell>
                              <TableCell className="text-right font-bold text-sm">{qty}</TableCell>
                              <TableCell className="text-right text-sm">{formatCurrency(price)}</TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground">
                                {discAmt > 0 ? (
                                  <span className="text-emerald-600 font-semibold">
                                    -{formatCurrency(discAmt)} {disc > 0 ? `(${disc}%)` : ""}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="text-right font-bold text-sm text-primary">
                                {formatCurrency(lineTotal)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-muted/40 font-bold border-t-2">
                          <TableCell colSpan={5} className="text-right text-sm">
                            Commercial Order Total:
                          </TableCell>
                          <TableCell className="text-right text-base text-primary font-black">
                            {formatCurrency(total)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {order.notes && (
                <div className="rounded-2xl border bg-muted/20 p-4 space-y-1 text-xs">
                  <p className="font-bold text-muted-foreground uppercase tracking-wider">
                    Internal / Order Notes
                  </p>
                  <p className="text-foreground">{order.notes}</p>
                </div>
              )}
            </TabsContent>

            {/* ── TAB 2: Party & Delivery ── */}
            <TabsContent value="party" className="space-y-4 pt-3">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Customer Profile Card */}
                <Card className="rounded-2xl border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Party &amp; Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-base text-foreground">{customer?.name}</span>
                      {customer?.type && (
                        <Badge
                          variant="outline"
                          className={
                            customer.type === "SHOWROOM"
                              ? "bg-purple-500/10 text-purple-700 border-purple-300"
                              : "bg-blue-500/10 text-blue-700 border-blue-300"
                          }
                        >
                          {customer.type}
                        </Badge>
                      )}
                    </div>

                    {customer?.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {(customer?.address || customer?.district) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{[customer.district, customer.address].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                    {customer?.panNo && (
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-muted-foreground">PAN / VAT No:</span>
                        <span className="font-mono font-bold text-foreground">{customer.panNo}</span>
                      </div>
                    )}
                    {customer?.creditLimit && (
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-muted-foreground">Credit Limit:</span>
                        <span className="font-bold text-foreground">
                          {formatCurrency(toNumber(customer.creditLimit))}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Delivery Logistics Card */}
                <Card className="rounded-2xl border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      Delivery &amp; Logistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Expected Delivery:</span>
                      <span className="font-bold text-foreground">
                        {order.deliveryDate ? formatDate(order.deliveryDate) : "Not scheduled"}
                      </span>
                    </div>
                    {delivery && (
                      <>
                        <div className="flex items-center justify-between pt-1 border-t">
                          <span className="text-muted-foreground">Challan Status:</span>
                          <Badge variant="secondary">{delivery.status?.replace(/_/g, " ")}</Badge>
                        </div>
                        {delivery.scheduledDate && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Dispatch Date:</span>
                            <span className="font-medium">{formatDate(delivery.scheduledDate)}</span>
                          </div>
                        )}
                        {delivery.deliveryAddress && (
                          <div className="space-y-0.5 pt-1 border-t">
                            <span className="text-muted-foreground">Destination:</span>
                            <p className="font-medium text-foreground">{delivery.deliveryAddress}</p>
                          </div>
                        )}
                      </>
                    )}
                    {order.deliveryFloor !== undefined && order.deliveryFloor !== null && (
                      <div className="flex items-center justify-between pt-1 border-t">
                        <span className="text-muted-foreground">Floor Delivery:</span>
                        <span className="font-medium text-foreground">Floor {order.deliveryFloor}</span>
                      </div>
                    )}
                    {order.assemblyNotes && (
                      <div className="space-y-0.5 pt-1 border-t">
                        <span className="text-muted-foreground">Assembly Instructions:</span>
                        <p className="font-medium text-foreground">{order.assemblyNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── TAB 3: Payments & AR ── */}
            <TabsContent value="payments" className="space-y-4 pt-3">
              <Card className="rounded-2xl border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-600" />
                      Payment History &amp; AR Ledger
                    </CardTitle>
                    {balance > 0 && rawStatus !== "CANCELLED" && (
                      <Button
                        size="sm"
                        onClick={() => setDepositModalOpen(true)}
                        className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Record Payment
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {payments.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground italic">
                      No payments have been recorded for this sales order yet.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Date</TableHead>
                          <TableHead className="font-bold text-xs">Payment Method</TableHead>
                          <TableHead className="font-bold text-xs">Reference</TableHead>
                          <TableHead className="text-right font-bold text-xs">Amount Paid</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payments.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-xs">
                              {formatDate(p.paymentDate ?? p.createdAt)}
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {(p.method ?? "CASH").replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {p.reference ?? p.note ?? "—"}
                            </TableCell>
                            <TableCell className="text-right font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {formatCurrency(toNumber(p.amount))}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/40 font-bold border-t-2">
                          <TableCell colSpan={3} className="text-right text-xs">
                            Total Settled:
                          </TableCell>
                          <TableCell className="text-right text-sm text-emerald-600 font-bold">
                            {formatCurrency(paid)}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── TAB 4: Invoices & Documents ── */}
            <TabsContent value="documents" className="space-y-4 pt-3">
              <Card className="rounded-2xl border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Tax Invoices &amp; Estimate Bills
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Official compliance billing documents linked to this sales order.
                      </CardDescription>
                    </div>

                    {rawStatus !== "CANCELLED" && rawStatus !== "QUOTE" && (
                      <div className="flex items-center gap-2">
                        {!existingVatPan && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateInvoice("VAT")}
                            className="rounded-xl text-xs font-semibold border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" />
                            + Tax Invoice
                          </Button>
                        )}
                        {!existingEstimate && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCreateInvoice("ESTIMATE")}
                            className="rounded-xl text-xs font-semibold border-blue-600 text-blue-700 hover:bg-blue-50"
                          >
                            <Receipt className="h-3.5 w-3.5 mr-1" />
                            + Estimate Bill
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {taxInvoices.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground italic border rounded-xl">
                      No tax invoices or estimate bills generated yet.
                    </div>
                  ) : (
                    taxInvoices.map((inv: any) => (
                      <div
                        key={inv.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-muted/20 hover:border-primary/40 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-bold ${
                                inv.invoiceType === "VAT" || inv.invoiceType === "PAN"
                                  ? "bg-emerald-500/10 text-emerald-700 border-emerald-300"
                                  : "bg-blue-500/10 text-blue-700 border-blue-300"
                              }`}
                            >
                              {inv.invoiceType} INVOICE
                            </Badge>
                            <span className="font-mono font-bold text-sm text-foreground">
                              {inv.invoiceNumber}
                            </span>
                            <Badge variant="secondary" className="text-[10px]">
                              {inv.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Amount: <strong className="text-foreground">{formatCurrency(toNumber(inv.invoiceAmount ?? inv.totalAmount ?? inv.amount))}</strong> • Issued: {formatDate(inv.createdAt)}
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs"
                          onClick={() =>
                            handleDownloadPdf(
                              inv.id,
                              inv.invoiceType === "ESTIMATE" ? "estimate" : "invoice"
                            )
                          }
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5 text-primary" />
                          Download PDF
                        </Button>
                      </div>
                    ))
                  )}

                  {/* Clarification Alert */}
                  <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
                    <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                    <span>
                      <strong>Notice:</strong> Tax invoices reflect statutory compliance for the Inland
                      Revenue Department (IRD) with applicable VAT/PAN breakdowns.
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right Column: Workflow Action Center (1/3) ── */}
        <div className="space-y-6">
          <Card className="rounded-2xl border-primary/20 shadow-md">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Workflow Actions
              </CardTitle>
              <CardDescription className="text-xs">
                Fulfill order requirements and manage state transitions.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Confirm Quote Action */}
              {(rawStatus === "DRAFT" || rawStatus === "QUOTE") && (
                <Button
                  className="w-full justify-start rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  onClick={() => {
                    if (!id) return;
                    confirmOrderMutation.mutate(id, {
                      onSuccess: () => toast.success("Order confirmed! Stock reserved and AR debit posted."),
                      onError: (err) =>
                        toast.error("Confirmation failed", { description: getErrorMessage(err) }),
                    });
                  }}
                  disabled={confirmOrderMutation.isPending}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {confirmOrderMutation.isPending ? "Confirming Order..." : "Confirm Sales Order"}
                </Button>
              )}

              {/* Record Payment */}
              {balance > 0 && rawStatus !== "CANCELLED" && (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl font-semibold border-emerald-600/40 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 text-xs"
                  onClick={() => setDepositModalOpen(true)}
                >
                  <DollarSign className="mr-2 h-4 w-4 text-emerald-600" />
                  Record Customer Payment ({formatCurrency(balance)} due)
                </Button>
              )}

              {/* Advance to In Warehouse */}
              {rawStatus === "CONFIRMED" || rawStatus === "DEPOSIT_PAID" || rawStatus === "PAID" ? (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl font-semibold text-xs"
                  onClick={() => handleStatusChange("IN_WAREHOUSE", "In Warehouse")}
                  disabled={updateStatusMutation.isPending}
                >
                  <Warehouse className="mr-2 h-4 w-4 text-purple-600" />
                  Move to Warehouse / Production
                </Button>
              ) : null}

              {/* Schedule Delivery */}
              {!delivery && rawStatus !== "CANCELLED" && rawStatus !== "QUOTE" && rawStatus !== "DRAFT" && (
                <Button
                  variant="default"
                  className="w-full justify-start rounded-xl font-semibold bg-primary text-primary-foreground text-xs"
                  onClick={handleScheduleDelivery}
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Schedule Delivery & Create Challan
                </Button>
              )}

              {/* Delivery info card if created */}
              {delivery && (
                <div className="rounded-xl border bg-muted/30 p-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">
                      Delivery Challan Registered
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {delivery.status?.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-foreground flex items-center gap-1.5 pt-0.5">
                    <Truck className="h-3.5 w-3.5 text-primary shrink-0" />
                    Scheduled Dispatch: {formatDate(delivery.scheduledDate)}
                  </p>
                </div>
              )}

              {/* Action 1: Dispatch Vehicle (Out for Delivery) if delivery is SCHEDULED */}
              {delivery &&
                delivery.status === "SCHEDULED" &&
                rawStatus !== "DELIVERED" &&
                rawStatus !== "CANCELLED" && (
                  <Button
                    variant="default"
                    className="w-full justify-start rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    onClick={() => {
                      updateDeliveryMutation.mutate(
                        { id: delivery.id, status: "OUT_FOR_DELIVERY" },
                        {
                          onSuccess: () => toast.success("Order Dispatched (Out for Delivery)"),
                          onError: (err) =>
                            toast.error("Dispatch update failed", { description: getErrorMessage(err) }),
                        }
                      );
                    }}
                    disabled={updateDeliveryMutation.isPending}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    {updateDeliveryMutation.isPending ? "Dispatching..." : "Dispatch Vehicle (Out for Delivery)"}
                  </Button>
                )}

              {/* Action 2: Mark Delivered & Complete */}
              {rawStatus !== "DELIVERED" &&
                rawStatus !== "CANCELLED" &&
                rawStatus !== "DRAFT" &&
                rawStatus !== "QUOTE" && (
                  <Button
                    variant={
                      delivery?.status === "OUT_FOR_DELIVERY" || rawStatus === "DISPATCHED" || rawStatus === "OUT_FOR_DELIVERY"
                        ? "default"
                        : "outline"
                    }
                    className={`w-full justify-start rounded-xl font-bold text-xs ${
                      delivery?.status === "OUT_FOR_DELIVERY" || rawStatus === "DISPATCHED" || rawStatus === "OUT_FOR_DELIVERY"
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        : "border-muted-foreground/30 text-muted-foreground opacity-60"
                    }`}
                    onClick={() => setDeliverModalOpen(true)}
                    disabled={
                      updateStatusMutation.isPending ||
                      (rawStatus !== "OUT_FOR_DELIVERY" &&
                        rawStatus !== "DISPATCHED" &&
                        delivery?.status !== "OUT_FOR_DELIVERY")
                    }
                    title={
                      rawStatus !== "OUT_FOR_DELIVERY" &&
                      rawStatus !== "DISPATCHED" &&
                      delivery?.status !== "OUT_FOR_DELIVERY"
                        ? "Dispatch vehicle (Out for Delivery) prior to marking order delivered"
                        : ""
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {updateStatusMutation.isPending ? "Updating..." : "Mark Delivered & Complete"}
                  </Button>
                )}

              {/* Invoicing quick triggers */}
              {rawStatus !== "CANCELLED" && rawStatus !== "QUOTE" && (
                <div className="pt-2 border-t space-y-2">
                  {!existingVatPan && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-xl text-xs text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                      onClick={() => handleCreateInvoice("VAT")}
                    >
                      <FileText className="mr-2 h-4 w-4 text-emerald-600" />
                      Create Tax Invoice (VAT)
                    </Button>
                  )}
                  {!existingEstimate && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start rounded-xl text-xs text-blue-700 hover:bg-blue-50 dark:text-blue-300"
                      onClick={() => handleCreateInvoice("ESTIMATE")}
                    >
                      <Receipt className="mr-2 h-4 w-4 text-blue-600" />
                      Create Estimate Bill
                    </Button>
                  )}
                </div>
              )}

              {/* Void Order Action */}
              {rawStatus !== "CANCELLED" && rawStatus !== "DELIVERED" && (
                <div className="pt-2 border-t">
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10 text-xs"
                    onClick={handleVoidOrder}
                    disabled={cancelMutation.isPending}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {cancelMutation.isPending ? "Voiding Order..." : "Void Sales Order"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Modals & Dialogs ── */}
      {depositModalOpen && (
        <RecordDepositModal
          orderId={order.id}
          orderNumber={order.id}
          onClose={() => setDepositModalOpen(false)}
          defaultAmount={balance}
        />
      )}

      <Dialog open={createInvoiceOpen} onOpenChange={setCreateInvoiceOpen}>
        <DialogContent className="max-w-5xl p-0 overflow-y-auto max-h-[90vh] rounded-3xl">
          <CreateInvoiceForm
            onClose={() => setCreateInvoiceOpen(false)}
            defaultSoId={id}
            defaultInvoiceType={invoiceTypeToCreate}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Mark Sales Order Delivered</DialogTitle>
            <DialogDescription>
              Select the official delivery date to log final order fulfillment and update the
              Order-to-Cash cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <label className="text-xs font-semibold">Delivery Date (BS / AD)</label>
            <NepaliDatePickerInput
              value={deliverDate}
              onChange={(date) => setDeliverDate(date.toISOString().split("T")[0])}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverModalOpen(false)} className="rounded-xl">
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
              className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm Delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleDeliveryModalOpen} onOpenChange={setScheduleDeliveryModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-3xl border">
          <ScheduleDeliveryForm
            defaultSoId={id}
            onClose={() => setScheduleDeliveryModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
