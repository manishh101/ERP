import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  Mail,
  MapPin,
  Phone,
  Plus,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSupplierQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import { CreateSupplierForm } from "@/components/purchasing/create-supplier-form";
import { CreatePurchaseOrderForm } from "@/components/purchasing/create-po-form";

const purchaseOrderColumns: ColumnDef<any, unknown>[] = [
  { accessorKey: "id", header: "PO Number" },
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
      const amount = toNumber(order.totalAmount);
      return (
        <div className="text-right font-medium tabular-nums w-full block">
          {formatCurrency(amount)}
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
            <Link to={`/purchasing/${row.getValue("id")}`}>View</Link>
          </Button>
        </div>
      );
    },
  },
];

export function SupplierProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { data: supplier, error, isLoading } = useSupplierQuery(id!);
  const [isEditing, setIsEditing] = useState(false);
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);

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
            Failed to load supplier profile.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!supplier) return null;

  const orders = supplier.purchaseOrders || [];
  const lifetimeValue = orders.reduce(
    (sum: number, o: any) => sum + toNumber(o.totalAmount),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link to="/suppliers">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <PageHeader title={supplier.name} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="default"
            className="gap-2"
            onClick={() => setIsNewPoOpen(true)}
          >
            <Plus className="h-4 w-4" />
            New PO
          </Button>
        </div>
      </div>



      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              General Details
            </CardTitle>
            <CardDescription>
              Contact information and location.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Location (Country)
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {supplier.country}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {supplier.email || "N/A"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {supplier.phone || "N/A"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lead Time
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                {supplier.leadTimeDays} days
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Overview
            </CardTitle>
            <CardDescription>Purchasing summary.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lifetime Spend
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-primary">
                {formatCurrency(lifetimeValue)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Orders
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight">
                {orders.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Purchase Orders</CardTitle>
          <CardDescription>
            The active transaction history for this supplier.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={purchaseOrderColumns}
            data={orders}
            pageSize={10}
            searchPlaceholder="Search POs..."
            emptyMessage="No purchase orders found for this supplier."
          />
        </CardContent>
      </Card>

      <Sheet open={isNewPoOpen} onOpenChange={setIsNewPoOpen}>
        <SheetContent className="sm:max-w-[90vw] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Create Purchase Order</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <CreatePurchaseOrderForm onClose={() => setIsNewPoOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
