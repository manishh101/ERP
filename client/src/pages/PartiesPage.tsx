import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomersQuery, type RawCustomer } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { Link } from "react-router-dom";
import { formatCurrency, toNumber } from "@/lib/utils";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { Button } from "@/components/ui/button";

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
    accessorKey: "creditLimit",
    header: () => <div className="text-right">Credit Limit</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatCurrency(toNumber(row.getValue("creditLimit") || 0))}
      </div>
    ),
  },
  { accessorKey: "address", header: "Location" },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/parties/${row.original.id}`}>View Profile</Link>
          </Button>
        </div>
      );
    },
  },
];

export function PartiesPage() {
  const { data, error, isLoading } = useCustomersQuery();
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parties & Showrooms"
        actions={[
          {
            label: createCustomerOpen ? "Close Form" : "New Party",
            variant: createCustomerOpen ? "outline" : "default",
            onClick: () => setCreateCustomerOpen((c) => !c),
          },
        ]}
      />

      {createCustomerOpen && (
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Add New Party</CardTitle>
            <CardDescription>
              Register a new showroom or retail customer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CreateCustomerForm
              onSuccess={() => setCreateCustomerOpen(false)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={partyColumns}
            data={data.items}
            pageSize={15}
            searchKey="name"
          />
        </CardContent>
      </Card>
    </div>
  );
}
