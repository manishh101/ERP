import { useState } from "react";
import { toast } from "sonner";
import { useParams, Link, useNavigate } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Edit,
  FileText,
  Plus,
  Banknote,
  Trash2,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { PartyKpiCards } from "@/components/sales/party-kpi-cards";
import { KhataAnalyticsTable } from "@/components/sales/khata-analytics-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCustomerQuery,
  useCustomerLedgerQuery,
  useDeleteCustomerMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { CreateSalesOrderForm } from "@/components/sales/create-sales-order-form";
import { CustomerLedgerModal } from "@/components/sales/customer-ledger-modal";
import { RecordDepositModal } from "@/components/sales/record-deposit-modal";

const salesOrderColumns: ColumnDef<any, unknown>[] = [
  { accessorKey: "id", header: "Order ID" },
  {
    accessorKey: "orderDate",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("orderDate")),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
  },
  {
    id: "total",
    header: () => <div className="text-right w-full">Total</div>,
    cell: ({ row }) => {
      const order = row.original;
      const amount = toNumber(order.orderAmount || order.grandTotal || order.total);
      return (
        <div className="text-right font-medium tabular-nums w-full block">
          {formatCurrency(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "balanceDue",
    header: () => (
      <div className="text-right text-muted-foreground whitespace-nowrap w-full">
        Balance Due
      </div>
    ),
    cell: ({ row }) => {
      const balance = toNumber(row.getValue("balanceDue"));
      return (
        <div
          className={`text-right tabular-nums ${balance > 0 ? "font-bold text-amber-700" : "font-medium text-muted-foreground"}`}
        >
          {formatCurrency(balance)}
        </div>
      );
    },
  },
  {
    accessorKey: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/sales/${row.getValue("id")}`}>View</Link>
          </Button>
        </div>
      );
    },
  },
];

export function PartyProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, error, isLoading } = useCustomerQuery(id!);
  const { data: ledgerData } = useCustomerLedgerQuery(id!);
  const deleteMutation = useDeleteCustomerMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id!);
      toast.success("Profile deleted successfully");
      navigate("/parties");
    } catch (err) {
      toast.error("Failed to delete profile", {
        description: getErrorMessage(err),
      });
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold text-destructive">
            Failed to load party profile.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!customer) return null;

  const outBalance = toNumber(customer.outstandingBalance || 0);
  const creditLimit = toNumber(customer.creditLimit || 0);
  const creditUsedPct = creditLimit > 0 ? (outBalance / creditLimit) * 100 : 0;

  // Compute lifetime volume/value from sales orders
  const orders = customer.salesOrders || [];
  const lifetimeQty = orders.reduce((sum: number, o: any) => {
    const lineItems = o.lineItems ?? [];
    return sum + lineItems.reduce((qs: number, li: any) => qs + toNumber(li.quantity), 0);
  }, 0);
  const lifetimeValue = orders.reduce(
    (sum: number, o: any) => sum + toNumber(o.grandTotal || o.orderAmount),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header with navigation and action buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link to="/parties">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader title={customer.name} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={() => setIsNewOrderOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New Order
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsPaymentOpen(true)}
          >
            <Banknote className="h-4 w-4" />
            Record Payment
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsLedgerOpen(true)}
          >
            <FileText className="h-4 w-4" />
            View Full Ledger
          </Button>
          <Button
            variant="ghost"
            className="gap-2"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="h-4 w-4" />
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:bg-destructive/10"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete Profile
          </Button>
        </div>
      </div>

      {/* Edit Form (inline) */}
      {isEditing && (
        <CreateCustomerForm
          onClose={() => setIsEditing(false)}
          initialData={customer}
        />
      )}

      {/* ═══════════════════════════════════════════════════════
          LIFETIME KPI CARDS
          ═══════════════════════════════════════════════════════ */}
      <PartyKpiCards
        lifetimeQty={lifetimeQty}
        lifetimeValue={lifetimeValue}
        currentArBalance={outBalance}
      />

      {/* ═══════════════════════════════════════════════════════
          PROFILE + FINANCIALS
          ═══════════════════════════════════════════════════════ */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              General Details
            </CardTitle>
            <CardDescription>
              Contact information and categorization.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Type
              </p>
              <p className="mt-1 font-medium capitalize">
                {customer.type.toLowerCase()}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Location (Address)
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {customer.address}
                {customer.district && `, ${customer.district}`}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {customer.email || "N/A"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {customer.phone || "N/A"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                PAN/VAT No
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                {customer.vatNo || customer.panNo || "Unregistered"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Invoice Preference
              </p>
              <p className="mt-1 font-medium">{customer.invoicePref}</p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Financials
            </CardTitle>
            <CardDescription>Ledger summary &amp; bounds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Outstanding Balance
              </p>
              <p
                className={`mt-1 text-3xl font-bold tracking-tight ${outBalance > 0 ? "text-amber-700" : "text-green-700"}`}
              >
                {formatCurrency(outBalance)}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-muted-foreground">
                  Credit Utilization
                </span>
                <span className="font-bold">{creditUsedPct.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full ${creditUsedPct > 80 ? "bg-red-500" : creditUsedPct > 50 ? "bg-amber-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min(creditUsedPct, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Limit: {formatCurrency(creditLimit)}</span>
                {creditLimit - outBalance > 0 && (
                  <span>
                    Available: {formatCurrency(creditLimit - outBalance)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════
          KHATA ANALYTICS (Month-by-Month)
          ═══════════════════════════════════════════════════════ */}
      <KhataAnalyticsTable
        ledgerEntries={ledgerData ?? []}
        salesOrders={orders}
      />

      {/* ═══════════════════════════════════════════════════════
          RECENT ORDERS PIPELINE
          ═══════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders Pipeline</CardTitle>
          <CardDescription>
            The active transaction history for this party.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={salesOrderColumns}
            data={orders}
            pageSize={10}
            searchPlaceholder="Search orders..."
            emptyMessage="No sales orders found for this party."
          />
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════
          MODALS & SHEETS
          ═══════════════════════════════════════════════════════ */}

      {/* Ledger Sheet */}
      {isLedgerOpen && (
        <CustomerLedgerModal
          customerId={customer.id}
          customerName={customer.name}
          onClose={() => setIsLedgerOpen(false)}
        />
      )}

      {/* New Order Sheet */}
      <Sheet open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <SheetContent className="sm:max-w-[90vw] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Create Sales Order</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <CreateSalesOrderForm onClose={() => setIsNewOrderOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {isPaymentOpen && orders.length > 0 && (
        <RecordDepositModal
          orderId={orders[0]?.id ?? ""}
          orderNumber={orders[0]?.id ?? ""}
          onClose={() => setIsPaymentOpen(false)}
        />
      )}

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Party Profile</DialogTitle>
            <CardDescription>
              Are you sure you want to delete **{customer.name}**? This action
              cannot be undone. You can only delete parties with no existing
              sales orders.
            </CardDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
