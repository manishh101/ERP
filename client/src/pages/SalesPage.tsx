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
  const { data, error, isLoading } = useSalesOrdersQuery();
  const { data: customersData, isLoading: customersLoading } =
    useCustomersQuery();
  const { mutate: cancelOrder, isPending: isCancelling } =
    useCancelSalesOrderMutation();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createSalesOrderOpen, setCreateSalesOrderOpen] = useState(false);
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

  const filteredItems = data.items.filter((item) => {
    if (typeFilter === "ALL") return true;
    return item.customerType === typeFilter;
  });

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

      <div className="space-y-6">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-0.5 w-fit">
          {(["ALL", "SHOWROOM", "RETAIL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                typeFilter === t
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "ALL"
                ? "All Orders"
                : t === "SHOWROOM"
                  ? "Showroom Orders"
                  : "Retail Orders"}
            </button>
          ))}
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
                {selectedOrder?.rawStatus === "QUOTE" && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => {
                      confirmOrder(selectedOrderId, {
                        onSuccess: () => toast.success("Order confirmed"),
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

                      {selectedOrder?.rawStatus !== "DELIVERED" && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            updateStatus(
                              { id: selectedOrderId, status: "DELIVERED" },
                              {
                                onSuccess: () =>
                                  toast.success("Order marked as delivered"),
                                onError: (error) =>
                                  toast.error("Update failed", {
                                    description: getErrorMessage(error),
                                  }),
                              },
                            );
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

                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-white border-destructive/30 ml-auto"
                  onClick={() => setConfirmOpen(true)}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling..." : "Cancel Order"}
                </Button>
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
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Parties &amp; Khata</CardTitle>
              <CardDescription>
                Balances, credit limits, and statements.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {customersData?.items?.map((customer) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{customer.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer.type} · Credit:{" "}
                      {formatCurrency(toNumber(customer.creditLimit))}
                      {customer.panNo && ` · PAN: ${customer.panNo}`}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setLedgerCustomer({
                        id: customer.id,
                        name: customer.name,
                      })
                    }
                  >
                    View Khata
                  </Button>
                </div>
              ))}
            </div>
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
