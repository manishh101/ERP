import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateTaxRateMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type CreateTaxRateFormProps = {
  onClose: () => void;
};

export function CreateTaxRateForm({ onClose }: CreateTaxRateFormProps) {
  const { push } = useToast();
  const createTaxRate = useCreateTaxRateMutation();
  
  const [formData, setFormData] = useState({
    name: "",
    category: "VAT",
    rate: 13,
    isDefault: false,
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      push("Validation failed", "Please provide a name and category for the tax rate.");
      return;
    }

    try {
      await createTaxRate.mutateAsync({
        name: formData.name,
        category: formData.category,
        rate: Number(formData.rate),
        isDefault: formData.isDefault,
      });
      
      push("Tax rate added", `The tax rate ${formData.name} was added successfully.`);
      onClose();
    } catch (error) {
      push("Creation failed", getErrorMessage(error, "Unable to add tax rate."));
    }
  };

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h4 className="font-semibold text-primary">Add New Tax Rate</h4>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Tax name *</label>
          <Input 
            placeholder="e.g. Standard VAT" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Category *</label>
          <Input 
            placeholder="e.g. VAT, GST, Sales Tax" 
            value={formData.category} 
            onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Rate (%) *</label>
          <Input 
            type="number"
            placeholder="e.g. 13" 
            value={formData.rate} 
            onChange={(e) => setFormData({ ...formData, rate: Number(e.target.value) })} 
          />
        </div>

        <div className="space-y-2 flex items-center pt-8">
          <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="h-4 w-4"
            />
            Set as default tax rate
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onClose} disabled={createTaxRate.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={createTaxRate.isPending}>
          {createTaxRate.isPending ? "Adding..." : "Add Tax Rate"}
        </Button>
      </div>
    </div>
  );
}
