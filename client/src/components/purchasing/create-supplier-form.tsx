import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreateSupplierMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type CreateSupplierFormProps = {
  onClose: () => void;
};

export function CreateSupplierForm({ onClose }: CreateSupplierFormProps) {
  
  const createSupplier = useCreateSupplierMutation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    country: "",
    taxNumber: "",
    leadTimeDays: "14",
    isActive: true,
    notes: "",
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.country || !formData.leadTimeDays) {
      toast("Validation failed", { description: "Please fill in all required fields (Name, Country, Lead Time)." });
      return;
    }

    try {
      await createSupplier.mutateAsync({
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        country: formData.country,
        taxNumber: formData.taxNumber || undefined,
        leadTimeDays: Number(formData.leadTimeDays),
        isActive: formData.isActive,
        notes: formData.notes || undefined,
      });
      
      toast("Supplier created", { description: `${formData.name} has been added to the system.` });
      onClose();
    } catch (error) {
      toast.error("Creation failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Register New Supplier</CardTitle>
          <CardDescription>Add a new supplier to enable purchase order generation.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input 
            placeholder="Supplier Name *" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
          <Input 
            placeholder="Country *" 
            value={formData.country} 
            onChange={(e) => setFormData({ ...formData, country: e.target.value })} 
          />
          <Input 
            placeholder="Lead Time (Days) *" 
            type="number"
            value={formData.leadTimeDays} 
            onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })} 
          />
          <Input 
            placeholder="Email Address" 
            type="email"
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
          />
          <Input 
            placeholder="Phone Number" 
            value={formData.phone} 
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
          />
          <Input 
            placeholder="Tax Identification Number" 
            value={formData.taxNumber} 
            onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })} 
          />
          <Input 
            className="md:col-span-2 lg:col-span-3"
            placeholder="Full Business Address" 
            value={formData.address} 
            onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
          />
          <Input 
            className="md:col-span-2 lg:col-span-3"
            placeholder="Additional Notes" 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
          />
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={createSupplier.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createSupplier.isPending}>
            {createSupplier.isPending ? "Creating..." : "Save Supplier"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
