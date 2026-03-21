import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/layout/toast-provider";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  usePurchaseOrderMatchMutation,
  usePurchaseOrdersQuery,
  useReceivePurchaseOrderMutation,
  useSuppliersQuery,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { PurchaseOrderMatchSummary, PurchaseOrderRow } from "@/types/domain";
import { CreateSupplierForm } from "@/components/purchasing/create-supplier-form";
import { CreatePurchaseOrderForm } from "@/components/purchasing/create-po-form";

function describePurchaseOrder(order: PurchaseOrderRow) {
  if (order.pendingQuantity <= 0) {
    return "Fully received. This purchase order is ready for supplier invoice verification.";
  }

  if (order.receipts > 0) {
    return `${formatNumber(order.pendingQuantity)} units are still pending across ${formatNumber(order.lineItems.length)} line items.`;
  }

  return `Awaiting first receipt across ${formatNumber(order.lineItems.length)} line items.`;
}

function formatLineItemSummary(order: PurchaseOrderRow) {
  const preview = order.lineItems.slice(0, 2).map((lineItem) => {
    const remainingQuantity = Math.max(lineItem.quantity - lineItem.receivedQuantity, 0);
    return `${lineItem.product} / ${lineItem.variant} (${remainingQuantity} pending)`;
  });

  if (order.lineItems.length > 2) {
    preview.push(`+${order.lineItems.length - 2} more`);
  }

  return preview.join(" · ");
}

