import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeliveriesQuery,
  useCancelDeliveryMutation,
  useUpdateDeliveryMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { ScheduleDeliveryForm } from "@/components/delivery/schedule-delivery-form";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, Truck, CheckCircle2, Clock, MapPin, Calendar, AlertCircle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { DeliveryRow } from "@/types/domain";

const deliveryColumns: ColumnDef<DeliveryRow, unknown>[] = [
  {
    accessorKey: "id",
    header: "Challan #",
    cell: ({ row }) => <span className="font-mono font-bold text-xs">{row.getValue("id")}</span>,
  },
  {
    accessorKey: "customer",
    header: "Customer / Party",
    cell: ({ row }) => <span className="font-semibold text-xs text-foreground">{row.getValue("customer")}</span>,
  },
  {
    accessorKey: "driver",
    header: "Driver / Vehicle",
    cell: ({ row }) => (
      <div className="text-xs">
        <p className="font-medium text-foreground">{row.original.driver ?? "Unassigned"}</p>
        <p className="text-[10px] text-muted-foreground">{row.original.vehicle ?? "No Vehicle"}</p>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Dispatch Status",
    cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
  },
  {
    accessorKey: "scheduledDate",
    header: "Scheduled Date",
    cell: ({ row }) => formatDate(row.getValue("scheduledDate")),
  },
  {
    accessorKey: "route",
    header: "Route",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal text-xs bg-muted/30">
        {row.getValue("route") || "Local Factory Route"}
      </Badge>
    ),
  },
];

export function DeliveryPage() {
  const { data, error, isLoading } = useDeliveriesQuery();
  const { mutate: cancelDelivery, isPending: isCancelling } = useCancelDeliveryMutation();
  const updateDelivery = useUpdateDeliveryMutation();

  const [scheduleDeliveryOpen, setScheduleDeliveryOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [manifestModalOpen, setManifestModalOpen] = useState(false);

  if (isLoading) {
    return <Skeleton className="h-[480px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold text-destructive">Challans could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const allDeliveries = data.items;
  const selectedDelivery = allDeliveries.find((d) => d.id === selectedDeliveryId);

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

  const handleUpdateStatus = async (deliveryId: string, newStatus: "OUT_FOR_DELIVERY" | "DELIVERED") => {
    try {
      await updateDelivery.mutateAsync({
        id: deliveryId,
        status: newStatus,
      });
      toast.success(`Challan updated to ${newStatus}`);
    } catch (err) {
      toast.error("Status update failed", { description: getErrorMessage(err) });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Dispatch & Delivery Challans"
        actions={[
          {
            label: "Print Daily Manifest",
            variant: "outline",
            onClick: () => setManifestModalOpen(true),
          },
          {
            label: scheduleDeliveryOpen ? "Close Form" : "Schedule New Delivery",
            onClick: () => setScheduleDeliveryOpen((c) => !c),
          },
        ]}
      />

      {/* Dispatch KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Challans Recorded
              </p>
              <Truck className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {totalChallans} <span className="text-sm font-normal text-muted-foreground font-sans">Total</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">All recorded warehouse dispatches</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Dispatches
              </p>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
              {activeDispatchCount} <span className="text-sm font-normal text-muted-foreground font-sans">In Transit</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Scheduled or out for delivery</p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fulfilled Deliveries
              </p>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold font-mono mt-1 text-emerald-600 dark:text-emerald-400">
              {completedCount} <span className="text-sm font-normal text-muted-foreground font-sans">Delivered</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Successfully delivered & acknowledged</p>
          </CardContent>
        </Card>
      </div>

      {scheduleDeliveryOpen ? <ScheduleDeliveryForm onClose={() => setScheduleDeliveryOpen(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-lg font-bold">Dispatch Scheduler</CardTitle>
                <CardDescription className="text-xs">
                  Manage active delivery challans, vehicle routes, and driver assignments.
                </CardDescription>
              </div>
              {selectedDeliveryId && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive hover:text-white border-destructive/30 text-xs font-semibold rounded-xl"
                  onClick={() => setConfirmOpen(true)}
                  disabled={isCancelling}
                >
                  {isCancelling ? "Cancelling..." : "Cancel Selected Challan"}
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
                searchPlaceholder="Search by customer, driver, vehicle..."
                pageSize={10}
              />
            </CardContent>
          </Card>
        </div>

        {/* Selected Challan Details & Operations */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              Challan Operations
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedDelivery ? `Inspecting Challan #${selectedDelivery.id}` : "Select a challan row to manage dispatch workflow."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDelivery ? (
              <div className="space-y-4">
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Customer:</span>
                    <span className="font-semibold text-primary">{selectedDelivery.customer}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Driver / Vehicle:</span>
                    <span className="font-medium">{selectedDelivery.driver ?? "Unassigned"} ({selectedDelivery.vehicle ?? "N/A"})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Scheduled Date:</span>
                    <span className="font-medium">{formatDate(selectedDelivery.scheduledDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <StatusBadge value={selectedDelivery.status} />
                  </div>
                </div>

                {/* Dispatch Action Buttons */}
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actionable Workflow
                  </p>
                  {selectedDelivery.status === "SCHEDULED" && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedDelivery.id, "OUT_FOR_DELIVERY")}
                      disabled={updateDelivery.isPending}
                      className="w-full justify-center rounded-xl font-semibold bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    >
                      <Truck className="mr-2 h-4 w-4" /> Dispatch — Mark Out For Delivery
                    </Button>
                  )}
                  {selectedDelivery.status === "OUT_FOR_DELIVERY" && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedDelivery.id, "DELIVERED")}
                      disabled={updateDelivery.isPending}
                      className="w-full justify-center rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Full Delivery
                    </Button>
                  )}
                  {selectedDelivery.status === "DELIVERED" && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 text-xs font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Delivery fulfilled and acknowledged.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
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
              </div>
            )}

            <Button
              variant="outline"
              className="w-full mt-4 justify-center rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary/5 text-xs"
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
        description="The delivery will be cancelled and the sales order returned to CONFIRMED status for re-dispatch."
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
              <Button size="sm" onClick={() => window.print()} className="no-print rounded-xl font-semibold">
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
                <p className="text-sm text-muted-foreground">Manish Steel ERP — Manufacturing & Logistics</p>
              </div>
              <div className="text-right text-xs space-y-1">
                <p><span className="font-semibold">Date:</span> {new Date().toISOString().split("T")[0]}</p>
                <p><span className="font-semibold">Total Dispatches:</span> {filteredDeliveries.length}</p>
              </div>
            </div>

            <table className="w-full text-xs text-left border-collapse border">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="p-2 border">Challan #</th>
                  <th className="p-2 border">Customer / Party</th>
                  <th className="p-2 border">Driver / Vehicle</th>
                  <th className="p-2 border">Route</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border text-center">Receiver Signature</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((del) => (
                  <tr key={del.id} className="border-b">
                    <td className="p-2 border font-mono font-semibold">{del.id}</td>
                    <td className="p-2 border font-medium">{del.customer}</td>
                    <td className="p-2 border">{del.driver ?? "Unassigned"} ({del.vehicle ?? "N/A"})</td>
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
                <p className="font-semibold text-foreground">Warehouse Dispatcher Approval:</p>
                <p className="mt-4">Signature: __________________________</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">Driver Acknowledgement:</p>
                <p className="mt-4">Signature: __________________________</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
