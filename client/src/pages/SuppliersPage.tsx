import { useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSuppliersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { SupplierRow } from "@/types/domain";
import { CreateSupplierForm } from "@/components/purchasing/create-supplier-form";
import { Eye, ShoppingCart } from "lucide-react";

const supplierColumns: ColumnDef<SupplierRow>[] = [
  {
    accessorKey: "name",
    header: "Supplier / Business Name",
    cell: ({ row }) => (
      <div>
        <Link
          to={`/suppliers/${row.original.id}`}
          className="font-semibold text-primary hover:underline block"
        >
          {row.getValue("name")}
        </Link>
        {row.original.panNo && (
          <span className="text-xs text-muted-foreground font-mono">
            PAN: {row.original.panNo}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "contact",
    header: "Contact Person & Info",
    cell: ({ row }) => (
      <div className="text-xs space-y-0.5">
        <div className="font-medium text-foreground">{row.original.contact || row.original.name}</div>
        {row.original.phone && (
          <div className="text-muted-foreground">{row.original.phone}</div>
        )}
        {row.original.email && (
          <div className="text-muted-foreground/80 truncate max-w-[160px]">{row.original.email}</div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "address",
    header: "Location / Country",
    cell: ({ row }) => (
      <div className="text-xs space-y-0.5">
        <div className="font-medium text-foreground">{row.original.address || "—"}</div>
        <div className="text-muted-foreground">{row.original.country}</div>
      </div>
    ),
  },
  { accessorKey: "leadTime", header: "Lead Time" },
  {
    accessorKey: "onTimeRate",
    header: "On-time Rate",
    cell: ({ row }) => (
      <span className="font-semibold text-emerald-600">
        {row.getValue("onTimeRate")}
      </span>
    ),
  },
  {
    accessorKey: "spend",
    header: () => <div className="text-right">Spend</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums font-medium">
        {formatCurrency(row.getValue("spend") as number)}
      </div>
    ),
  },
];

export function SuppliersPage() {
  const { data, error, isLoading } = useSuppliersQuery();
  const [createSupplierOpen, setCreateSupplierOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Suppliers could not be loaded.</p>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        actions={[
          {
            label: "New Supplier",
            onClick: () => setCreateSupplierOpen(true),
          },
        ]}
      />

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={supplierColumns}
            data={data.items}
            pageSize={15}
            searchPlaceholder="Search suppliers..."
            actions={(row) => [
              {
                label: "View Profile",
                icon: <Eye className="h-4 w-4" />,
                href: () => `/suppliers/${row.id}`,
              },
              {
                label: "New PO",
                icon: <ShoppingCart className="h-4 w-4" />,
                href: () => `/purchasing`,
              },
            ]}
          />
        </CardContent>
      </Card>

      {/* New Supplier Sheet */}
      <Sheet open={createSupplierOpen} onOpenChange={setCreateSupplierOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Supplier</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <CreateSupplierForm onClose={() => setCreateSupplierOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
