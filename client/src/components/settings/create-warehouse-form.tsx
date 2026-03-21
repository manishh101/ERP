import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateWarehouseMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type CreateWarehouseFormProps = {
  onClose: () => void;
};

export function CreateWarehouseForm({ onClose }: CreateWarehouseFormProps) {
  const { push } = useToast();
  const createWarehouse = useCreateWarehouseMutation();
  
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    type: "STORAGE",
    isActive: true,
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.location) {
      push("Validation failed", "Please provide a name and location for the warehouse.");
      return;
    }

    try {
      await createWarehouse.mutateAsync({
        name: formData.name,
        location: formData.location,
        type: formData.type,
        isActive: formData.isActive,
      });
      
      push("Warehouse created", `The warehouse was added successfully.`);
      onClose();
    } catch (error) {
      push("Creation failed", getErrorMessage(error, "Unable to create warehouse."));
    }
  };

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h4 className="font-semibold">Add New Warehouse</h4>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Warehouse Name *</label>
          <Input 
            placeholder="e.g. Main Distribution Center" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Location *</label>
          <Input 
            placeholder="e.g. 123 Industrial Blvd" 
            value={formData.location} 
            onChange={(e) => setFormData({ ...formData, location: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <select 
            className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="STORAGE">STORAGE</option>
            <option value="SHOWROOM">SHOWROOM</option>
            <option value="TRANSIT">TRANSIT</option>
          </select>
        </div>

        <div className="space-y-2 flex items-center pt-8">
          <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
            <input 
              type="checkbox" 
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4"
            />
            Active Configuration
          </label>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onClose} disabled={createWarehouse.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={createWarehouse.isPending}>
          {createWarehouse.isPending ? "Adding..." : "Add Warehouse"}
        </Button>
      </div>
    </div>
  );
}
