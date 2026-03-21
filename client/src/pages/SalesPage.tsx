import { useState } from "react";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { useToast } from "@/components/layout/toast-provider";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSalesOrdersQuery, useCustomersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/utils";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { CreateSalesOrderForm } from "@/components/sales/create-sales-order-form";
import { CustomerLedgerModal } from "@/components/sales/customer-ledger-modal";

export function SalesPage() {
  const { data, error, isLoading } = useSalesOrdersQuery();
  const { data: customersData, isLoading: customersLoading } = useCustomersQuery();
  const { push } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createSalesOrderOpen, setCreateSalesOrderOpen] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<{ id: string; name: string } | null>(null);

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
          <CardHeader>
            <div>
              <CardTitle>Order Pipeline</CardTitle>
              <CardDescription>Quote → Confirmed → Deposit Paid → In Warehouse → Out for Delivery → Delivered.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={data.items}
              detailHref={() => "/sales"}
              columns={[
                { key: "id", header: "Order" },
                { key: "customer", header: "Customer" },
                { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
                { key: "deliveryDate", header: "Delivery" },
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
            <div className="flex gap-3">
              <Button variant="destructive" className="w-full" onClick={() => setConfirmOpen(true)}>
                Cancel Selected Order
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel Sales Order"
        description="This keeps the confirmation modal pattern in place before destructive actions like order cancellation."
        confirmLabel="Cancel Order"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          push("Order cancelled", "A cancellation endpoint can now be wired to this confirmation flow.");
        }}
      />

      {ledgerCustomer && (
        <CustomerLedgerModal
          customerId={ledgerCustomer.id}
          customerName={ledgerCustomer.name}
          onClose={() => setLedgerCustomer(null)}
        />
      )}
    </div>
  );
}