export function PurchasingPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const {
    data: suppliers,
    error: suppliersError,
    isLoading: suppliersLoading,
  } = useSuppliersQuery();
  const {
    data: purchaseOrders,
    error: purchaseOrdersError,
    isLoading: purchaseOrdersLoading,
  } = usePurchaseOrdersQuery();
  const matchPurchaseOrder = usePurchaseOrderMatchMutation();
  const receivePurchaseOrder = useReceivePurchaseOrderMutation();
  const [matchResults, setMatchResults] = useState<Record<string, PurchaseOrderMatchSummary>>({});
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [createPoOpen, setCreatePoOpen] = useState(false);

  const canRunMatch = user?.role === "ADMIN" || user?.role === "ACCOUNTANT" || user?.role === "WAREHOUSE";
  const canReceive = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const matchingPurchaseOrderId = matchPurchaseOrder.variables?.id ?? null;
  const receivingPurchaseOrderId = receivePurchaseOrder.variables?.id ?? null;

  if (suppliersLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (suppliersError) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Supplier data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(suppliersError)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!suppliers) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 3"
        title="Purchasing & Suppliers"
        description="Track supplier performance, manage purchase orders, receive goods with discrepancies, run 3-way matching, and monitor AP aging."
        actions={[
          {
            label: createSupplierOpen ? "Close Supplier Form" : "New Supplier",
            onClick: () => {
              setCreateSupplierOpen((c) => !c);
              setCreatePoOpen(false);
            },
          },
          {
            label: createPoOpen ? "Close PO Form" : "New Purchase Order",
            variant: "default",
            onClick: () => {
              setCreatePoOpen((c) => !c);
              setCreateSupplierOpen(false);
            },
          },
        ]}
      />

      {createSupplierOpen ? <CreateSupplierForm onClose={() => setCreateSupplierOpen(false)} /> : null}
      {createPoOpen ? <CreatePurchaseOrderForm onClose={() => setCreatePoOpen(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Supplier Performance</CardTitle>
              <CardDescription>On-time delivery rate, average lead time, and total spend by supplier.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {suppliers.items.map((supplier) => (
              <div key={supplier.id} className="rounded-3xl border border-border bg-white p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-display text-2xl">{supplier.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {supplier.country} · Lead time {supplier.leadTime}
                    </p>
                  </div>
                  <StatusBadge value={`On-time ${supplier.onTimeRate}`} />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Spend</p>
                    <p className="mt-2 font-semibold">{formatCurrency(supplier.spend)}</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">PO Workflow</p>
                    <p className="mt-2 font-semibold">Draft → Sent → Received</p>
                  </div>
                  <div className="rounded-2xl bg-secondary/60 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AP Aging</p>
                    <p className="mt-2 font-semibold">31-60 days monitored</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Receiving & 3-Way Match</CardTitle>
              <CardDescription>Live purchase order receipts and match controls backed by the API.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {purchaseOrdersLoading ? (
              <>
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
                <Skeleton className="h-28 rounded-2xl" />
              </>
            ) : purchaseOrdersError ? (
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">Purchase orders could not be loaded.</p>
                <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(purchaseOrdersError)}</p>
              </div>
            ) : purchaseOrders && purchaseOrders.items.length > 0 ? (
              purchaseOrders.items.map((order) => {
                const pendingLines = order.lineItems
                  .map((lineItem) => ({
                    poLineItemId: lineItem.id,
                    quantityReceived: Math.max(lineItem.quantity - lineItem.receivedQuantity, 0),
                    discrepancyQty: 0,
                  }))
                  .filter((lineItem) => lineItem.quantityReceived > 0);
                const matchResult = matchResults[order.id];

                return (
                  <div key={order.id} className="rounded-2xl border border-border bg-white p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold">{order.id}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {order.supplier} · Ordered {formatDate(order.orderDate)} · Expected{" "}
                          {formatDate(order.expectedDelivery)}
                        </p>
                      </div>
                      <StatusBadge value={order.status} />
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{describePurchaseOrder(order)}</p>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl bg-secondary/60 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">PO Value</p>
                        <p className="mt-2 font-semibold">{formatCurrency(order.totalAmount)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary/60 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Receipts Logged</p>
                        <p className="mt-2 font-semibold">{formatNumber(order.receipts)}</p>
                      </div>
                      <div className="rounded-2xl bg-secondary/60 p-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Pending Units</p>
                        <p className="mt-2 font-semibold">{formatNumber(order.pendingQuantity)}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">{formatLineItemSummary(order)}</p>

                    {matchResult ? (
                      <div className="mt-4 rounded-2xl bg-secondary/60 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold">Latest Match Result</p>
                          <StatusBadge value={matchResult.isMatched ? "Matched" : "Variance Detected"} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          PO {formatCurrency(matchResult.poValue)} · Received{" "}
                          {formatCurrency(matchResult.receivedValue)} · Invoiced{" "}
                          {formatCurrency(matchResult.invoicedValue)}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {formatNumber(matchResult.receipts)} receipts ·{" "}
                          {formatNumber(matchResult.supplierInvoices)} supplier invoices
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        disabled={!canRunMatch || matchPurchaseOrder.isPending}
                        onClick={async () => {
                          try {
                            const summary = await matchPurchaseOrder.mutateAsync({ id: order.id });
                            setMatchResults((current) => ({ ...current, [order.id]: summary }));
                            push(
                              summary.isMatched ? "3-way match passed" : "3-way match flagged",
                              summary.isMatched
                                ? `${order.id} matched across PO, receipts, and supplier invoices.`
                                : `${order.id} has a value mismatch that still needs review.`,
                            );
                          } catch (requestError) {
                            push("Match failed", getErrorMessage(requestError, "Unable to run 3-way match."));
                          }
                        }}
                      >
                        {matchPurchaseOrder.isPending && matchingPurchaseOrderId === order.id
                          ? "Matching..."
                          : "Run Match"}
                      </Button>
                      <Button
                        disabled={!canReceive || receivePurchaseOrder.isPending || pendingLines.length === 0}
                        onClick={async () => {
                          if (pendingLines.length === 0) {
                            push("Nothing to receive", `${order.id} is already fully received.`);
                            return;
                          }

                          try {
                            await receivePurchaseOrder.mutateAsync({
                              id: order.id,
                              notes: `Receipt captured from the ERP client for ${order.supplier}.`,
                              lines: pendingLines,
                            });
                            push(
                              "Goods received",
                              `${formatNumber(
                                pendingLines.reduce((sum, lineItem) => sum + lineItem.quantityReceived, 0),
                              )} units were received for ${order.id}.`,
                            );
                          } catch (requestError) {
                            push("Receipt failed", getErrorMessage(requestError, "Unable to receive goods."));
                          }
                        }}
                      >
                        {receivePurchaseOrder.isPending && receivingPurchaseOrderId === order.id
                          ? "Receiving..."
                          : pendingLines.length === 0
                            ? "Fully Received"
                            : "Receive Remaining"}
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">No purchase orders are available yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Once purchase orders exist, receiving and 3-way matching controls will appear here.
                </p>
              </div>
            )}

            {!canRunMatch || !canReceive ? (
              <p className="text-sm text-muted-foreground">
                Receiving requires an admin or warehouse role. 3-way match requires admin, accountant, or
                warehouse access.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
