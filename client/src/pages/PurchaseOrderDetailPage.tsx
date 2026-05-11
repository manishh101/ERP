import { useParams, Link, useNavigate } from "react-router-dom";
import {
  usePurchaseOrderQuery,
  usePurchaseOrderMatchMutation,
  useReceivePurchaseOrderMutation,
} from "@/hooks/use-queries";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/auth-provider";
import { getErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, CheckCircle, PackageSearch, Printer } from "lucide-react";
import { formatCurrency, formatDate, formatNumber, toNumber } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";
import { useState } from "react";

export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = usePurchaseOrderQuery(id);
  const { user } = useAuth();

  const matchPurchaseOrder = usePurchaseOrderMatchMutation();
  const receivePurchaseOrder = useReceivePurchaseOrderMutation();

  const [matchResult, setMatchResult] = useState<any>(null);

  const canRunMatch =
    user?.role === "ADMIN" ||
    user?.role === "ACCOUNTANT" ||
    user?.role === "WAREHOUSE";
  const canReceive = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

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
    return <div className="p-8 text-destructive">Purchase order not found.</div>;

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

  const handleRunMatch = async () => {
    if (!id) return;
    try {
      const summary = await matchPurchaseOrder.mutateAsync({ id });
      setMatchResult(summary);
      toast.success(
        summary.isMatched ? "3-way match passed" : "3-way match flagged",
        {
          description: summary.isMatched
            ? `Matched across PO, receipts, and invoices.`
            : `Value mismatch detected.`,
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
        notes: `Receipt captured for ${order.supplier}.`,
        lines: pendingLines,
      });
      toast.success("Goods received", {
        description: `${formatNumber(
          pendingLines.reduce(
            (sum: number, line: any) => sum + line.quantityReceived,
            0,
          ),
        )} units were received.`,
      });
    } catch (e) {
      toast.error("Receipt failed", { description: getErrorMessage(e) });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/purchasing">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Purchase Order {order.id}
            </h1>
            <p className="text-muted-foreground">{order.supplier}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge value={order.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Order Date</p>
                  <p className="font-medium">{formatDate(order.orderDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected Delivery</p>
                  <p className="font-medium">
                    {order.expectedDelivery
                      ? formatDate(order.expectedDelivery)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Shipping Terms</p>
                  <p className="font-medium">{order.shippingTerms || "—"}</p>
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

          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <p className="text-muted-foreground text-sm italic">
                  No line items.
                </p>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty Ordered</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Tax</TableHead>
                        <TableHead className="text-right">Total</TableHead>
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
                          <TableRow key={li.id}>
                            <TableCell>
                              <p className="font-medium">
                                {li.productVariant?.product?.name || "Product"}
                              </p>
                              {li.productVariant?.variantName &&
                                li.productVariant.variantName !== "Default" && (
                                  <p className="text-xs text-muted-foreground">
                                    {li.productVariant.variantName}
                                  </p>
                                )}
                            </TableCell>
                            <TableCell className="text-right">{qty}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium">
                              {received}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(cost)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(tax)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(lineTotal)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/40 font-bold border-t-2">
                        <TableCell colSpan={5} className="text-right">
                          Order Total
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(toNumber(order.totalAmount))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supplier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-lg">{order.supplier}</p>
              <Button variant="link" className="p-0 h-auto" asChild>
                <Link to={`/suppliers/${order.supplierId}`}>
                  View Supplier Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {pendingLines.length > 0 && (
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={handleReceiveGoods}
                  disabled={!canReceive || receivePurchaseOrder.isPending}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />
                  {receivePurchaseOrder.isPending
                    ? "Receiving..."
                    : "Receive Remaining Goods"}
                </Button>
              )}

              <Button
                variant="outline"
                className="justify-start"
                onClick={handleRunMatch}
                disabled={!canRunMatch || matchPurchaseOrder.isPending}
              >
                <PackageSearch className="mr-2 h-4 w-4 text-blue-600" />
                {matchPurchaseOrder.isPending ? "Matching..." : "Run 3-way Match"}
              </Button>

              {matchResult && (
                <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                  <p className="font-semibold mb-1">Match Result</p>
                  <StatusBadge
                    value={
                      matchResult.isMatched ? "Matched" : "Variance Detected"
                    }
                  />
                  {!matchResult.isMatched && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Review receipts and invoices to resolve discrepancies.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
