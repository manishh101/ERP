import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useSalesOrdersQuery,
  useCustomersQuery,
  useCancelSalesOrderMutation,
  useConfirmSalesOrderMutation,
  useUpdateSalesOrderStatusMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { CreateSalesOrderForm } from "@/components/sales/create-sales-order-form";
import { CustomerLedgerModal } from "@/components/sales/customer-ledger-modal";
import { RecordDepositModal } from "@/components/sales/record-deposit-modal";
import { YearMonthFilter } from "@/components/shared/year-month-filter";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import type { SalesOrderRow } from "@/types/domain";

const orderColumns: ColumnDef<SalesOrderRow, unknown>[] = [
  { accessorKey: "id", header: "Order" },
  { accessorKey: "customer", header: "Party" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
  },
  {
    accessorKey: "deliveryDate",
    header: "Delivery",
    cell: ({ row }) => formatDate(row.getValue("deliveryDate")),
  },
  {
    accessorKey: "balanceDue",
    header: () => <div className="text-right">Balance Due</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatCurrency(row.getValue("balanceDue") as number)}
      </div>
    ),
  },
];

export function SalesPage() {
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const { data, error, isLoading } = useSalesOrdersQuery(500, filterYear, filterMonth);
  const { data: customersData, isLoading: customersLoading } =
    useCustomersQuery();
  const { mutate: cancelOrder, isPending: isCancelling } =
    useCancelSalesOrderMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createSalesOrderOpen, setCreateSalesOrderOpen] = useState(false);
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverDate, setDeliverDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [ledgerCustomer, setLedgerCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(
    undefined,
  );
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SHOWROOM" | "RETAIL">(
    "ALL",
  );

  const { mutate: confirmOrder, isPending: isConfirming } =
    useConfirmSalesOrderMutation();
  const { mutate: updateStatus, isPending: isUpdating } =
    useUpdateSalesOrderStatusMutation();
  const [statusTab, setStatusTab] = useState<string>("ALL");

  const selectedOrder = data?.items.find((o) => o.id === selectedOrderId);

  if (isLoading || customersLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Sales orders could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const allItems = data.items;

  // KPI Calculations
  const totalSalesValue = allItems.reduce(
    (sum, item) => sum + (item.rawStatus !== "CANCELLED" ? toNumber(item.total) : 0),
    0
  );

  const pendingDispatchCount = allItems.filter(
    (item) => item.rawStatus === "CONFIRMED" || item.rawStatus === "IN_WAREHOUSE"
  ).length;

  const totalOutstandingBalance = allItems.reduce(
    (sum, item) => sum + (item.rawStatus !== "CANCELLED" ? toNumber(item.balanceDue) : 0),
    0
  );

  // Tab Filtering
  const filteredItems = allItems.filter((item) => {
    // 1. Customer Type filter
    if (typeFilter !== "ALL" && item.customerType !== typeFilter) return false;
    // 2. Status Tab filter
    if (statusTab === "ALL") return true;
    if (statusTab === "DRAFT") return item.rawStatus === "DRAFT" || item.rawStatus === "QUOTE";
    if (statusTab === "CONFIRMED") return item.rawStatus === "CONFIRMED" || item.rawStatus === "IN_WAREHOUSE";
    if (statusTab === "DISPATCHED") return item.rawStatus === "DISPATCHED" || item.rawStatus === "OUT_FOR_DELIVERY";
    return item.rawStatus === statusTab;
  });

  const STATUS_TABS = [
    { id: "ALL", label: "All Orders", count: allItems.length },
    { id: "DRAFT", label: "Drafts / Quotes", count: allItems.filter(i => i.rawStatus === "DRAFT" || i.rawStatus === "QUOTE").length },
    { id: "CONFIRMED", label: "Confirmed", count: allItems.filter(i => i.rawStatus === "CONFIRMED" || i.rawStatus === "IN_WAREHOUSE").length },
    { id: "DISPATCHED", label: "Dispatched", count: allItems.filter(i => i.rawStatus === "DISPATCHED" || i.rawStatus === "OUT_FOR_DELIVERY").length },
    { id: "DELIVERED", label: "Delivered", count: allItems.filter(i => i.rawStatus === "DELIVERED").length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        actions={[
          {
            label: "New Party",
            variant: "outline",
            onClick: () => {
              setCreateCustomerOpen(true);
              setCreateSalesOrderOpen(false);
            },
          },
          {
            label: "New Order / Quote",
            onClick: () => {
              setCreateSalesOrderOpen(true);
              setCreateCustomerOpen(false);
            },
          },
        ]}
      />

      {/* Sales KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Order Portfolio
            </p>
            <p className="text-2xl font-bold font-mono text-foreground mt-1">
              {formatCurrency(totalSalesValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Gross value of active sales orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Dispatch
            </p>
            <p className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1">
              {pendingDispatchCount} <span className="text-sm font-normal text-muted-foreground">Orders</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Confirmed & warehouse-ready orders
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Uncollected AR Balance
            </p>
            <p className="text-2xl font-bold font-mono text-destructive mt-1">
              {formatCurrency(totalOutstandingBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Remaining receivables balance due
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {STATUS_TABS.map((tab) => (
              <Button
                key={tab.id}
                variant={statusTab === tab.id ? "default" : "ghost"}
                size="sm"
                className="rounded-xl text-xs font-semibold h-8 px-3"
                onClick={() => setStatusTab(tab.id)}
              >
                {tab.label}
                <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.2 text-[10px]">
                  {tab.count}
                </span>
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-0.5 w-fit">
              {(["ALL", "SHOWROOM", "RETAIL"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    typeFilter === t
                      ? "bg-white text-foreground shadow-sm dark:bg-zinc-800"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "ALL"
                    ? "All Parties"
                    : t === "SHOWROOM"
                      ? "Showroom"
                      : "Retail"}
                </button>
              ))}
            </div>

            <YearMonthFilter
              year={filterYear}
              month={filterMonth}
              onYearChange={(y) => { setFilterYear(y); setFilterMonth(""); }}
              onMonthChange={setFilterMonth}
            />
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
            <div>
              <CardTitle>Order Pipeline</CardTitle>
              <CardDescription>
                Track orders from quote to delivery.
              </CardDescription>
            </div>
            {selectedOrderId && (
              <div className="flex flex-wrap gap-2">
                {(selectedOrder?.rawStatus === "QUOTE" || selectedOrder?.rawStatus === "DRAFT") && (
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    onClick={() => {
                      confirmOrder(selectedOrderId, {
                        onSuccess: () => toast.success("Order confirmed and stock allocated"),
                        onError: (error) =>
                          toast.error("Confirmation failed", {
                            description: getErrorMessage(error),
                          }),
                      });
                    }}
                    disabled={isConfirming}
                  >
                    {isConfirming ? "Confirming..." : "Confirm Order"}
                  </Button>
                )}

                {selectedOrder?.rawStatus !== "QUOTE" &&
                  selectedOrder?.rawStatus !== "DRAFT" &&
                  selectedOrder?.rawStatus !== "CANCELLED" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-primary/50 text-primary hover:bg-primary hover:text-white"
                        onClick={() => setDepositModalOpen(true)}
                      >
                        Record Deposit
                      </Button>

                      {(selectedOrder?.rawStatus === "DISPATCHED" || selectedOrder?.rawStatus === "OUT_FOR_DELIVERY") && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setDeliverDate(new Date().toISOString().split("T")[0]);
                            setDeliverModalOpen(true);
                          }}
                          disabled={isUpdating}
                        >
                          <span className="flex items-center gap-2">
                            {isUpdating ? "Updating..." : "Mark Delivered"}
                          </span>
                        </Button>
                      )}
                    </>
                  )}

                {selectedOrder?.rawStatus !== "CANCELLED" && selectedOrder?.rawStatus !== "DELIVERED" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive hover:text-white border-destructive/30 ml-auto"
                    onClick={() => setConfirmOpen(true)}
                    disabled={isCancelling}
                  >
                    {isCancelling ? "Cancelling..." : "Cancel Order"}
                  </Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredItems}
              columns={orderColumns}
              detailHref={(row) => `/sales/${row.id}`}
              onRowClick={(row) =>
                setSelectedOrderId(
                  selectedOrderId === row.id ? undefined : row.id,
                )
              }
              searchPlaceholder="Search orders..."
              pageSize={50}
            />
          </CardContent>
        </Card>


      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel Sales Order"
        description="Are you sure? Stock reservations will be reversed."
        confirmLabel="Cancel Order"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (selectedOrderId) {
            cancelOrder(selectedOrderId, {
              onSuccess: () => {
                setConfirmOpen(false);
                setSelectedOrderId(undefined);
                toast.success("Order cancelled and stock released");
              },
              onError: (error) => {
                toast.error("Cancellation failed", {
                  description: getErrorMessage(error),
                });
              },
            });
          }
        }}
      />

      <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[95vh]">
          <DialogHeader>
            <DialogTitle>Mark Delivered</DialogTitle>
            <DialogDescription>
              Choose the delivery date to record against this order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
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
                if (!selectedOrderId) {
                  return;
                }

                updateStatus(
                  { id: selectedOrderId, status: "DELIVERED", deliveryDate: deliverDate },
                  {
                    onSuccess: () => {
                      setDeliverModalOpen(false);
                      toast.success("Order marked as delivered");
                    },
                    onError: (error) =>
                      toast.error("Update failed", {
                        description: getErrorMessage(error),
                      }),
                  },
                );
              }}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Confirm Delivered"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ledgerCustomer && (
        <CustomerLedgerModal
          customerId={ledgerCustomer.id}
          customerName={ledgerCustomer.name}
          onClose={() => setLedgerCustomer(null)}
        />
      )}

      {depositModalOpen && selectedOrder && (
        <RecordDepositModal
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.id}
          onClose={() => setDepositModalOpen(false)}
        />
      )}

      {/* New Party Sheet */}
      <Sheet open={createCustomerOpen} onOpenChange={setCreateCustomerOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Party</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CreateCustomerForm onClose={() => setCreateCustomerOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* New Order Sheet */}
      <Sheet open={createSalesOrderOpen} onOpenChange={setCreateSalesOrderOpen}>
        <SheetContent className="sm:max-w-[90vw] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Create Sales Order</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <CreateSalesOrderForm onClose={() => setCreateSalesOrderOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
