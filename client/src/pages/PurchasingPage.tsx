import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type DropdownAction } from "@/components/shared/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  usePurchaseOrderMatchMutation,
  usePurchaseOrdersQuery,
  useReceivePurchaseOrderMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type {
  PurchaseOrderMatchSummary,
  PurchaseOrderRow,
} from "@/types/domain";
import { CreatePurchaseOrderForm } from "@/components/purchasing/create-po-form";
import { useNavigate } from "react-router-dom";

export function PurchasingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    data: purchaseOrders,
    error: purchaseOrdersError,
    isLoading: purchaseOrdersLoading,
  } = usePurchaseOrdersQuery();

  const matchPurchaseOrder = usePurchaseOrderMatchMutation();
  const receivePurchaseOrder = useReceivePurchaseOrderMutation();

  const [matchResults, setMatchResults] = useState<
    Record<string, PurchaseOrderMatchSummary>
  >({});
  const [createPoOpen, setCreatePoOpen] = useState(false);

  const canRunMatch =
    user?.role === "ADMIN" ||
    user?.role === "ACCOUNTANT" ||
    user?.role === "WAREHOUSE";
  const canReceive = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const matchingPurchaseOrderId = matchPurchaseOrder.variables?.id ?? null;
  const receivingPurchaseOrderId = receivePurchaseOrder.variables?.id ?? null;

  const poColumns: ColumnDef<PurchaseOrderRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "PO Number",
        cell: ({ row }) => (
          <span className="font-semibold">{row.getValue("id")}</span>
        ),
      },
      { accessorKey: "supplier", header: "Supplier" },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
      },
      {
        accessorKey: "orderDate",
        header: "Ordered",
        cell: ({ row }) => formatDate(row.getValue("orderDate")),
      },
      {
        accessorKey: "expectedDelivery",
        header: "Expected",
        cell: ({ row }) => formatDate(row.getValue("expectedDelivery")),
      },
      {
        accessorKey: "totalAmount",
        header: () => <div className="text-right">Value</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.getValue("totalAmount") as number)}
          </div>
        ),
      },
      {
        id: "progress",
        header: () => <div className="text-right">Pending/Receipts</div>,
        cell: ({ row }) => {
          const order = row.original;
          const fullyReceived = order.pendingQuantity <= 0;
          return (
            <div className="text-right flex flex-col text-xs">
              <span
                className={
                  fullyReceived ? "text-emerald-600 font-semibold" : ""
                }
              >
                Pending: {formatNumber(order.pendingQuantity)} units
              </span>
              <span className="text-muted-foreground">
                Receipts: {formatNumber(order.receipts)} logs
              </span>
            </div>
          );
        },
      },
      {
        id: "match",
        header: "Match Result",
        cell: ({ row }) => {
          const res = matchResults[row.original.id];
          if (!res)
            return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <StatusBadge
              value={res.isMatched ? "Matched" : "Variance Detected"}
            />
          );
        },
      },
    ],
    [matchResults],
  );

  const poActions = (
    order: PurchaseOrderRow,
  ): DropdownAction<PurchaseOrderRow>[] => {
    const pendingLines = order.lineItems
      .map((lineItem) => ({
        poLineItemId: lineItem.id,
        quantityReceived: Math.max(
          lineItem.quantity - lineItem.receivedQuantity,
          0,
        ),
        discrepancyQty: 0,
      }))
      .filter((lineItem) => lineItem.quantityReceived > 0);

    return [
      {
        label: "View Details",
        onClick: () => navigate(`/purchasing/${order.id}`),
      },
      {
        label:
          matchPurchaseOrder.isPending && matchingPurchaseOrderId === order.id
            ? "Matching..."
            : "Run 3-way Match",
        onClick: async () => {
          if (!canRunMatch)
            return toast.error("Insufficient permissions for 3-way match.");
          try {
            const summary = await matchPurchaseOrder.mutateAsync({
              id: order.id,
            });
            setMatchResults((current) => ({ ...current, [order.id]: summary }));
            toast.success(
              summary.isMatched ? "3-way match passed" : "3-way match flagged",
              {
                description: summary.isMatched
                  ? `${order.id} matched across PO, receipts, and invoices.`
                  : `${order.id} has a value mismatch that needs review.`,
              },
            );
          } catch (e) {
            toast.error("Match failed", { description: getErrorMessage(e) });
          }
        },
      },
      {
        label:
          pendingLines.length === 0
            ? "Fully Received"
            : receivePurchaseOrder.isPending &&
                receivingPurchaseOrderId === order.id
              ? "Receiving..."
              : "Receive Remaining Goods",
        onClick: async () => {
          if (!canReceive)
            return toast.error("Insufficient permissions to receive goods.");
          if (pendingLines.length === 0)
            return toast.info("Nothing to receive", {
              description: `${order.id} is already fully received.`,
            });
          try {
            await receivePurchaseOrder.mutateAsync({
              id: order.id,
              notes: `Receipt captured from the ERP client for ${order.supplier}.`,
              lines: pendingLines,
            });
            toast.success("Goods received", {
              description: `${formatNumber(pendingLines.reduce((sum, line) => sum + line.quantityReceived, 0))} units were received for ${order.id}.`,
            });
          } catch (e) {
            toast.error("Receipt failed", { description: getErrorMessage(e) });
          }
        },
      },
    ];
  };

  if (purchaseOrdersLoading) return <Skeleton className="h-[420px]" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        actions={[
          {
            label: "New Purchase Order",
            variant: "default",
            onClick: () => setCreatePoOpen(true),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            Live purchase order receipts and match controls backed by the API.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseOrdersError ? (
            <div className="rounded-2xl border border-border bg-white p-4">
              <p className="font-semibold">
                Purchase orders could not be loaded.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {getErrorMessage(purchaseOrdersError)}
              </p>
            </div>
          ) : (
            <DataTable
              isLoading={purchaseOrdersLoading}
              columns={poColumns}
              data={purchaseOrders?.items || []}
              actions={poActions}
              onRowClick={(row) => navigate(`/purchasing/${row.id}`)}
              searchPlaceholder="Search POs..."
              pageSize={15}
              emptyMessage="No purchase orders found."
            />
          )}

          {!canRunMatch || !canReceive ? (
            <p className="text-sm text-muted-foreground mt-4">
              Receiving requires an admin or warehouse role. 3-way match
              requires admin, accountant, or warehouse access.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Sheet open={createPoOpen} onOpenChange={setCreatePoOpen}>
        <SheetContent className="sm:max-w-[90vw] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Create Purchase Order</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <CreatePurchaseOrderForm onClose={() => setCreatePoOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
