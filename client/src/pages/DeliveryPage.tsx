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
  useUsersQuery,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ScheduleDeliveryForm } from "@/components/delivery/schedule-delivery-form";
import { ConfirmDialog } from "@/components/layout/confirm-dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowRight,
  UserCheck,
  FileText,
  MousePointerClick,
  HelpCircle,
  Check,
  XCircle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { DeliveryRow } from "@/types/domain";

export function DeliveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const scheduleForSoId = searchParams.get("scheduleFor") ?? undefined;

  const { data, error, isLoading } = useDeliveriesQuery();
  const { data: usersData } = useUsersQuery();
  const { mutate: cancelDelivery, isPending: isCancelling } = useCancelDeliveryMutation();
  const updateDelivery = useUpdateDeliveryMutation();

  const [scheduleDeliveryOpen, setScheduleDeliveryOpen] = useState(false);
  const [prefilledSoId, setPrefilledSoId] = useState<string | undefined>(undefined);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | undefined>(undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  
  // Driver Assignment Quick Edit
  const [isAssigningDriver, setIsAssigningDriver] = useState(false);
  const [editDriverId, setEditDriverId] = useState("");
  const [editVehicle, setEditVehicle] = useState("");

  // Auto-open form when navigated from Order page with ?scheduleFor=<soId>
  useEffect(() => {
    if (scheduleForSoId) {
      setPrefilledSoId(scheduleForSoId);
      setScheduleDeliveryOpen(true);
      // Clear the query param so it doesn't re-trigger on re-renders
      setSearchParams({}, { replace: true });
    }
  }, [scheduleForSoId]);

  if (isLoading) {
    return <Skeleton className="h-[480px] rounded-2xl" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="font-semibold text-destructive">Challans could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const allDeliveries = data.items;
  const selectedDelivery = allDeliveries.find((d) => d.id === selectedDeliveryId);
  const driversList = usersData?.items.filter((u) => u.role === "DRIVER" || u.role === "ADMIN") ?? [];

  // Dispatch KPIs
  const totalChallans = allDeliveries.length;
  const activeDispatchCount = allDeliveries.filter(
    (d) => (d.rawStatus ?? d.status) === "SCHEDULED" || (d.rawStatus ?? d.status) === "OUT_FOR_DELIVERY"
  ).length;
  const completedCount = allDeliveries.filter((d) => (d.rawStatus ?? d.status) === "DELIVERED").length;

  // Filtered Deliveries
  const filteredDeliveries = allDeliveries.filter((d) => {
    if (statusTab === "ALL") return true;
    return (d.rawStatus ?? d.status) === statusTab;
  });

  const STATUS_TABS = [
    { id: "ALL", label: "All Challans", count: totalChallans },
    { id: "SCHEDULED", label: "Scheduled", count: allDeliveries.filter((d) => (d.rawStatus ?? d.status) === "SCHEDULED").length },
    { id: "OUT_FOR_DELIVERY", label: "Out for Delivery", count: allDeliveries.filter((d) => (d.rawStatus ?? d.status) === "OUT_FOR_DELIVERY").length },
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
      toast.success(`Challan status updated to ${newStatus.replace(/_/g, " ")}`);
    } catch (err) {
      toast.error("Status update failed", { description: getErrorMessage(err) });
    }
  };

  const handleAssignDriver = async () => {
    if (!selectedDeliveryId) return;
    try {
      await updateDelivery.mutateAsync({
        id: selectedDeliveryId,
        driverId: editDriverId || undefined,
        vehicle: editVehicle.trim() || undefined,
      });
      toast.success("Driver and vehicle reassigned successfully!");
      setIsAssigningDriver(false);
    } catch (err) {
      toast.error("Driver assignment failed", { description: getErrorMessage(err) });
    }
  };

  const deliveryColumns: ColumnDef<DeliveryRow, unknown>[] = [
    {
      accessorKey: "id",
      header: "Challan Code",
      cell: ({ row }) => {
        const fullId = row.getValue("id") as string;
        const shortCode = `CH-${fullId.slice(-6).toUpperCase()}`;
        const isSelected = selectedDeliveryId === fullId;
        return (
          <div className="flex items-center gap-2">
            <span className={`font-mono font-bold text-xs ${isSelected ? "text-primary font-black" : "text-foreground"}`}>
              {shortCode}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "customer",
      header: "Customer / Party",
      cell: ({ row }) => (
        <span className="font-semibold text-xs text-foreground block truncate max-w-[180px]">
          {row.getValue("customer")}
        </span>
      ),
    },
    {
      accessorKey: "driver",
      header: "Driver & Vehicle",
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="font-medium text-foreground">
            {row.original.driver ? (
              <span className="flex items-center gap-1">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                {row.original.driver}
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400 font-medium">⚠️ Unassigned</span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">{row.original.vehicle ?? "No Vehicle Assigned"}</p>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
    },
    {
      accessorKey: "scheduledDate",
      header: "Scheduled Date",
      cell: ({ row }) => formatDate(row.getValue("scheduledDate")),
    },
    {
      accessorKey: "actions",
      header: "Quick Action",
      cell: ({ row }) => {
        const item = row.original;
        const currentStatus = item.rawStatus ?? item.status;
        if (currentStatus === "SCHEDULED") {
          return (
            <Button
              size="sm"
              className="h-7 text-[11px] px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateStatus(item.id, "OUT_FOR_DELIVERY");
              }}
            >
              <Truck className="h-3 w-3 mr-1" /> Dispatch
            </Button>
          );
        }
        if (currentStatus === "OUT_FOR_DELIVERY") {
          return (
            <Button
              size="sm"
              className="h-7 text-[11px] px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleUpdateStatus(item.id, "DELIVERED");
              }}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" /> Delivered
            </Button>
          );
        }
        return (
          <Badge variant="outline" className="text-[10px] font-medium bg-muted/40">
            Completed
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Dispatch & Delivery Challans"
        description="Manage factory vehicle dispatch, driver assignments, and delivery acknowledgments."
        actions={[
          {
            label: "Print Daily Manifest",
            variant: "outline",
            onClick: () => setManifestModalOpen(true),
          },
          {
            label: scheduleDeliveryOpen ? "Close Form" : "+ Schedule New Delivery",
            onClick: () => setScheduleDeliveryOpen((c) => !c),
          },
        ]}
      />

      {/* Quick Onboarding / Workflow Banner for New Users */}
      <Card className="border-primary/20 bg-linear-to-r from-primary/5 via-primary/10 to-transparent shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-[10px] uppercase font-bold tracking-wider">
                  Easy Workflow Guide
                </Badge>
                <h3 className="font-bold text-sm text-foreground">How Warehouse Dispatch Works</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Follow these 3 simple steps to manage truck deliveries and proof of receipt.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-border/60 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-xs">
                  1
                </span>
                <div>
                  <p className="font-bold">Schedule Delivery</p>
                  <p className="text-[10px] text-muted-foreground">Select sales order & date</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-border/60 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 font-bold text-xs">
                  2
                </span>
                <div>
                  <p className="font-bold">Assign Driver</p>
                  <p className="text-[10px] text-muted-foreground">Assign truck & dispatch</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-border/60 shadow-2xs">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-xs">
                  3
                </span>
                <div>
                  <p className="font-bold">Confirm POD</p>
                  <p className="text-[10px] text-muted-foreground">Driver uploads photo POD</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {scheduleDeliveryOpen ? (
        <ScheduleDeliveryForm
          defaultSoId={prefilledSoId}
          onClose={() => {
            setScheduleDeliveryOpen(false);
            setPrefilledSoId(undefined);
          }}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-3 border-b">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Delivery Challans Register
                </CardTitle>
                <CardDescription className="text-xs">
                  Click any row to select a challan and trigger dispatch actions on the right panel.
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
                  Cancel Selected
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Status Filter Bar */}
              <div className="flex flex-wrap items-center gap-1.5 pb-2">
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
                onRowClick={(row) => {
                  setSelectedDeliveryId(selectedDeliveryId === row.id ? undefined : row.id);
                  setIsAssigningDriver(false);
                }}
                searchPlaceholder="Search by customer, driver, vehicle..."
                pageSize={10}
              />
            </CardContent>
          </Card>
        </div>

        {/* Selected Challan Details & Operations */}
        <Card className="h-fit shadow-sm border-primary/20">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" /> Challan Operations
              </span>
              {selectedDelivery && (
                <Badge variant="outline" className="font-mono text-xs font-bold bg-primary/10 text-primary border-primary/30">
                  CH-{selectedDelivery.id.slice(-6).toUpperCase()}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              {selectedDelivery
                ? `Managing Challan for ${selectedDelivery.customer}`
                : "Select a challan row from the left table to manage workflow."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-4">
            {selectedDelivery ? (
              <div className="space-y-4">
                {/* Details Box */}
                <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/80 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-bold text-muted-foreground uppercase text-[10px]">Customer / Party:</span>
                    <span className="font-bold text-foreground text-sm">{selectedDelivery.customer}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Driver:</span>
                    <span className="font-semibold text-foreground">
                      {selectedDelivery.driver ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5" /> {selectedDelivery.driver}
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-bold">⚠️ Unassigned</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Vehicle:</span>
                    <span className="font-medium text-foreground">{selectedDelivery.vehicle ?? "Not Specified"}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Scheduled Date:</span>
                    <span className="font-medium text-foreground">{formatDate(selectedDelivery.scheduledDate)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Route Note:</span>
                    <span className="font-medium text-foreground">{selectedDelivery.route || "Local Factory Route"}</span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2">
                    <span className="text-muted-foreground">Current Status:</span>
                    <StatusBadge value={selectedDelivery.status} />
                  </div>
                </div>

                {/* Quick Driver Assignment Inline Editor */}
                {isAssigningDriver ? (
                  <div className="p-3 bg-primary/5 rounded-2xl border border-primary/20 space-y-3">
                    <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4" /> Assign Driver & Vehicle
                    </p>
                    <div className="space-y-2 text-xs">
                      <div>
                        <Label className="text-[11px]">Driver</Label>
                        <select
                          className="w-full h-9 rounded-xl border border-border bg-white text-xs px-2.5 font-medium"
                          value={editDriverId}
                          onChange={(e) => setEditDriverId(e.target.value)}
                        >
                          <option value="">-- Select Driver --</option>
                          {driversList.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.role})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <Label className="text-[11px]">Vehicle Number</Label>
                        <Input
                          placeholder="e.g. Ba 2 Cha 4567"
                          value={editVehicle}
                          onChange={(e) => setEditVehicle(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs font-bold rounded-xl"
                        onClick={handleAssignDriver}
                        disabled={updateDelivery.isPending}
                      >
                        Save Driver Assignment
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs rounded-xl"
                        onClick={() => setIsAssigningDriver(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center rounded-xl font-semibold border-border text-xs h-9"
                    onClick={() => {
                      setEditDriverId("");
                      setEditVehicle(selectedDelivery.vehicle ?? "");
                      setIsAssigningDriver(true);
                    }}
                  >
                    <UserCheck className="mr-2 h-4 w-4 text-primary" /> Reassign Driver / Vehicle
                  </Button>
                )}

                {/* Primary Dispatch Action Buttons */}
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Dispatch Operations
                  </p>

                  {(selectedDelivery.rawStatus ?? selectedDelivery.status) === "SCHEDULED" && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedDelivery.id, "OUT_FOR_DELIVERY")}
                      disabled={updateDelivery.isPending}
                      className="w-full justify-center rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs h-10 shadow-xs"
                    >
                      <Truck className="mr-2 h-4 w-4" /> Dispatch — Mark Out For Delivery
                    </Button>
                  )}

                  {(selectedDelivery.rawStatus ?? selectedDelivery.status) === "OUT_FOR_DELIVERY" && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedDelivery.id, "DELIVERED")}
                      disabled={updateDelivery.isPending}
                      className="w-full justify-center rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 shadow-xs"
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Confirm Full Delivery (POD)
                    </Button>
                  )}

                  {(selectedDelivery.rawStatus ?? selectedDelivery.status) === "DELIVERED" && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      Delivery fulfilled and acknowledged.
                    </div>
                  )}

                  <Button
                    variant="outline"
                    className="w-full justify-center rounded-xl font-semibold border-primary/30 text-primary hover:bg-primary/5 text-xs h-9"
                    onClick={() => setReceiptModalOpen(true)}
                  >
                    <Printer className="mr-2 h-4 w-4" /> Print Delivery Challan Slip
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center py-6">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MousePointerClick className="h-7 w-7 animate-bounce" />
                </div>
                <div className="space-y-1 max-w-[240px] mx-auto">
                  <h4 className="font-bold text-sm text-foreground">No Challan Selected</h4>
                  <p className="text-xs text-muted-foreground">
                    Click any row in the table on the left to inspect details, reassign drivers, or update dispatch status.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-semibold"
                    onClick={() => setScheduleDeliveryOpen(true)}
                  >
                    + Schedule New Delivery
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Cancel Delivery Challan?"
        description="The delivery will be cancelled and the sales order returned to CONFIRMED status for re-dispatch."
        confirmLabel="Cancel Challan"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCancelDelivery}
      />

      {/* Single Printable Delivery Challan Slip Modal */}
      {selectedDelivery && (
        <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" /> Delivery Challan Receipt
                </span>
                <Button size="sm" onClick={() => window.print()} className="rounded-xl font-semibold">
                  <Printer className="mr-2 h-4 w-4" /> Print Challan
                </Button>
              </DialogTitle>
            </DialogHeader>

            <div className="p-6 bg-white dark:bg-zinc-950 text-foreground rounded-lg border space-y-4 print:p-0 print:border-none">
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h2 className="text-lg font-bold uppercase">Manish Steel ERP</h2>
                  <p className="text-xs text-muted-foreground">Logistics & Warehouse Delivery Receipt</p>
                </div>
                <div className="text-right text-xs font-mono">
                  <p className="font-bold text-primary">CH-{selectedDelivery.id.slice(-6).toUpperCase()}</p>
                  <p className="text-muted-foreground">{formatDate(selectedDelivery.scheduledDate)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/20 p-3 rounded-xl">
                <div>
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Customer Details</p>
                  <p className="font-bold text-sm">{selectedDelivery.customer}</p>
                  <p className="text-muted-foreground mt-1">Route: {selectedDelivery.route || "Factory Route"}</p>
                </div>
                <div>
                  <p className="font-bold text-muted-foreground uppercase text-[10px]">Dispatch Details</p>
                  <p className="font-semibold">Driver: {selectedDelivery.driver ?? "Unassigned"}</p>
                  <p className="text-muted-foreground">Vehicle: {selectedDelivery.vehicle ?? "N/A"}</p>
                </div>
              </div>

              <div className="pt-8 border-t flex justify-between text-xs text-muted-foreground">
                <div>
                  <p className="font-semibold text-foreground">Dispatched By:</p>
                  <p className="mt-6">Signature: ______________________</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">Customer Receipt Confirmation:</p>
                  <p className="mt-6">Signature: ______________________</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Print Daily Manifest Modal */}
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

            <div className="overflow-x-auto">
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
                      <td className="p-2 border font-mono font-semibold">CH-{del.id.slice(-6).toUpperCase()}</td>
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
            </div>

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
