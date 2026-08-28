import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreateDeliveryMutation, useSalesOrdersQuery, useUsersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { Truck } from "lucide-react";

type ScheduleDeliveryFormProps = {
  onClose: () => void;
  defaultSoId?: string;
};

export function ScheduleDeliveryForm({ onClose, defaultSoId }: ScheduleDeliveryFormProps) {
  const createDelivery = useCreateDeliveryMutation();
  const salesOrders = useSalesOrdersQuery();
  const users = useUsersQuery();

  const driversList = users.data?.items.filter((u) => u.role === "DRIVER" || u.role === "ADMIN") ?? [];

  const [soId, setSoId] = useState(defaultSoId ?? "");
  const [driverId, setDriverId] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  });
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  // Auto-fill delivery address when sales order changes
  useEffect(() => {
    if (soId) {
      const selectedOrder = salesOrders.data?.items.find((so) => so.id === soId);
      if (selectedOrder?.customer && !deliveryAddress) {
        setDeliveryAddress(`${selectedOrder.customer} - Local Delivery`);
      }
    }
  }, [soId, salesOrders.data]);

  const handleSubmit = async () => {
    if (!soId) {
      toast.error("Please select a Sales Order.");
      return;
    }
    if (!deliveryAddress || deliveryAddress.length < 4) {
      toast.error("Please enter a delivery address (min 4 characters).");
      return;
    }

    try {
      await createDelivery.mutateAsync({
        soId,
        driverId: driverId.trim() || undefined,
        vehicle: vehicle.trim() || undefined,
        status: "SCHEDULED",
        scheduledDate: scheduledDate ? new Date(`${scheduledDate}T12:00:00Z`).toISOString() : new Date().toISOString(),
        deliveryAddress,
        notes: notes.trim() || undefined,
      });

      toast.success("Delivery Challan Created", {
        description: "The delivery has been scheduled. You can now assign a driver and dispatch.",
      });
      onClose();
    } catch (error) {
      toast.error("Scheduling failed", { description: getErrorMessage(error) });
    }
  };

  const selectedOrderLabel = salesOrders.data?.items.find((so) => so.id === soId);

  return (
    <Card className="border-0 shadow-none bg-background">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base font-bold">Schedule Delivery Challan</CardTitle>
            <CardDescription className="text-xs">
              Pick the order, date, and optionally assign a driver. You can always reassign later.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Sales Order */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Sales Order *</label>
            <select
              className="flex h-10 w-full rounded-xl border border-border bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
              value={soId}
              onChange={(e) => {
                setSoId(e.target.value);
                const order = salesOrders.data?.items.find((so) => so.id === e.target.value);
                if (order?.customer) {
                  setDeliveryAddress(`${order.customer} - Local Delivery`);
                }
              }}
            >
              <option value="">-- Select sales order --</option>
              {salesOrders.data?.items
                .filter((so) => so.rawStatus !== "QUOTE" && so.rawStatus !== "CANCELLED" && so.rawStatus !== "DELIVERED")
                .map((so) => (
                  <option key={so.id} value={so.id}>
                    {so.customer} — {so.status}
                  </option>
                ))}
            </select>
            {selectedOrderLabel && (
              <p className="text-[10px] text-muted-foreground">
                Order ID: <span className="font-mono">{soId}</span>
              </p>
            )}
          </div>

          {/* Scheduled Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Delivery Date *</label>
            <NepaliDatePickerInput
              value={scheduledDate}
              onChange={(date) => {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, "0");
                const dd = String(date.getDate()).padStart(2, "0");
                setScheduledDate(`${yyyy}-${mm}-${dd}`);
              }}
            />
          </div>

          {/* Delivery Address */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Delivery Address *</label>
            <Input
              placeholder="Customer delivery location"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          {/* Driver */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Driver <span className="text-muted-foreground font-normal">(optional)</span></label>
            <select
              className="flex h-10 w-full rounded-xl border border-border bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">-- Assign later --</option>
              {driversList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.role})
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Vehicle <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="e.g. Ba 2 Cha 4567"
              value={vehicle}
              onChange={(e) => setVehicle(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              placeholder="Any special delivery instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <Button variant="outline" onClick={onClose} disabled={createDelivery.isPending} className="rounded-xl">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createDelivery.isPending} className="rounded-xl font-bold">
            {createDelivery.isPending ? "Creating..." : "Create Delivery Challan"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
