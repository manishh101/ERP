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
  Plus,
  Trash2,
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
import {
  useSupplierQuery,
  useDeleteSupplierMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const navigate = useNavigate();
  const { data: supplier, error, isLoading } = useSupplierQuery(id!);
  const deleteMutation = useDeleteSupplierMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [isNewPoOpen, setIsNewPoOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id!);
      toast.success("Supplier deleted successfully");
      navigate("/suppliers");
    } catch (err) {
      toast.error("Failed to delete supplier", {
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



      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              General Details
            </CardTitle>
            <CardDescription>
              Comprehensive supplier information and commercial profile.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contact Person
              </p>
              <div className="mt-1 font-medium text-foreground">
                {supplier.contact || supplier.name}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                PAN Number
              </p>
              <div className="mt-1 font-mono font-medium text-foreground">
                {supplier.panNo || "N/A"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                VAT Number
              </p>
              <div className="mt-1 font-mono font-medium text-foreground">
                {supplier.vatNo || "N/A"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Phone / Mobile
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {supplier.phone || "N/A"}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Email Address
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium truncate">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{supplier.email || "N/A"}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Location & Country
              </p>
              <div className="mt-1 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{[supplier.address, supplier.country].filter(Boolean).join(", ")}</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Lead Time
              </p>
              <div className="mt-1 font-medium text-foreground">
                {supplier.leadTimeDays} days
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Payment Terms
              </p>
              <div className="mt-1 font-medium text-foreground">
                {supplier.paymentTerms || "Cash/Credit"}
              </div>
            </div>
            {supplier.notes && (
              <div className="sm:col-span-2 lg:col-span-3 border-t pt-3 mt-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Internal Notes
                </p>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">
                  {supplier.notes}
                </p>
              </div>
            )}
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

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Supplier Profile</DialogTitle>
            <CardDescription>
              Are you sure you want to delete **{supplier.name}**? This action
              cannot be undone. You can only delete suppliers with no existing
              purchase orders.
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
