import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { toast } from "sonner";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesOrdersQuery, useCustomersQuery, useCancelSalesOrderMutation, useConfirmSalesOrderMutation, useRecordSalesOrderDepositMutation, useUpdateSalesOrderStatusMutation } from "@/hooks/use-queries";
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
  const { data: customersData, isLoading: customersLoading } = useCustomersQuery();
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelSalesOrderMutation();
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createSalesOrderOpen, setCreateSalesOrderOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<{ id: string; name: string } | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(undefined);

  const { mutate: confirmOrder, isPending: isConfirming } = useConfirmSalesOrderMutation();
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateSalesOrderStatusMutation();
  const selectedOrder = data?.items.find((o) => o.id === selectedOrderId);

  if (isLoading || customersLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Sales orders could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        actions={[
          {
            label: createCustomerOpen ? "Close Party Form" : "New Party",
            variant: "outline",
            onClick: () => {
              setCreateCustomerOpen((c) => !c);
              setCreateSalesOrderOpen(false);
            },
          },
          {
            label: createSalesOrderOpen ? "Close Order Form" : "New Order / Quote",
            onClick: () => {
              setCreateSalesOrderOpen((c) => !c);
              setCreateCustomerOpen(false);
            },
          },
        ]}
      />

      {createCustomerOpen ? <CreateCustomerForm onClose={() => setCreateCustomerOpen(false)} /> : null}
      {createSalesOrderOpen ? <CreateSalesOrderForm onClose={() => setCreateSalesOrderOpen(false)} /> : null}

      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
            <div>
              <CardTitle>Order Pipeline</CardTitle>
              <CardDescription>Track orders from quote to delivery.</CardDescription>
            </div>
            {selectedOrderId && (
              <div className="flex gap-2">
                {selectedOrder?.rawStatus === "QUOTE" && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => {
                      confirmOrder(selectedOrderId, {
                        onSuccess: () => toast.success("Order confirmed"),
                        onError: (error) => toast.error("Confirmation failed", { description: getErrorMessage(error) })
                      });
                    }}
                    disabled={isConfirming}
                  >
                    {isConfirming ? "Confirming..." : "Confirm Order"}
                  </Button>
                )}
                {selectedOrder?.rawStatus === "CONFIRMED" && (
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={() => setDepositModalOpen(true)}
                  >
                    Record Deposit
                  </Button>
                )}
                {selectedOrder?.rawStatus === "DEPOSIT_PAID" && (
                  <Button 
                    variant="default"
                    size="sm"
                    onClick={() => {
                      updateStatus({ id: selectedOrderId, status: "IN_WAREHOUSE" }, {
                        onSuccess: () => toast.success("Moved to warehouse"),
                        onError: (error) => toast.error("Update failed", { description: getErrorMessage(error) })
                      });
                    }}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating..." : "Move to Warehouse"}
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-white border-destructive/30"
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
              data={data.items}
              columns={orderColumns}
              detailHref={(row) => `/sales/${row.id}`}
              onRowClick={(row) => setSelectedOrderId(selectedOrderId === row.id ? undefined : row.id)}
              searchPlaceholder="Search orders..."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Parties & Khata</CardTitle>
              <CardDescription>Balances, credit limits, and statements.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[400px] overflow-y-auto space-y-3">
              {customersData?.items?.map((customer) => (
                <div key={customer.id} className="flex items-center justify-between rounded-lg border bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{customer.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {customer.type} · Credit: {formatCurrency(toNumber(customer.creditLimit))}
                      {customer.panNo && ` · PAN: ${customer.panNo}`}
                    </p>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setLedgerCustomer({ id: customer.id, name: customer.name })}
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
                toast.error("Cancellation failed", { description: getErrorMessage(error) });
              }
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
    </div>
  );
}
