import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateCustomerMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type CreateCustomerFormProps = {
  onClose: () => void;
};

export function CreateCustomerForm({ onClose }: CreateCustomerFormProps) {
  const { push } = useToast();
  const createCustomer = useCreateCustomerMutation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "RETAIL",
    creditLimit: "0",
    address: "",
    panNo: "",
    vatNo: "",
    invoicePref: "NONE",
    district: "",
    ward: "",
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      push("Validation failed", "Please fill in all required fields (Name, Address).");
      return;
    }

    try {
      await createCustomer.mutateAsync({
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
      });
      
      push("Customer created", `${formData.name} has been added to the system.`);
      onClose();
    } catch (error) {
      push("Creation failed", getErrorMessage(error, "Unable to create customer."));
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input 
            placeholder="Customer Name *" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
          <div className="space-y-2">
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="RETAIL">RETAIL</option>
              <option value="TRADE">TRADE</option>
              <option value="CONTRACTOR">CONTRACTOR</option>
            </select>
          </div>
          <Input 
            placeholder="Credit Limit *" 
            type="number"
            step="0.01"
            value={formData.creditLimit} 
            onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} 
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
            className="md:col-span-1 lg:col-span-1"
            placeholder="Full Address *" 
            value={formData.address} 
            onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
          />
          <Input 
            placeholder="District" 
            value={formData.district} 
            onChange={(e) => setFormData({ ...formData, district: e.target.value })} 
          />
          <Input 
            placeholder="Ward No." 
            value={formData.ward} 
            onChange={(e) => setFormData({ ...formData, ward: e.target.value })} 
          />
          <Input 
            placeholder="PAN Number" 
            value={formData.panNo} 
            onChange={(e) => setFormData({ ...formData, panNo: e.target.value })} 
          />
          <Input 
            placeholder="VAT Number" 
            value={formData.vatNo} 
            onChange={(e) => setFormData({ ...formData, vatNo: e.target.value })} 
          />
          <div className="space-y-2">
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
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
