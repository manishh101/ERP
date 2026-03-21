import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateDeliveryMutation, useSalesOrdersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type ScheduleDeliveryFormProps = {
  onClose: () => void;
};

export function ScheduleDeliveryForm({ onClose }: ScheduleDeliveryFormProps) {
  const { push } = useToast();
  const createDelivery = useCreateDeliveryMutation();
  const salesOrders = useSalesOrdersQuery();
  
  const [formData, setFormData] = useState({
    soId: "",
    driverId: "",
    vehicle: "",
    status: "SCHEDULED",
    scheduledDate: new Date().toISOString().split("T")[0],
    deliveryAddress: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!formData.soId || !formData.deliveryAddress) {
      push("Validation failed", "Please select a Sales Order and enter a Delivery Address.");
      return;
    }

    try {
      await createDelivery.mutateAsync({
        soId: formData.soId,
        driverId: formData.driverId || undefined,
        vehicle: formData.vehicle || undefined,
        status: formData.status,
        scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : new Date().toISOString(),
        deliveryAddress: formData.deliveryAddress,
        notes: formData.notes || undefined,
      });
      
      push("Delivery Scheduled", `The delivery route has been successfully scheduled.`);
      onClose();
    } catch (error) {
      push("Scheduling failed", getErrorMessage(error, "Unable to schedule delivery."));
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Schedule Delivery</CardTitle>
          <CardDescription>Assign a sales order to a delivery route and driver.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Sales Order *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.soId}
              onChange={(e) => {
                const soId = e.target.value;
                setFormData({ ...formData, soId });
              }}
            >
              <option value="">Select a ready sales order</option>
              {salesOrders.data?.items.filter(so => so.status !== "QUOTE").map(so => (
                <option key={so.id} value={so.id}>{so.id} - {so.customer}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Scheduled Date *</label>
            <NepaliDatePickerInput 
              value={formData.scheduledDate} 
              onChange={(date) => setFormData({ ...formData, scheduledDate: date.toISOString().split("T")[0] })} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Driver Assignment</label>
            <Input 
              placeholder="Driver's Name or ID" 
              value={formData.driverId} 
              onChange={(e) => setFormData({ ...formData, driverId: e.target.value })} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Vehicle / Route</label>
            <Input 
              placeholder="e.g. Van 2 - North Route" 
              value={formData.vehicle} 
              onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })} 
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
            </select>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <label className="text-sm font-medium">Delivery Address *</label>
            <Input 
              placeholder="Full shipping address" 
              value={formData.deliveryAddress} 
              onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })} 
            />
          </div>

          <Input 
            className="md:col-span-2 lg:col-span-3 mt-4"
            placeholder="Delivery Notes / Instructions" 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
          />
        </div>

        <div className="flex gap-3 justify-end mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={createDelivery.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createDelivery.isPending}>
            {createDelivery.isPending ? "Scheduling..." : "Schedule Delivery"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
