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
  usePurchaseOrderMatchMutation,
  usePurchaseOrdersQuery,
  useReceivePurchaseOrderMutation,
  useSuppliersQuery,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type {
  PurchaseOrderMatchSummary,
  PurchaseOrderRow,
  SupplierRow,
} from "@/types/domain";
import { CreateSupplierForm } from "@/components/purchasing/create-supplier-form";
import { CreatePurchaseOrderForm } from "@/components/purchasing/create-po-form";

export function PurchasingPage() {
  const { user } = useAuth();

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

  const [matchResults, setMatchResults] = useState<
    Record<string, PurchaseOrderMatchSummary>
  >({});
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);
  const [createPoOpen, setCreatePoOpen] = useState(false);

  const canRunMatch =
    user?.role === "ADMIN" ||
    user?.role === "ACCOUNTANT" ||
    user?.role === "WAREHOUSE";
  const canReceive = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const matchingPurchaseOrderId = matchPurchaseOrder.variables?.id ?? null;
  const receivingPurchaseOrderId = receivePurchaseOrder.variables?.id ?? null;

  const supplierColumns: ColumnDef<SupplierRow>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Supplier Name" },
      { accessorKey: "country", header: "Country" },
      { accessorKey: "leadTime", header: "Lead Time" },
      {
        accessorKey: "onTimeRate",
        header: "On-time Rate",
        cell: ({ row }) => (
          <span className="font-semibold text-emerald-600">
            {row.getValue("onTimeRate")}
          </span>
        ),
      },
      {
        accessorKey: "spend",
        header: () => <div className="text-right">Spend</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium">
            {formatCurrency(row.getValue("spend") as number)}
          </div>
        ),
      },
    ],
    [],
  );

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

  if (suppliersLoading) return <Skeleton className="h-[420px]" />;
  if (suppliersError) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Supplier data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(suppliersError)}
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!suppliers) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchasing & Suppliers"
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

      {createSupplierOpen && (
        <CreateSupplierForm onClose={() => setCreateSupplierOpen(false)} />
      )}
      {createPoOpen && (
        <CreatePurchaseOrderForm onClose={() => setCreatePoOpen(false)} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supplier Directory</CardTitle>
          <CardDescription>
            On-time delivery rate, average lead time, and total spend by
            supplier.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={supplierColumns}
            data={suppliers.items}
            searchPlaceholder="Search suppliers..."
            pageSize={10}
            emptyMessage="No suppliers found."
          />
        </CardContent>
      </Card>

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
    </div>
  );
}
