import { useParams, Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Receipt,
} from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCustomerQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

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
    accessorKey: "grandTotal",
    header: () => <div className="text-right">Total</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {formatCurrency(toNumber(row.getValue("grandTotal")))}
      </div>
    ),
  },
  {
    accessorKey: "balanceDue",
    header: () => (
      <div className="text-right text-muted-foreground whitespace-nowrap">
        Balance Due
      </div>
    ),
    cell: ({ row }) => {
      const balance = toNumber(row.getValue("balanceDue"));
      return (
        <div
          className={`text-right tabular-nums ${balance > 0 ? "font-bold text-amber-600" : "font-medium text-muted-foreground"}`}
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
  const { data: customer, error, isLoading } = useCustomerQuery(id!);

  if (isLoading) {
    return <Skeleton className="h-[500px]" />;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" className="h-8 w-8" asChild>
          <Link to="/parties">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader title={customer.name} />
      </div>

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
            <CardDescription>Ledger summary & bounds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Outstanding Balance
              </p>
              <p
                className={`mt-1 text-3xl font-bold tracking-tight ${outBalance > 0 ? "text-amber-600" : "text-green-600"}`}
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

      <div className="grid gap-6">
        {/* Sales Orders Sub-Table */}
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
              data={customer.salesOrders || []}
              pageSize={10}
              searchKey="id"
              emptyMessage="No sales orders found for this party."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
