import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeliveriesQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { ScheduleDeliveryForm } from "@/components/delivery/schedule-delivery-form";

export function DeliveryPage() {
  const { data, error, isLoading } = useDeliveriesQuery();
  const [scheduleDeliveryOpen, setScheduleDeliveryOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Deliveries could not be loaded.</p>
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
        eyebrow="Module 7"
        title="Delivery & Logistics"
        description="Schedule dispatches, assign drivers and vehicles, manage failed attempts, capture proof of delivery, and issue daily manifests."
        actions={[
          {
            label: scheduleDeliveryOpen ? "Close Form" : "Schedule Delivery",
            onClick: () => setScheduleDeliveryOpen(c => !c)
          }
        ]}
      />

      {scheduleDeliveryOpen ? <ScheduleDeliveryForm onClose={() => setScheduleDeliveryOpen(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Delivery Scheduler</CardTitle>
              <CardDescription>Orders ready for dispatch, grouped with driver and route information.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              rows={data.items}
              detailHref={() => "/delivery"}
              columns={[
                { key: "id", header: "Delivery" },
                { key: "customer", header: "Customer" },
                { key: "driver", header: "Driver" },
                { key: "status", header: "Status", render: (row) => <StatusBadge value={row.status} /> },
                { key: "scheduledDate", header: "Scheduled", render: (row) => formatDate(row.scheduledDate) },
                { key: "route", header: "Route" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Manifest & Performance</CardTitle>
              <CardDescription>Printable daily route manifest and driver performance metrics.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["On-time rate", "93% this month"],
              ["Failed attempts", "4 deliveries"],
              ["Average lead time", "3.8 days from order to delivery"],
              ["Proof of delivery", "Notes + photo URL supported"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">{label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
