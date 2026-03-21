import { useState } from "react";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { useToast } from "@/components/layout/toast-provider";
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

export function SalesPage() {
  const { data, error, isLoading } = useSalesOrdersQuery();
  const { data: customersData, isLoading: customersLoading } = useCustomersQuery();
  const { mutate: cancelOrder, isPending: isCancelling } = useCancelSalesOrderMutation();
  const { push } = useToast();
  
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
        eyebrow="Module 4"
        title="Sales & CRM"
        description="Move furniture quotes into confirmed orders, capture deposits, manage customer credit exposure, and monitor delivery readiness."
        actions={[
          {
            label: createCustomerOpen ? "Close Customer Form" : "New Customer",
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

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
            <div>
              <CardTitle>Order Pipeline</CardTitle>
              <CardDescription>Quote → Confirmed → Deposit Paid → In Warehouse → Out for Delivery → Delivered.</CardDescription>
            </div>
            {selectedOrderId && (
              <div className="flex gap-2">
                {selectedOrder?.rawStatus === "QUOTE" && (
                  <Button 
                    variant="default" 
                    onClick={() => {
                      confirmOrder(selectedOrderId, {
                        onSuccess: () => push("Order confirmed", "The quote has been successfully converted to a confirmed order."),
                        onError: (error) => push("Confirmation failed", getErrorMessage(error))
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
                    onClick={() => setDepositModalOpen(true)}
                  >
                    Record Deposit
                  </Button>
                )}
                {selectedOrder?.rawStatus === "DEPOSIT_PAID" && (
                  <Button 
                    variant="default" 
                    onClick={() => {
                      updateStatus({ id: selectedOrderId, status: "IN_WAREHOUSE" }, {
                        onSuccess: () => push("Order updated", "The order has been moved to the warehouse status."),
                        onError: (error) => push("Update failed", getErrorMessage(error))
                      });
                    }}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating..." : "Move to Warehouse"}
                  </Button>
                )}
                <Button 
                  variant="outline" 
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
              rows={data.items}
              detailHref={() => "/sales"}
              selectedId={selectedOrderId}
              onSelectRow={setSelectedOrderId}
              columns={[
                { key: "id", header: "Order" },
                { key: "customer", header: "Customer" },
                { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
                { key: "deliveryDate", header: "Delivery", render: (row) => formatDate(row.deliveryDate) },
                { key: "balanceDue", header: "Balance Due", className: "text-right", render: (row) => formatCurrency(row.balanceDue) },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Customer Credit & Statements</CardTitle>
              <CardDescription>Trade and contractor balances, credit limits, AR aging, and statement generation.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[400px] overflow-y-auto space-y-4">
              {customersData?.items?.map((customer) => (
                <div key={customer.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{customer.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {customer.type} · Credit Limit: {formatCurrency(toNumber(customer.creditLimit))}
                        {customer.panNo && ` · PAN: ${customer.panNo}`}
                        {customer.vatNo && ` · VAT: ${customer.vatNo}`}
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setLedgerCustomer({ id: customer.id, name: customer.name })}
                    >
                      View Ledger
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel Sales Order"
        description="Are you sure you want to cancel this order? This action will reverse any stock reservations if the order was already confirmed."
        confirmLabel="Cancel Order"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          if (selectedOrderId) {
            cancelOrder(selectedOrderId, {
              onSuccess: () => {
                setConfirmOpen(false);
                setSelectedOrderId(undefined);
                push("Order cancelled", "The sales order has been successfully cancelled and stock released.");
              },
              onError: (error) => {
                push("Cancellation failed", getErrorMessage(error));
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
