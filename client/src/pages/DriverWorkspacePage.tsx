import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ExternalLink,
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
  const [driverNotes, setDriverNotes] = useState("");
  const [proofPhotoUrl, setProofPhotoUrl] = useState("");

  // Failure Modal State
  const [failModalOpen, setFailModalOpen] = useState(false);
  const [failureReason, setFailureReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 p-2 sm:p-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-8 text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive mb-2" />
            <h3 className="font-bold text-destructive text-lg">Unable to load driver route</h3>
            <p className="mt-1 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allDeliveries = data?.items ?? [];

  // Filter deliveries based on driver role security & active tab
  // (If logged in as DRIVER, backend already scopes to user's id, frontend handles display filter)
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
      toast.success("Delivery Started! Marked Out for Delivery.");
    } catch (err) {
      toast.error("Failed to update status", { description: getErrorMessage(err) });
    }
  };

  const handleOpenPodModal = (delivery: DeliveryRow) => {
    setActiveDelivery(delivery);
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
        notes: driverNotes.trim() || undefined,
        proofPhotoUrl: proofPhotoUrl.trim() || undefined,
      });
      toast.success("Delivery successfully completed & acknowledged!");
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
      toast.success("Delivery attempt issue recorded.");
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
    <div className="max-w-3xl mx-auto space-y-5 px-2 sm:px-4 py-3 pb-16">
      {/* Mobile Ergonomic Top Bar Header */}
      <Card className="border-primary/20 bg-linear-to-r from-primary/10 via-background to-amber-500/10 shadow-xs">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-semibold px-2.5 py-0.5">
                  <Truck className="h-3.5 w-3.5 mr-1" /> Mobile Driver Hub
                </Badge>
                <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Driver Route Workspace
              </h1>
              <p className="text-xs text-muted-foreground">
                Driver: <span className="font-semibold text-foreground">{user?.name ?? "On-Duty Driver"}</span>
              </p>
            </div>

            {/* Quick Driver Stats Pills */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <div className="flex-1 sm:flex-none text-center bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5">
                <p className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Active</p>
                <p className="text-lg font-black font-mono leading-none text-amber-700 dark:text-amber-400">{activeDeliveries.length}</p>
              </div>
              <div className="flex-1 sm:flex-none text-center bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-1.5">
                <p className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Delivered</p>
                <p className="text-lg font-black font-mono leading-none text-emerald-700 dark:text-emerald-400">{completedDeliveries.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter Tabs — Large Touch Targets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "ACTIVE", label: "Active Jobs", count: activeDeliveries.length, icon: Clock },
          { id: "COMPLETED", label: "Delivered", count: completedDeliveries.length, icon: CheckCircle2 },
          { id: "FAILED", label: "Issues", count: failedDeliveries.length, icon: AlertTriangle },
          { id: "ALL", label: "All Assignments", count: driverDeliveries.length, icon: Package },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = filterTab === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "default" : "outline"}
              className={`rounded-2xl h-11 px-4 text-xs font-bold transition-all shrink-0 ${
                isActive ? "shadow-md scale-[1.02]" : "bg-card hover:bg-muted"
              }`}
              onClick={() => setFilterTab(tab.id as any)}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {tab.label}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-mono ${
                isActive ? "bg-primary-foreground text-primary font-black" : "bg-muted text-muted-foreground"
              }`}>
                {tab.count}
              </span>
            </Button>
          );
        })}
      </div>

      {/* Delivery Cards List */}
      {displayedDeliveries.length === 0 ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="space-y-3">
            <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-base font-bold text-foreground">No deliveries in this section</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You have no dispatches matching the selected filter. Check back when new orders are dispatched by the warehouse team.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {displayedDeliveries.map((delivery) => {
            const isExpanded = expandedDeliveryId === delivery.id;
            const isOutForDelivery = delivery.rawStatus === "OUT_FOR_DELIVERY";
            const isScheduled = delivery.rawStatus === "SCHEDULED";
            const isDelivered = delivery.rawStatus === "DELIVERED";
            const isFailed = delivery.rawStatus === "FAILED_ATTEMPT";

            return (
              <Card
                key={delivery.id}
                className={`transition-all duration-200 border-l-4 shadow-sm overflow-hidden ${
                  isOutForDelivery
                    ? "border-l-blue-600 dark:border-l-blue-400 bg-blue-500/5"
                    : isScheduled
                    ? "border-l-amber-500 bg-card"
                    : isDelivered
                    ? "border-l-emerald-600 bg-emerald-500/5 opacity-90"
                    : "border-l-rose-500 bg-rose-500/5"
                }`}
              >
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge value={delivery.rawStatus} />
                        <span className="font-mono text-xs font-bold text-muted-foreground">
                          Challan #{delivery.id}
                        </span>
                      </div>
                      <h2 className="text-lg font-black text-foreground tracking-tight">
                        {delivery.customer}
                      </h2>
                    </div>

                    <Badge variant="secondary" className="font-mono text-[10px] bg-muted font-bold shrink-0">
                      <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                      {formatDate(delivery.scheduledDate)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                  {/* Driver Clear 5 Questions Layout */}

                  {/* 1. WHERE AM I GOING? (Address & Navigation) */}
                  <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Delivery Address
                          </p>
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {delivery.deliveryAddress}
                          </p>
                        </div>
                      </div>

                      {/* Map Navigation Direct Button */}
                      <a
                        href={`https://maps.google.com/?q=${encodeURIComponent(delivery.deliveryAddress)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-xs h-10 px-3 shrink-0 shadow-xs hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Navigation className="h-4 w-4 mr-1.5" /> Direct Map
                      </a>
                    </div>
                  </div>

                  {/* 2. WHICH CUSTOMER? (Customer & Phone Dial) */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground">Contact Person</p>
                      <p className="text-sm font-bold text-foreground">{delivery.customer}</p>
                      {delivery.customerPhone ? (
                        <p className="text-xs font-mono text-muted-foreground">{delivery.customerPhone}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">No phone provided</p>
                      )}
                    </div>

                    {delivery.customerPhone && (
                      <a
                        href={`tel:${delivery.customerPhone}`}
                        className="inline-flex items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs h-10 px-4 shrink-0 shadow-xs hover:bg-emerald-700 active:scale-95 transition-all"
                      >
                        <Phone className="h-4 w-4 mr-1.5" /> Call Customer
                      </a>
                    )}
                  </div>

                  {/* 3. WHAT AM I DELIVERING? (Items summary) */}
                  <div className="rounded-2xl border bg-card p-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setExpandedDeliveryId(isExpanded ? null : delivery.id)}
                      className="w-full flex items-center justify-between text-xs font-bold text-foreground"
                    >
                      <span className="flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-amber-500" />
                        Items to Deliver ({delivery.lineItems.length} Products)
                      </span>
                      <span className="text-primary flex items-center text-[11px] font-semibold">
                        {isExpanded ? "Hide Details" : "View Items"}
                        {isExpanded ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="pt-2 border-t space-y-2">
                        {delivery.lineItems.length > 0 ? (
                          delivery.lineItems.map((item, idx) => (
                            <div key={item.id || idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-muted/30">
                              <span className="font-semibold text-foreground">{item.productName}</span>
                              <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">
                                Qty: {item.quantity}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Standard Order Items (Refer to Order #{delivery.soId})</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Existing Notes or Failure Reason */}
                  {delivery.notes && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs text-foreground space-y-1">
                      <p className="font-bold flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <FileText className="h-3.5 w-3.5" /> Driver / Delivery Note:
                      </p>
                      <p className="text-muted-foreground">{delivery.notes}</p>
                    </div>
                  )}

                  {isFailed && delivery.failureReason && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-700 dark:text-rose-400 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> Recorded Attempt Issue:
                      </p>
                      <p>{delivery.failureReason}</p>
                    </div>
                  )}

                  {/* 4. WHAT SHOULD I DO NEXT? (Driver Touch Action Buttons) */}
                  <div className="pt-2 border-t space-y-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Driver Execution Actions
                    </p>

                    {isScheduled && (
                      <Button
                        onClick={() => handleStartDelivery(delivery.id)}
                        disabled={updateDelivery.isPending}
                        className="w-full h-12 rounded-2xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-sm shadow-md active:scale-[0.99] transition-all"
                      >
                        <Truck className="mr-2 h-5 w-5" /> Start Route — Mark Out For Delivery
                      </Button>
                    )}

                    {isOutForDelivery && (
                      <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-2">
                        <Button
                          onClick={() => handleOpenPodModal(delivery)}
                          className="w-full h-12 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-sm shadow-md active:scale-[0.99] transition-all"
                        >
                          <CheckCircle2 className="mr-2 h-5 w-5" /> Complete & Record POD
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => handleOpenFailModal(delivery)}
                          className="w-full h-12 rounded-2xl font-bold border-destructive/40 text-destructive hover:bg-destructive/10 text-xs active:scale-[0.99] transition-all"
                        >
                          <AlertTriangle className="mr-1.5 h-4 w-4" /> Report Issue
                        </Button>
                      </div>
                    )}

                    {isDelivered && (
                      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Delivery Fulfilled
                        </span>
                        {delivery.completedAt && (
                          <span className="font-mono text-[10px] text-muted-foreground font-normal">
                            {new Date(delivery.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    )}

                    {isFailed && (
                      <Button
                        variant="outline"
                        onClick={() => handleStartDelivery(delivery.id)}
                        disabled={updateDelivery.isPending}
                        className="w-full h-11 rounded-2xl font-bold border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 text-xs"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" /> Retry Delivery Dispatch
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
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" /> Proof of Delivery (POD)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm order delivery for <strong className="text-foreground">{activeDelivery?.customer}</strong> (Challan #{activeDelivery?.id})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pod-driver-notes" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Delivery Particulars / Receiver Notes
              </Label>
              <Textarea
                id="pod-driver-notes"
                placeholder="e.g. Received by Gate Manager Ramesh. Checked all 10 items undamaged."
                value={driverNotes}
                onChange={(e) => setDriverNotes(e.target.value)}
                className="rounded-2xl min-h-[90px] text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pod-photo-url" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-primary" /> Proof Photo / Signature URL (Optional)
              </Label>
              <Input
                id="pod-photo-url"
                placeholder="Photo URL or attachment string"
                value={proofPhotoUrl}
                onChange={(e) => setProofPhotoUrl(e.target.value)}
                className="rounded-xl h-11 text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Drivers can attach photo verification URLs or gate pass references.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setPodModalOpen(false)}
              className="rounded-xl h-11 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCompletePod}
              disabled={updateDelivery.isPending}
              className="rounded-xl h-11 px-6 font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-md"
            >
              {updateDelivery.isPending ? "Submitting POD..." : "Confirm & Save Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Issue / Failure Modal */}
      <Dialog open={failModalOpen} onOpenChange={setFailModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-black text-destructive">
              <AlertTriangle className="h-6 w-6 text-destructive" /> Report Delivery Issue
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record why delivery could not be completed for <strong className="text-foreground">{activeDelivery?.customer}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Select Failure Reason</Label>
              <div className="space-y-1.5">
                {STANDARD_FAILURE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setFailureReason(reason)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      failureReason === reason
                        ? "border-destructive bg-destructive/10 text-destructive font-bold"
                        : "border-border/80 bg-card hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            {failureReason === "Other" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Specify Issue</Label>
                <Input
                  placeholder="Describe the delivery issue..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="rounded-xl h-10 text-xs"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Optional Reschedule Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="rounded-xl h-10 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setFailModalOpen(false)}
              className="rounded-xl h-11 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRecordFailure}
              disabled={failDelivery.isPending}
              className="rounded-xl h-11 px-6 font-bold bg-destructive hover:bg-destructive/90 text-white text-xs shadow-md"
            >
              {failDelivery.isPending ? "Recording Issue..." : "Record Issue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
