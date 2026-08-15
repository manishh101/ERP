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
import { Button } from "@/components/ui/button";
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
import { ShoppingCart, Clock, Truck, CheckCircle2, DollarSign } from "lucide-react";

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
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL");

  const canRunMatch =
    user?.role === "ADMIN" ||
    user?.role === "ACCOUNTANT" ||
    user?.role === "WAREHOUSE";
  const canReceive = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const matchingPurchaseOrderId = matchPurchaseOrder.variables?.id ?? null;
  const receivingPurchaseOrderId = receivePurchaseOrder.variables?.id ?? null;

  const items = purchaseOrders?.items || [];

  // Summary KPI Calculations
  const totalPOValue = useMemo(() => items.reduce((sum, po) => sum + po.totalAmount, 0), [items]);
  const activeOrdersCount = useMemo(() => items.filter(po => {
    const raw = (po.rawStatus || po.status).toUpperCase();
    return raw !== "CANCELLED" && raw !== "CLOSED" && raw !== "RECEIVED";
  }).length, [items]);
  const totalPendingUnits = useMemo(() => items.reduce((sum, po) => sum + po.pendingQuantity, 0), [items]);

  // Filtered PO List by Tab
  const filteredPOs = useMemo(() => {
    if (selectedStatusTab === "ALL") return items;
    return items.filter(po => {
      const raw = (po.rawStatus || po.status).toUpperCase();
      if (selectedStatusTab === "DRAFT") return raw === "DRAFT";
      if (selectedStatusTab === "APPROVED") return raw === "APPROVED";
      if (selectedStatusTab === "SENT") return raw === "SENT";
      if (selectedStatusTab === "RECEIVED") return raw === "RECEIVED" || raw === "PARTIALLY_RECEIVED";
      return true;
    });
  }, [items, selectedStatusTab]);

  const poColumns: ColumnDef<PurchaseOrderRow>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "PO Number",
        cell: ({ row }) => (
          <span className="font-semibold font-mono text-sm">
            PO-{row.original.id.slice(0, 8)}
          </span>
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
          <div className="text-right tabular-nums font-semibold font-mono">
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
        label: "View Details & Workflow",
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

      {/* KPI Cards Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs bg-card border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Procurement Value</p>
              <h3 className="text-xl font-bold font-mono mt-1 text-foreground">
                {formatCurrency(totalPOValue)}
              </h3>
            </div>
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Procurement Orders</p>
              <h3 className="text-xl font-bold font-mono mt-1 text-foreground">
                {activeOrdersCount} <span className="text-xs text-muted-foreground font-sans font-normal">in progress</span>
              </h3>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-xs bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Pending Delivery Units</p>
              <h3 className="text-xl font-bold font-mono mt-1 text-foreground">
                {formatNumber(totalPendingUnits)} <span className="text-xs text-muted-foreground font-sans font-normal">units</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xs">
        <CardHeader className="pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold">Purchase Orders</CardTitle>
            <CardDescription className="text-xs">
              Live purchase order approvals, receipts, and 3-way matching controls.
            </CardDescription>
          </div>

          {/* Tabbed Filter */}
          <div className="flex flex-wrap gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 text-xs">
            {["ALL", "DRAFT", "APPROVED", "SENT", "RECEIVED"].map((tab) => (
              <Button
                key={tab}
                variant={selectedStatusTab === tab ? "default" : "ghost"}
                size="sm"
                className="rounded-lg h-8 text-xs font-semibold px-3"
                onClick={() => setSelectedStatusTab(tab)}
              >
                {tab === "ALL" ? "All Orders" : tab}
              </Button>
            ))}
          </div>
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
              data={filteredPOs}
              actions={poActions}
              onRowClick={(row) => navigate(`/purchasing/${row.id}`)}
              searchPlaceholder="Search POs by ID, supplier..."
              pageSize={15}
              emptyMessage="No purchase orders found matching selected filter."
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

