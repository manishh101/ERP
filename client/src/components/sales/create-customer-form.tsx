import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreateCustomerMutation, useUpdateCustomerMutation, type RawCustomer } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type CreateCustomerFormProps = {
  onClose: () => void;
  initialData?: RawCustomer;
};

export function CreateCustomerForm({ onClose, initialData }: CreateCustomerFormProps) {
  
  const createCustomer = useCreateCustomerMutation();
  const updateCustomer = useUpdateCustomerMutation();
  const isEditing = !!initialData;

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    type: initialData?.type || "RETAIL",
    creditLimit: initialData?.creditLimit.toString() || "0",
    address: initialData?.address || "",
    panNo: initialData?.panNo || "",
    vatNo: initialData?.vatNo || "",
    invoicePref: initialData?.invoicePref || "NONE",
    district: initialData?.district || "",
    ward: initialData?.ward || "",
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      toast("Validation failed", { description: "Please fill in all required fields (Name, Address)." });
      return;
    }

    const payload = {
      name: formData.name,
      email: formData.email || undefined,
      phone: formData.phone || undefined,
      type: formData.type,
      creditLimit: Number(formData.creditLimit),
      address: formData.address,
      panNo: formData.panNo || undefined,
      vatNo: formData.vatNo || undefined,
      invoicePref: formData.invoicePref,
      district: formData.district || undefined,
      ward: formData.ward || undefined,
    };

    try {
      if (isEditing) {
        await updateCustomer.mutateAsync({ id: initialData!.id, payload });
        toast("Customer updated", { description: `${formData.name} has been updated.` });
      } else {
        await createCustomer.mutateAsync(payload);
        toast("Customer created", { description: `${formData.name} has been added to the system.` });
      }
      onClose();
    } catch (error) {
      toast.error(isEditing ? "Update failed" : "Creation failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Register New Customer</CardTitle>
          <CardDescription>Add a new customer to create sales orders and quotes.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label htmlFor="customer-name" className="text-xs font-semibold text-muted-foreground">Customer Name *</label>
            <Input 
              id="customer-name"
              placeholder="Customer Name *" 
              aria-label="Customer Name"
              value={formData.name} 
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-type" className="text-xs font-semibold text-muted-foreground">Customer Type</label>
            <select 
              id="customer-type"
              aria-label="Customer Type"
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-800"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="RETAIL">RETAIL</option>
              <option value="SHOWROOM">SHOWROOM</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-credit-limit" className="text-xs font-semibold text-muted-foreground">Credit Limit *</label>
            <Input 
              id="customer-credit-limit"
              placeholder="Credit Limit *" 
              aria-label="Credit Limit"
              type="number"
              step="0.01"
              value={formData.creditLimit} 
              onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-email" className="text-xs font-semibold text-muted-foreground">Email Address</label>
            <Input 
              id="customer-email"
              placeholder="Email Address" 
              aria-label="Email Address"
              type="email"
              value={formData.email} 
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-phone" className="text-xs font-semibold text-muted-foreground">Phone Number</label>
            <Input 
              id="customer-phone"
              placeholder="Phone Number" 
              aria-label="Phone Number"
              value={formData.phone} 
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
            />
          </div>
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label htmlFor="customer-address" className="text-xs font-semibold text-muted-foreground">Full Address *</label>
            <Input 
              id="customer-address"
              placeholder="Full Address *" 
              aria-label="Full Address"
              value={formData.address} 
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-district" className="text-xs font-semibold text-muted-foreground">District</label>
            <Input 
              id="customer-district"
              placeholder="District" 
              aria-label="District"
              value={formData.district} 
              onChange={(e) => setFormData({ ...formData, district: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-ward" className="text-xs font-semibold text-muted-foreground">Ward No.</label>
            <Input 
              id="customer-ward"
              placeholder="Ward No." 
              aria-label="Ward Number"
              value={formData.ward} 
              onChange={(e) => setFormData({ ...formData, ward: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-pan" className="text-xs font-semibold text-muted-foreground">PAN Number</label>
            <Input 
              id="customer-pan"
              placeholder="PAN Number" 
              aria-label="PAN Number"
              value={formData.panNo} 
              onChange={(e) => setFormData({ ...formData, panNo: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-vat" className="text-xs font-semibold text-muted-foreground">VAT Number</label>
            <Input 
              id="customer-vat"
              placeholder="VAT Number" 
              aria-label="VAT Number"
              value={formData.vatNo} 
              onChange={(e) => setFormData({ ...formData, vatNo: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="customer-invoice-pref" className="text-xs font-semibold text-muted-foreground">Tax Preference</label>
            <select 
              id="customer-invoice-pref"
              aria-label="Invoice Preference"
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-zinc-800"
              value={formData.invoicePref}
              onChange={(e) => setFormData({ ...formData, invoicePref: e.target.value })}
            >
              <option value="NONE">No Default Tax Type</option>
              <option value="VAT">Default to VAT</option>
              <option value="PAN">Default to PAN</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={createCustomer.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createCustomer.isPending}>
            {createCustomer.isPending ? "Creating..." : "Save Customer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
