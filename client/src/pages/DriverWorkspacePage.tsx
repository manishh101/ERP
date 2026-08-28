import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  useDeliveriesQuery,
  useUpdateDeliveryMutation,
  useFailDeliveryMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Truck,
  Phone,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Package,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileText,
  Camera,
  UserCheck,
  RotateCcw,
  Clock,
} from "lucide-react";
import type { DeliveryRow } from "@/types/domain";

export function DriverWorkspacePage() {
  const { user } = useAuth();
  const { data, error, isLoading } = useDeliveriesQuery();
  const updateDelivery = useUpdateDeliveryMutation();
  const failDelivery = useFailDeliveryMutation();

  // Filters & State
  const [filterTab, setFilterTab] = useState<"ACTIVE" | "COMPLETED" | "FAILED" | "ALL">("ACTIVE");
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);

  // POD Completion Modal State
  const [podModalOpen, setPodModalOpen] = useState(false);
  const [activeDelivery, setActiveDelivery] = useState<DeliveryRow | null>(null);
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [actualDeliveryDate, setActualDeliveryDate] = useState("");
  const [driverNotes, setDriverNotes] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState("");

  // Failure Modal State
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");

  const getChallanCode = (id?: string) => {
    if (!id) return "CH-—";
    return id.length > 8 ? `CH-${id.slice(-6).toUpperCase()}` : `CH-${id.toUpperCase()}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card className="border-destructive/30 bg-destructive/5 rounded-2xl">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="mx-auto h-9 w-9 text-destructive mb-2" />
            <h3 className="font-semibold text-destructive text-base">Unable to load driver route</h3>
            <p className="mt-1 text-xs text-muted-foreground">{getErrorMessage(error)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDeliveries = data?.items ?? [];

  const isDriverUser = user?.role === "DRIVER";
  const driverDeliveries = isDriverUser
    ? allDeliveries.filter((d) => !d.driverId || d.driverId === user.id)
    : allDeliveries;

  const activeDeliveries = driverDeliveries.filter(
    (d) => d.rawStatus === "SCHEDULED" || d.rawStatus === "OUT_FOR_DELIVERY"
  );
  const completedDeliveries = driverDeliveries.filter((d) => d.rawStatus === "DELIVERED");
  const failedDeliveries = driverDeliveries.filter((d) => d.rawStatus === "FAILED_ATTEMPT");

  const displayedDeliveries = driverDeliveries.filter((d) => {
    if (filterTab === "ACTIVE") return d.rawStatus === "SCHEDULED" || d.rawStatus === "OUT_FOR_DELIVERY";
    if (filterTab === "COMPLETED") return d.rawStatus === "DELIVERED";
    if (filterTab === "FAILED") return d.rawStatus === "FAILED_ATTEMPT";
    return true;
  });

  const handleStartDelivery = async (deliveryId: string) => {
    try {
      await updateDelivery.mutateAsync({
        id: deliveryId,
        status: "OUT_FOR_DELIVERY",
      });
      toast.success("Delivery Dispatched", { description: "Order status marked Out For Delivery" });
    } catch (err) {
      toast.error("Failed to update status", { description: getErrorMessage(err) });
    }
  };

  const handleOpenPodModal = (delivery: DeliveryRow) => {
    setActiveDelivery(delivery);
    setReceiverName(delivery.receiverName ?? delivery.customer ?? "");
    setReceiverPhone(delivery.receiverPhone ?? delivery.customerPhone ?? "");
    setActualDeliveryDate(new Date().toISOString().split("T")[0]);
    setDriverNotes(delivery.notes ?? "");
    setProofPhotoUrl(delivery.proofPhotoUrl ?? "");
    setPodModalOpen(true);
  };

  const handleCompletePod = async () => {
    if (!activeDelivery) return;
    try {
      await updateDelivery.mutateAsync({
        id: activeDelivery.id,
        status: "DELIVERED",
        receiverName: receiverName.trim() || undefined,
        receiverPhone: receiverPhone.trim() || undefined,
        actualDeliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate).toISOString() : new Date().toISOString(),
        notes: driverNotes.trim() || undefined,
        proofPhotoUrl: proofPhotoUrl.trim() || undefined,
      });
      toast.success("Delivery Complete", { description: "Proof of delivery saved successfully." });
      setPodModalOpen(false);
      setActiveDelivery(null);
    } catch (err) {
      toast.error("Failed to complete delivery", { description: getErrorMessage(err) });
    }
  };

  const handleOpenFailModal = (delivery: DeliveryRow) => {
    setActiveDelivery(delivery);
    setFailureReason("Customer Not Available at Address");
    setCustomReason("");
    setRescheduleDate("");
    setFailModalOpen(true);
  };

  const handleRecordFailure = async () => {
    if (!activeDelivery) return;
    const finalReason = failureReason === "Other" ? customReason : failureReason;
    if (!finalReason.trim()) {
      toast.error("Please specify a failure reason");
      return;
    }

    try {
      await failDelivery.mutateAsync({
        id: activeDelivery.id,
        failureReason: finalReason.trim(),
        scheduledDate: rescheduleDate ? new Date(rescheduleDate).toISOString() : undefined,
      });
      toast.success("Issue Logged", { description: "Delivery attempt issue recorded." });
      setFailModalOpen(false);
      setActiveDelivery(null);
    } catch (err) {
      toast.error("Failed to record issue", { description: getErrorMessage(err) });
    }
  };

  const STANDARD_FAILURE_REASONS = [
    "Customer Not Available at Address",
    "Incorrect / Unreachable Address",
    "Customer Refused Delivery",
    "Vehicle Breakdown / Delay",
    "Other",
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5 px-3 sm:px-4 py-4 pb-20">
      {/* Clean Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-border/60 bg-card shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium">
              <Truck className="h-3.5 w-3.5" /> Mobile Driver Hub
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Driver Workspace</h1>
          <p className="text-xs text-muted-foreground">
            Assigned to <span className="font-semibold text-foreground">{user?.name ?? "Driver"}</span>
          </p>
        </div>

        {/* Clean Metric Counters */}
        <div className="flex items-center gap-2">
          <div className="flex-1 sm:flex-none text-center bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-1.5 min-w-[80px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Active</p>
            <p className="text-base font-bold font-mono text-amber-700 dark:text-amber-400 leading-tight">{activeDeliveries.length}</p>
          </div>
          <div className="flex-1 sm:flex-none text-center bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3.5 py-1.5 min-w-[80px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Delivered</p>
            <p className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400 leading-tight">{completedDeliveries.length}</p>
          </div>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div className="inline-flex w-full p-1 rounded-xl bg-muted/60 border border-border/40 gap-1 overflow-x-auto">
        {[
          { id: "ACTIVE", label: "Active", count: activeDeliveries.length, icon: Clock },
          { id: "COMPLETED", label: "Delivered", count: completedDeliveries.length, icon: CheckCircle2 },
          { id: "FAILED", label: "Issues", count: failedDeliveries.length, icon: AlertTriangle },
          { id: "ALL", label: "All", count: driverDeliveries.length, icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = filterTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id as any)}
              className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-xs border border-border/40 font-bold"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                isActive ? "bg-primary/10 text-primary font-bold" : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Deliveries List */}
      {displayedDeliveries.length === 0 ? (
        <Card className="border-dashed border-border/80 rounded-2xl py-10 text-center bg-card/50">
          <CardContent className="space-y-2">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <h3 className="text-sm font-semibold text-foreground">No dispatches found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are no deliveries in this section. New dispatches from the warehouse will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3.5">
          {displayedDeliveries.map((delivery) => {
            const isExpanded = expandedDeliveryId === delivery.id;
            const isOutForDelivery = delivery.rawStatus === "OUT_FOR_DELIVERY";
            const isScheduled = delivery.rawStatus === "SCHEDULED";
            const isDelivered = delivery.rawStatus === "DELIVERED";
            const isFailed = delivery.rawStatus === "FAILED_ATTEMPT";

            return (
              <Card
                key={delivery.id}
                className="rounded-2xl border border-border/60 bg-card shadow-xs hover:border-border transition-all overflow-hidden"
              >
                <CardHeader className="p-4 pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <StatusBadge value={delivery.rawStatus} />
                      <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                        {getChallanCode(delivery.id)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{formatDate(delivery.scheduledDate)}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h2 className="text-base font-bold text-foreground tracking-tight">
                      {delivery.customer}
                    </h2>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  {/* Address Section */}
                  <div className="p-3 rounded-xl bg-muted/40 border border-border/40 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Delivery Location
                        </p>
                        <p className="text-xs font-medium text-foreground leading-snug break-words">
                          {delivery.deliveryAddress}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://maps.google.com/?q=${encodeURIComponent(delivery.deliveryAddress)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline bg-card px-2.5 py-1 rounded-lg border border-border/60 shrink-0"
                    >
                      <Navigation className="h-3.5 w-3.5" /> Maps
                    </a>
                  </div>

                  {/* Contact Person */}
                  {delivery.customerPhone && (
                    <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border/50 text-xs">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{delivery.customerPhone}</span>
                      </div>

                      <a
                        href={`tel:${delivery.customerPhone}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Call
                      </a>
                    </div>
                  )}

                  {/* Accordion Line Items */}
                  <div className="rounded-xl border border-border/40 bg-card p-2.5">
                    <button
                      type="button"
                      onClick={() => setExpandedDeliveryId(isExpanded ? null : delivery.id)}
                      className="w-full flex items-center justify-between text-xs font-medium text-foreground"
                    >
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        Order Contents ({delivery.lineItems.length} items)
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {isExpanded ? "Hide" : "Show"}
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="pt-2 mt-2 border-t border-border/40 space-y-1.5">
                        {delivery.lineItems.length > 0 ? (
                          delivery.lineItems.map((item, idx) => (
                            <div key={item.id || idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                              <span className="font-medium text-foreground">{item.productName}</span>
                              <span className="font-mono text-xs font-semibold text-primary">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Standard Order Dispatch</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes or Failure Reason */}
                  {delivery.notes && (
                    <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs space-y-0.5">
                      <p className="font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> Dispatch Note:
                      </p>
                      <p className="text-muted-foreground">{delivery.notes}</p>
                    </div>
                  )}

                  {isFailed && delivery.failureReason && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-0.5 text-rose-700 dark:text-rose-400">
                      <p className="font-semibold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Issue Recorded:
                      </p>
                      <p>{delivery.failureReason}</p>
                    </div>
                  )}

                  {/* Execution Action Bar */}
                  <div className="pt-2 border-t border-border/40">
                    {isScheduled && (
                      <Button
                        onClick={() => handleStartDelivery(delivery.id)}
                        disabled={updateDelivery.isPending}
                        className="w-full rounded-xl font-semibold h-10 text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                      >
                        <Truck className="mr-1.5 h-4 w-4" /> Start Delivery Run
                      </Button>
                    )}

                    {isOutForDelivery && (
                      <div className="grid grid-cols-1 sm:grid-cols-[1.6fr_1fr] gap-2">
                        <Button
                          onClick={() => handleOpenPodModal(delivery)}
                          className="w-full rounded-xl font-semibold h-10 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" /> Complete Delivery (POD)
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleOpenFailModal(delivery)}
                          className="w-full rounded-xl font-semibold h-10 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        >
                          <AlertTriangle className="mr-1.5 h-3.5 w-3.5" /> Issue
                        </Button>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1">
                        <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4" /> Fulfilled & Delivered
                          </span>
                          {(delivery.actualDeliveryDate || delivery.completedAt) && (
                            <span className="font-mono text-[11px] text-muted-foreground font-normal">
                              {formatDate(delivery.actualDeliveryDate || delivery.completedAt!)}
                            </span>
                          )}
                        </div>
                        {delivery.receiverName && (
                          <p className="text-[11px] text-muted-foreground">
                            Receiver: <strong className="text-foreground">{delivery.receiverName}</strong>
                            {delivery.receiverPhone ? ` (${delivery.receiverPhone})` : ""}
                          </p>
                        )}
                      </div>
                    )}

                    {isFailed && (
                      <Button
                        variant="outline"
                        onClick={() => handleStartDelivery(delivery.id)}
                        disabled={updateDelivery.isPending}
                        className="w-full rounded-xl font-semibold h-10 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Re-dispatch Delivery
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Proof of Delivery (POD) Completion Modal */}
      <Dialog open={podModalOpen} onOpenChange={setPodModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Proof of Delivery (POD)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm goods delivery for <strong className="text-foreground">{activeDelivery?.customer}</strong> ({getChallanCode(activeDelivery?.id)})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pod-receiver-name" className="text-xs font-semibold flex items-center gap-1">
                  <UserCheck className="h-3.5 w-3.5 text-primary" /> Receiver Name
                </Label>
                <Input
                  id="pod-receiver-name"
                  placeholder="Person receiving goods"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pod-receiver-phone" className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5 text-primary" /> Receiver Phone
                </Label>
                <Input
                  id="pod-receiver-phone"
                  placeholder="Contact number"
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pod-actual-date" className="text-xs font-semibold flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Actual Delivery Date
              </Label>
              <Input
                id="pod-actual-date"
                type="date"
                value={actualDeliveryDate}
                onChange={(e) => setActualDeliveryDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pod-driver-notes" className="text-xs font-semibold flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-primary" /> Delivery Particulars / Receiver Notes
              </Label>
              <Textarea
                id="pod-driver-notes"
                placeholder="e.g. Received by Gate Manager Ramesh. All items intact."
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                className="rounded-xl min-h-[70px] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pod-photo-url" className="text-xs font-semibold flex items-center gap-1">
                <Camera className="h-3.5 w-3.5 text-primary" /> Proof Photo / Attachment URL (Optional)
              </Label>
              <Input
                id="pod-photo-url"
                placeholder="Photo URL or attachment string"
                value={proofPhotoUrl}
                onChange={(e) => setProofPhotoUrl(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setPodModalOpen(false)}
              className="rounded-xl h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePod}
              disabled={updateDelivery.isPending}
              className="rounded-xl h-9 px-5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {updateDelivery.isPending ? "Submitting..." : "Save Delivery POD"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failure / Issue Record Modal */}
      <Dialog open={failModalOpen} onOpenChange={setFailModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Record Delivery Issue
            </DialogTitle>
            <DialogDescription className="text-xs">
              Log why delivery could not be completed for <strong className="text-foreground">{activeDelivery?.customer}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Reason</Label>
              <div className="space-y-1">
                {STANDARD_FAILURE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFailureReason(reason)}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      failureReason === reason
                        ? "border-destructive bg-destructive/10 text-destructive font-semibold"
                        : "border-border/60 bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {failureReason === "Other" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Specify Issue</Label>
                <Input
                  placeholder="Describe the issue..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reschedule Date (Optional)</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="rounded-xl h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setFailModalOpen(false)}
              className="rounded-xl h-9 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordFailure}
              disabled={failDelivery.isPending}
              className="rounded-xl h-9 px-5 font-semibold bg-destructive hover:bg-destructive/90 text-white text-xs"
            >
              {failDelivery.isPending ? "Saving..." : "Record Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
