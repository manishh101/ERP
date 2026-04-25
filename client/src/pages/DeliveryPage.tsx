import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveriesQuery, useCancelDeliveryMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { ScheduleDeliveryForm } from "@/components/delivery/schedule-delivery-form";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { DeliveryRow } from "@/types/domain";

const deliveryColumns: ColumnDef<DeliveryRow, unknown>[] = [
  { accessorKey: "id", header: "Challan" },
  { accessorKey: "customer", header: "Party" },
  { accessorKey: "driver", header: "Driver" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
  },
  {
    accessorKey: "scheduledDate",
    header: "Scheduled",
    cell: ({ row }) => formatDate(row.getValue("scheduledDate")),
  },
  { accessorKey: "route", header: "Route" },
];

export function DeliveryPage() {
  const { data, error, isLoading } = useDeliveriesQuery();
  const { mutate: cancelDelivery, isPending: isCancelling } = useCancelDeliveryMutation();
  const [scheduleDeliveryOpen, setScheduleDeliveryOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Challans could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const handleCancelDelivery = () => {
    if (!selectedDeliveryId) return;

    cancelDelivery(selectedDeliveryId, {
      onSuccess: () => {
        toast.success("Challan cancelled");
        setSelectedDeliveryId(undefined);
        setConfirmOpen(false);
      },
      onError: (err) => {
        toast.error("Cancellation failed", { description: getErrorMessage(err) });
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challans"
        actions={[
          {
            label: scheduleDeliveryOpen ? "Close Form" : "Schedule Delivery",
            onClick: () => setScheduleDeliveryOpen(c => !c)
          }
        ]}
      />

      {scheduleDeliveryOpen ? <ScheduleDeliveryForm onClose={() => setScheduleDeliveryOpen(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0">
              <div>
                <CardTitle>Dispatch Scheduler</CardTitle>
                <CardDescription>Orders ready for dispatch.</CardDescription>
              </div>
              {selectedDeliveryId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-white border-destructive/30"
                  onClick={() => setConfirmOpen(true)}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling..." : "Cancel Challan"}
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable
                data={data.items}
                columns={deliveryColumns}
                onRowClick={(row) => setSelectedDeliveryId(
                  selectedDeliveryId === row.id ? undefined : row.id
                )}
                searchPlaceholder="Search challans..."
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Manifest & Performance</CardTitle>
              <CardDescription>Driver performance metrics.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["On-time rate", "93% this month"],
              ["Failed attempts", "4 deliveries"],
              ["Average lead time", "3.8 days"],
              ["Proof of delivery", "Notes + photo supported"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel Challan?"
        description="The order will be returned to the warehouse."
        confirmLabel="Cancel Challan"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCancelDelivery}
      />
    </div>
  );
}
