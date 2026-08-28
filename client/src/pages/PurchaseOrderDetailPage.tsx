import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  usePurchaseOrderQuery,
  usePurchaseOrderMatchMutation,
  useReceivePurchaseOrderMutation,
  useUpdatePurchaseOrderStatusMutation,
} from "@/hooks/use-queries";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, 
  CheckCircle, 
  PackageSearch, 
  Printer, 
  Send, 
  CheckCircle2, 
  Clock, 
  Truck, 
  FileCheck, 
  ShieldCheck,
  Building2,
  XCircle,
  TrendingUp,
  Receipt
} from "lucide-react";
import { formatCurrency, formatDate, formatNumber, toNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { ReceiveGoodsModal } from "@/components/purchasing/receive-goods-modal";

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = usePurchaseOrderQuery(id);
  const { user } = useAuth();

  const matchPurchaseOrder = usePurchaseOrderMatchMutation();
  const receivePurchaseOrder = useReceivePurchaseOrderMutation();
  const updateStatus = useUpdatePurchaseOrderStatusMutation();

  const [matchResult, setMatchResult] = useState<any>(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);

  const canRunMatch =
    user?.role === "ADMIN" ||
    user?.role === "ACCOUNTANT" ||
    user?.role === "WAREHOUSE";
  const canReceive = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const canApprove = user?.role === "ADMIN" || user?.role === "ACCOUNTANT";

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

  if (!order)
    return <div className="p-8 text-destructive font-medium">Purchase order not found.</div>;

  const lineItems = order.lineItems ?? [];
  const pendingLines = lineItems
    .map((lineItem: any) => ({
      poLineItemId: lineItem.id,
      quantityReceived: Math.max(
        lineItem.quantity - lineItem.receivedQuantity,
        0,
      ),
      discrepancyQty: 0,
    }))
    .filter((lineItem: any) => lineItem.quantityReceived > 0);

  const rawStatus = (order.rawStatus || order.status).toUpperCase();

  // Helper to change status
  const handleStatusChange = async (newStatus: string, label: string) => {
    if (!id) return;
    try {
      await updateStatus.mutateAsync({ id, status: newStatus });
      toast.success(`Purchase Order ${label}`, {
        description: `Status updated to ${newStatus}.`,
      });
    } catch (e) {
      toast.error("Status update failed", { description: getErrorMessage(e) });
    }
  };

  const handleRunMatch = async () => {
    if (!id) return;
    try {
      const summary = await matchPurchaseOrder.mutateAsync({ id });
      setMatchResult(summary);
      toast.success(
        summary.isMatched ? "3-Way Match Verified" : "3-Way Match Flagged",
        {
          description: summary.isMatched
            ? `PO Amount, Goods Received, and Supplier Invoice match perfectly.`
            : `Variance detected between PO, Receipts, or Invoices.`,
        },
      );
    } catch (e) {
      toast.error("Match failed", { description: getErrorMessage(e) });
    }
  };

  const handleReceiveGoods = async () => {
    if (!id) return;
    try {
      await receivePurchaseOrder.mutateAsync({
        id,
        notes: `Receipt recorded for ${order.supplier}.`,
        lines: pendingLines,
      });
      toast.success("Goods received", {
        description: `${formatNumber(
          pendingLines.reduce(
            (sum: number, line: any) => sum + line.quantityReceived,
            0,
          ),
        )} units successfully logged to inventory.`,
      });
    } catch (e) {
      toast.error("Receipt failed", { description: getErrorMessage(e) });
    }
  };

  // Status Stepper Progress Logic
  const PO_STEPS = [
    { key: "DRAFT", label: "Draft", icon: Clock },
    { key: "APPROVED", label: "Approved", icon: ShieldCheck },
    { key: "SENT", label: "Sent to Supplier", icon: Send },
    { key: "RECEIVED", label: "Goods Received", icon: Truck },
  ];

  const getStepIndex = (status: string) => {
    switch (status) {
      case "DRAFT":
        return 0;
      case "APPROVED":
        return 1;
      case "SENT":
        return 2;
      case "PARTIALLY_RECEIVED":
      case "RECEIVED":
      case "INVOICED":
      case "CLOSED":
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIdx = getStepIndex(rawStatus);

  // Calculated financial metrics
  const poAmount = toNumber(order.totalAmount);
  const invoicedTotal = (order.rawSupplierInvoices || []).reduce((sum: number, inv: any) => sum + toNumber(inv.totalAmount), 0);
  const paidTotal = (order.rawPayments || []).reduce((sum: number, pay: any) => sum + toNumber(pay.amount), 0);
  const balancePayable = Math.max(invoicedTotal - paidTotal, 0);

  const receivedValue = lineItems.reduce((sum: number, li: any) => {
    const qty = toNumber(li.quantity);
    const rec = toNumber(li.receivedQuantity);
    const cost = toNumber(li.unitCost);
    const tax = toNumber(li.taxAmount);
    const itemTotal = qty * cost + tax;
    return sum + (qty > 0 ? (rec / qty) * itemTotal : 0);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="rounded-xl" asChild>
            <Link to="/purchasing">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">
                PO-{order.id.slice(0, 8)}
              </h1>
              <StatusBadge value={order.status} />
            </div>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Building2 className="h-3.5 w-3.5" />
              <Link to={`/suppliers/${order.supplierId}`} className="hover:underline font-medium text-foreground">
                {order.supplier}
              </Link>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print PO
          </Button>
        </div>
      </div>

      {/* Visual PO Lifecycle Pipeline Stepper */}
      {rawStatus !== "CANCELLED" ? (
        <Card className="shadow-xs border-primary/20 bg-muted/20">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between relative">
              {/* Stepper Progress Line */}
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted-foreground/20 -translate-y-1/2 z-0" />
              <div
                className="absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-300"
                style={{
                  width: `${(Math.max(0, currentStepIdx) / (PO_STEPS.length - 1)) * 100}%`,
                }}
              />

              {PO_STEPS.map((step, idx) => {
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
                      {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="text-center">
                      <p
                        className={`text-xs font-semibold ${
                          isCurrent ? "text-primary font-bold" : isCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-destructive/30 bg-destructive/5 shadow-xs">
          <CardContent className="p-4 flex items-center gap-3 text-destructive font-medium text-sm">
            <XCircle className="h-5 w-5" />
            <span>This Purchase Order has been cancelled.</span>
          </CardContent>
        </Card>
      )}

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="shadow-xs border-primary/20 bg-primary/5">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground block">PO Agreed Total</span>
            <span className="text-base font-bold font-mono text-primary mt-0.5 block">{formatCurrency(poAmount)}</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground block">Received Goods Value</span>
            <span className="text-base font-bold font-mono text-blue-700 dark:text-blue-400 mt-0.5 block">{formatCurrency(receivedValue)}</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground block">Logged Invoices</span>
            <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-0.5 block">{formatCurrency(invoicedTotal)}</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-purple-500/20 bg-purple-500/5">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground block">Amount Paid</span>
            <span className="text-base font-bold font-mono text-purple-700 dark:text-purple-400 mt-0.5 block">{formatCurrency(paidTotal)}</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-amber-500/20 bg-amber-500/5 col-span-2 sm:col-span-1">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground block">Balance Payable</span>
            <span className={`text-base font-bold font-mono mt-0.5 block ${balancePayable > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-600"}`}>
              {formatCurrency(balancePayable)}
            </span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Order Metadata & Line Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order Meta Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm bg-muted/20 p-4 rounded-xl border border-border/40">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Status</p>
                  <div className="mt-1">
                    <StatusBadge value={order.status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Order Date</p>
                  <p className="font-semibold text-foreground mt-1">{formatDate(order.orderDate)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Expected Delivery</p>
                  <p className="font-semibold text-foreground mt-1">
                    {order.expectedDelivery ? formatDate(order.expectedDelivery) : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Total Amount</p>
                  <p className="font-bold text-primary text-base mt-0.5">
                    {formatCurrency(toNumber(order.totalAmount))}
                  </p>
                </div>
              </div>

              {(order.shippingTerms || order.notes) && (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {order.shippingTerms && (
                    <div className="p-3 bg-muted/40 rounded-xl border">
                      <span className="font-bold block text-muted-foreground">Shipping / Delivery Terms</span>
                      <p className="mt-1 font-medium">{order.shippingTerms}</p>
                    </div>
                  )}
                  {order.notes && (
                    <div className="p-3 bg-muted/40 rounded-xl border">
                      <span className="font-bold block text-muted-foreground">Internal Notes</span>
                      <p className="mt-1 font-medium">{order.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Purchased Items</CardTitle>
                <CardDescription className="text-xs">
                  Items ordered from supplier with received & pending inventory tracking.
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {lineItems.length} {lineItems.length === 1 ? "Item" : "Items"}
              </Badge>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm italic p-4 text-center">
                  No line items attached to this purchase order.
                </p>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Product / Material</TableHead>
                        <TableHead className="text-right">Qty Ordered</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Tax/VAT</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((li: any) => {
                        const qty = toNumber(li.quantity);
                        const received = toNumber(li.receivedQuantity);
                        const cost = toNumber(li.unitCost);
                        const tax = toNumber(li.taxAmount);
                        const lineTotal = qty * cost + tax;

                        return (
                          <TableRow key={li.id} className="hover:bg-muted/20">
                            <TableCell>
                              <p className="font-semibold text-sm">
                                {li.supplierItemName || li.productVariant?.product?.name || li.productName || "Product"}
                              </p>
                              {li.supplierItemName &&
                                li.productVariant?.product?.name &&
                                li.supplierItemName !== li.productVariant.product.name && (
                                  <p className="text-xs text-muted-foreground font-mono">
                                    Catalog Item: {li.productVariant.product.name}
                                  </p>
                                )}
                              {li.productVariant?.variantName &&
                                li.productVariant.variantName !== "Default" && (
                                  <p className="text-xs text-muted-foreground">
                                    Variant: {li.productVariant.variantName}
                                  </p>
                                )}
                            </TableCell>
                            <TableCell className="text-right font-medium">{qty}</TableCell>
                            <TableCell className="text-right font-semibold">
                              <span className={received >= qty ? "text-emerald-600" : received > 0 ? "text-amber-600" : "text-muted-foreground"}>
                                {received} / {qty}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatCurrency(cost)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatCurrency(tax)}
                            </TableCell>
                            <TableCell className="text-right font-semibold font-mono text-sm">
                              {formatCurrency(lineTotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/40 font-bold border-t-2">
                        <TableCell colSpan={5} className="text-right text-sm">
                          Grand PO Amount:
                        </TableCell>
                        <TableCell className="text-right text-primary text-base font-bold font-mono">
                          {formatCurrency(toNumber(order.totalAmount))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Connected Procurement Lifecycle Documents Hub */}
          <Card className="shadow-xs border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                Connected Procurement Workflow Documents
              </CardTitle>
              <CardDescription className="text-xs">
                Direct cross-navigation across Goods Receipts, Supplier Invoices, and Payments for PO-{order.id.slice(0, 8)}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Goods Receipts */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-blue-600" /> Goods Receipts ({order.rawGoodsReceipts?.length || 0})
                  </h4>
                </div>
                {(!order.rawGoodsReceipts || order.rawGoodsReceipts.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded-lg">
                    No goods receipts logged yet. Click "Receive Goods" to record physical inventory receipt.
                  </p>
                ) : (
                  <div className="divide-y rounded-xl border bg-muted/10 overflow-hidden text-xs">
                    {order.rawGoodsReceipts.map((gr) => (
                      <div key={gr.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground">Receipt #{gr.receiptNumber}</span>
                          <p className="text-muted-foreground">Received on {formatDate(gr.receivedAt)} {gr.notes ? `• ${gr.notes}` : ""}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px] bg-blue-50 dark:bg-blue-950/40 text-blue-700">
                          {gr.linesCount} Item Line(s) Received
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Logged Supplier Invoices */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-emerald-600" /> Supplier VAT Invoices ({order.rawSupplierInvoices?.length || 0})
                  </h4>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" asChild>
                    <Link to="/supplier-invoices">View All Invoices</Link>
                  </Button>
                </div>
                {(!order.rawSupplierInvoices || order.rawSupplierInvoices.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded-lg">
                    No supplier tax invoices recorded. Invoices can be attached when receiving goods.
                  </p>
                ) : (
                  <div className="divide-y rounded-xl border border-emerald-500/20 bg-emerald-500/5 overflow-hidden text-xs">
                    {order.rawSupplierInvoices.map((inv) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-emerald-500/10">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">Invoice #{inv.invoiceNumber}</span>
                            <StatusBadge value={inv.status} />
                          </div>
                          <p className="text-muted-foreground">
                            Bill Date: {formatDate(inv.issueDate)} {inv.notes ? `• ${inv.notes}` : ""}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="font-bold font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                            {formatCurrency(inv.totalAmount)}
                          </p>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] rounded-lg border-emerald-500 text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950" asChild>
                            <Link to={`/payments?new=1`}>Record Payment</Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payments Recorded */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-purple-600" /> Supplier Payments ({order.rawPayments?.length || 0})
                  </h4>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-purple-600" asChild>
                    <Link to="/payments">View Payments Ledger</Link>
                  </Button>
                </div>
                {(!order.rawPayments || order.rawPayments.length === 0) ? (
                  <p className="text-xs text-muted-foreground italic p-2 bg-muted/20 rounded-lg">
                    No supplier payments recorded for this purchase order yet.
                  </p>
                ) : (
                  <div className="divide-y rounded-xl border border-purple-500/20 bg-purple-500/5 overflow-hidden text-xs">
                    {order.rawPayments.map((pay) => (
                      <div key={pay.id} className="p-3 flex items-center justify-between hover:bg-purple-500/10">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground">Payment Date: {formatDate(pay.paymentDate)}</span>
                          <p className="text-muted-foreground">
                            Method: <strong>{pay.method}</strong> {pay.reference ? `• Ref: ${pay.reference}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold font-mono text-purple-700 dark:text-purple-400 text-sm">
                            {formatCurrency(pay.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Actions & 3-Way Match */}
        <div className="space-y-6">
          {/* Supplier Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Supplier Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="font-bold text-lg text-foreground">{order.supplier}</p>
              </div>
              <Button variant="outline" size="sm" className="rounded-xl w-full" asChild>
                <Link to={`/suppliers/${order.supplierId}`}>
                  View Supplier Details & Ledger
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Workflow Action Panel */}
          <Card className="shadow-xs border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Order Actions & Workflow</CardTitle>
              <CardDescription className="text-xs">
                Advance this PO through its procurement workflow steps.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Approval Action */}
              {rawStatus === "DRAFT" && (
                <Button
                  className="w-full justify-start rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleStatusChange("APPROVED", "Approved")}
                  disabled={!canApprove || updateStatus.isPending}
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {updateStatus.isPending ? "Updating..." : "Approve Purchase Order"}
                </Button>
              )}

              {/* Mark Sent Action */}
              {rawStatus === "APPROVED" && (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-primary/40 text-primary hover:bg-primary/5 font-semibold"
                  onClick={() => handleStatusChange("SENT", "Sent to Supplier")}
                  disabled={updateStatus.isPending}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {updateStatus.isPending ? "Updating..." : "Mark as Sent to Supplier"}
                </Button>
              )}

              {/* Receive Goods & Log VAT Bill Action */}
              {rawStatus !== "CANCELLED" && rawStatus !== "DRAFT" && (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
                  onClick={() => setReceiveModalOpen(true)}
                  disabled={!canReceive}
                >
                  <Receipt className="mr-2 h-4 w-4 text-emerald-600" />
                  {pendingLines.length > 0
                    ? `Receive Goods & Log VAT Bill (${pendingLines.length} pending items)`
                    : `Log / Update Supplier VAT Bill`}
                </Button>
              )}

              {/* Close Purchase Order Action */}
              {(rawStatus === "PARTIALLY_RECEIVED" || rawStatus === "RECEIVED") && (
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-blue-500 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 font-semibold"
                  onClick={() => handleStatusChange("CLOSED", "Closed")}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-blue-600" />
                  Close Purchase Order
                </Button>
              )}

              {/* Run 3-Way Match Action */}
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl"
                onClick={handleRunMatch}
                disabled={!canRunMatch || matchPurchaseOrder.isPending}
              >
                <PackageSearch className="mr-2 h-4 w-4 text-blue-600" />
                {matchPurchaseOrder.isPending ? "Verifying..." : "Run 3-Way Match Verification"}
              </Button>

              {/* Cancel Action */}
              {rawStatus !== "CANCELLED" && rawStatus !== "CLOSED" && (
                <Button
                  variant="ghost"
                  className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10"
                  onClick={() => handleStatusChange("CANCELLED", "Cancelled")}
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Order
                </Button>
              )}

              {/* 3-Way Match Output Display */}
              {matchResult && (
                <div className="mt-4 p-4 bg-muted/40 rounded-xl border space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">3-Way Match Status</span>
                    <Badge variant={matchResult.isMatched ? "default" : "destructive"}>
                      {matchResult.isMatched ? "MATCHED" : "FLAGGED"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-[11px]">
                    <div>
                      <span className="text-muted-foreground block">PO Value</span>
                      <strong className="text-foreground">{formatCurrency(matchResult.poValue)}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Received</span>
                      <strong className="text-foreground">{formatCurrency(matchResult.receivedValue)}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Invoiced</span>
                      <strong className="text-foreground">{formatCurrency(matchResult.invoicedValue)}</strong>
                    </div>
                  </div>
                  {!matchResult.isMatched && (
                    <p className="text-[11px] text-destructive pt-1">
                      Variance detected between agreed PO amount and logged receipts/supplier invoices.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ReceiveGoodsModal
        open={receiveModalOpen}
        onOpenChange={setReceiveModalOpen}
        order={order}
      />
    </div>
  );
}

