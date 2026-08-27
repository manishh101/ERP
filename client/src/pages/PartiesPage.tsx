import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCustomersQuery, type RawCustomer } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, toNumber } from "@/lib/utils";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { CustomerLedgerModal } from "@/components/sales/customer-ledger-modal";
import { Eye, FileText, ShoppingCart } from "lucide-react";

const partyColumns: ColumnDef<RawCustomer, unknown>[] = [
  {
    accessorKey: "name",
    header: "Party Name",
    cell: ({ row }) => (
      <Link
        to={`/parties/${row.original.id}`}
        className="font-semibold text-primary hover:underline"
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => (
      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold capitalize text-secondary-foreground">
        {String(row.getValue("type")).toLowerCase()}
      </span>
    ),
  },
  {
    accessorKey: "contact",
    header: "Contact",
    cell: ({ row }) => {
      const email = row.original.email;
      const phone = row.original.phone;
      return (
        <div className="text-sm">
          {phone && <div>{phone}</div>}
          {email && <div className="text-muted-foreground">{email}</div>}
        </div>
      );
    },
  },
  {
    accessorKey: "outstandingBalance",
    header: () => <div className="text-right">Outstanding</div>,
    cell: ({ row }) => {
      const balance = toNumber((row.original as any).outstandingBalance || 0);
      return (
        <div className={`text-right font-medium tabular-nums ${balance > 0 ? "text-amber-700" : "text-green-700"}`}>
          {formatCurrency(balance)}
        </div>
      );
    },
  },
  {
    accessorKey: "creditLimit",
    header: () => <div className="text-right">Credit Limit</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatCurrency(toNumber(row.getValue("creditLimit") || 0))}
      </div>
    ),
  },
  { accessorKey: "address", header: "Location" },
];

export function PartiesPage() {
  const { data, error, isLoading } = useCustomersQuery();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  // Auto-open the create sheet when navigated here from the Ctrl+K "New Customer" command.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateCustomerOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [ledgerCustomer, setLedgerCustomer] = useState<{ id: string; name: string } | null>(null);
  const [typeFilter, setTypeFilter] = useState<"ALL" | "SHOWROOM" | "RETAIL">(
    "ALL",
  );

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Parties could not be loaded.</p>
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
    return item.type === typeFilter;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Showrooms & Parties"
        actions={[
          {
            label: "New Party",
            onClick: () => setCreateCustomerOpen(true),
          },
        ]}
      />

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
            {t === "ALL" ? "All Parties" : t}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={partyColumns}
            data={filteredItems}
            hidePagination={true}
            searchPlaceholder="Search parties..."
            actions={(row) => [
              {
                label: "View Profile",
                icon: <Eye className="h-4 w-4" />,
                href: () => `/parties/${row.id}`,
              },
              {
                label: "View Khata",
                icon: <FileText className="h-4 w-4" />,
                onClick: () => setLedgerCustomer({ id: row.id, name: row.name }),
              },
              {
                label: "New Order",
                icon: <ShoppingCart className="h-4 w-4" />,
                href: () => `/sales`,
              },
            ]}
          />
        </CardContent>
      </Card>

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

      {/* Ledger Sheet */}
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
