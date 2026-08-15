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
import { Printer, Truck, CheckCircle2, Clock, MapPin, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [manifestModalOpen, setManifestModalOpen] = useState(false);

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

  const allDeliveries = data.items;

  // Dispatch KPIs
  const totalChallans = allDeliveries.length;
  const activeDispatchCount = allDeliveries.filter(
    (d) => d.status === "SCHEDULED" || d.status === "OUT_FOR_DELIVERY"
  ).length;
  const completedCount = allDeliveries.filter((d) => d.status === "DELIVERED").length;

  // Filtered Deliveries
  const filteredDeliveries = allDeliveries.filter((d) => {
    if (statusTab === "ALL") return true;
    return d.status === statusTab;
  });

  const STATUS_TABS = [
    { id: "ALL", label: "All Challans", count: totalChallans },
    { id: "SCHEDULED", label: "Scheduled", count: allDeliveries.filter((d) => d.status === "SCHEDULED").length },
    { id: "OUT_FOR_DELIVERY", label: "Out for Delivery", count: allDeliveries.filter((d) => d.status === "OUT_FOR_DELIVERY").length },
    { id: "DELIVERED", label: "Delivered", count: completedCount },
  ];

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
        title="Dispatch & Challans"
        actions={[
          {
            label: "Print Daily Manifest",
            variant: "outline",
            onClick: () => setManifestModalOpen(true),
          },
          {
            label: scheduleDeliveryOpen ? "Close Form" : "Schedule Delivery",
            onClick: () => setScheduleDeliveryOpen((c) => !c),
          },
        ]}
      />

      {/* Dispatch KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Delivery Challans
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {totalChallans} <span className="text-sm font-normal text-muted-foreground">Total</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">All recorded delivery manifests</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Dispatches
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
              {activeDispatchCount} <span className="text-sm font-normal text-muted-foreground">In Transit / Ready</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Scheduled or out for delivery</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Completed Deliveries
            </p>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {completedCount} <span className="text-sm font-normal text-muted-foreground">Delivered</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Successfully fulfilled</p>
          </CardContent>
        </Card>
      </div>

      {scheduleDeliveryOpen ? <ScheduleDeliveryForm onClose={() => setScheduleDeliveryOpen(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-lg">Dispatch Scheduler</CardTitle>
                <CardDescription>Manage active delivery challans & driver assignments.</CardDescription>
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
            <CardContent className="space-y-4">
              {/* Status Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5 border-b pb-3">
                {STATUS_TABS.map((tab) => (
                  <Button
                    key={tab.id}
                    variant={statusTab === tab.id ? "default" : "ghost"}
                    size="sm"
                    className="rounded-xl text-xs font-semibold h-8 px-3"
                    onClick={() => setStatusTab(tab.id)}
                  >
                    {tab.label}
                    <span className="ml-1.5 rounded-full bg-muted-foreground/20 px-1.5 py-0.2 text-[10px]">
                      {tab.count}
                    </span>
                  </Button>
                ))}
              </div>

              <DataTable
                data={filteredDeliveries}
                columns={deliveryColumns}
                onRowClick={(row) =>
                  setSelectedDeliveryId(selectedDeliveryId === row.id ? undefined : row.id)
                }
                searchPlaceholder="Search challans..."
              />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <div>
              <CardTitle className="text-lg">Dispatch Manifest Overview</CardTitle>
              <CardDescription>Fleet & driver operational metrics.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              ["Active Fleet Drivers", "3 Drivers On-Duty"],
              ["On-Time Delivery Rate", "94% this month"],
              ["Avg Transit Lead Time", "3.2 Hours"],
              ["Proof of Delivery", "Driver Signature + Photo Supported"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{label}</p>
                <p className="mt-1 text-sm font-bold text-foreground">{value}</p>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full mt-4 justify-center rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary/5"
              onClick={() => setManifestModalOpen(true)}
            >
              <Printer className="mr-2 h-4 w-4" /> Print Today's Driver Manifest
            </Button>
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

      {/* Print Driver Manifest Modal */}
      <Dialog open={manifestModalOpen} onOpenChange={setManifestModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Daily Dispatch Driver Manifest
              </span>
              <Button size="sm" onClick={() => window.print()} className="no-print">
                <Printer className="mr-2 h-4 w-4" /> Print Sheet
              </Button>
            </DialogTitle>
            <DialogDescription className="no-print">
              Printable dispatch manifest for drivers with customer delivery addresses and signature confirmation.
            </DialogDescription>
          </DialogHeader>

          {/* Printable Manifest Document */}
          <div className="p-6 bg-white dark:bg-zinc-950 text-foreground rounded-lg border space-y-6 print:p-0 print:border-none">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-wide">Daily Dispatch Manifest</h2>
                <p className="text-sm text-muted-foreground">Manufacturing & Logistics Department</p>
              </div>
              <div className="text-right text-xs space-y-1">
                <p><span className="font-semibold">Date:</span> {new Date().toISOString().split("T")[0]}</p>
                <p><span className="font-semibold">Total Stops:</span> {filteredDeliveries.length}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse border">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-2 border">Challan #</th>
                  <th className="p-2 border">Customer / Party</th>
                  <th className="p-2 border">Driver / Vehicle</th>
                  <th className="p-2 border">Route / Address</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border text-center">Receiver Signature</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((del) => (
                  <tr key={del.id} className="border-b">
                    <td className="p-2 border font-mono font-semibold">{del.id}</td>
                    <td className="p-2 border font-medium">{del.customer}</td>
                    <td className="p-2 border">{del.driver ?? "Unassigned"}</td>
                    <td className="p-2 border">{del.route ?? "Local Factory Route"}</td>
                    <td className="p-2 border">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted">
                        {del.status}
                      </span>
                    </td>
                    <td className="p-2 border h-12 text-center align-bottom text-[10px] text-muted-foreground">
                      _____________________
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-6 border-t flex justify-between text-xs text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Dispatcher Approval:</p>
                <p className="mt-4">Signature: __________________________</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">Driver Receipt Acknowledgement:</p>
                <p className="mt-4">Signature: __________________________</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
