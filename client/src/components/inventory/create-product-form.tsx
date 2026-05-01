import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreateProductMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type CreateProductFormProps = {
  onClose: () => void;
};

export function CreateProductForm({ onClose }: CreateProductFormProps) {
  
  const createProduct = useCreateProductMutation();
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    description: "",
    costPrice: "",
    sellingPrice: "",
    material: "",
    color: "",
    status: "ACTIVE",
    lowStockThreshold: "10",
    hsCode: "",
    woodType: "",
    finishType: "",
    assemblyRequired: false,
    warrantyMonths: "",
    leadTimeDays: "",
    isCustomizable: false,
    height: "",
    width: "",
    length: "",
  });
  
  const [variants, setVariants] = useState([{ 
    variantName: "Default", 
    sku: "", 
    barcode: "",
    fabricColor: "",
    woodFinish: "",
    sizeLabel: "",
    hsCode: ""
  }]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.sku || !formData.category || !formData.costPrice || !formData.sellingPrice) {
      toast("Validation failed", { description: "Please fill in all required fields (Name, SKU, Category, Cost, Selling Price)." });
      return;
    }
    
    if (variants.length === 0 || !variants[0].variantName || !variants[0].sku) {
      toast("Validation failed", { description: "Please add at least one variant with a name and SKU." });
      return;
    }

    try {
      await createProduct.mutateAsync({
        name: formData.name,
        sku: formData.sku,
        category: formData.category,
        description: formData.description || undefined,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        material: formData.material || undefined,
        color: formData.color || undefined,
        status: formData.status,
        lowStockThreshold: Number(formData.lowStockThreshold),
        hsCode: formData.hsCode || undefined,
        woodType: formData.woodType || undefined,
        finishType: formData.finishType || undefined,
        assemblyRequired: formData.assemblyRequired,
        warrantyMonths: formData.warrantyMonths ? Number(formData.warrantyMonths) : undefined,
        leadTimeDays: formData.leadTimeDays ? Number(formData.leadTimeDays) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
        width: formData.width ? Number(formData.width) : undefined,
        length: formData.length ? Number(formData.length) : undefined,
        isCustomizable: formData.isCustomizable,
        variants: variants,
      });
      
      toast("Product created", { description: `${formData.name} has been added to the catalog.` });
      onClose();
    } catch (error) {
      toast.error("Creation failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Create New Product</CardTitle>
          <CardDescription>Add a new product and its variants to the catalog.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Input 
            placeholder="Product Name *" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
          <Input 
            placeholder="Master SKU *" 
            value={formData.sku} 
            onChange={(e) => setFormData({ ...formData, sku: e.target.value })} 
          />
          <Input 
            placeholder="Category *" 
            value={formData.category} 
            onChange={(e) => setFormData({ ...formData, category: e.target.value })} 
          />
          <Input 
            placeholder="Cost Price *" 
            type="number" 
            step="0.01" 
            value={formData.costPrice} 
            onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })} 
          />
          <Input 
            placeholder="Selling Price *" 
            type="number" 
            step="0.01" 
            value={formData.sellingPrice} 
            onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })} 
          />
          <Input 
            placeholder="Material" 
            value={formData.material} 
            onChange={(e) => setFormData({ ...formData, material: e.target.value })} 
          />
          <Input 
            placeholder="Color" 
            value={formData.color} 
            onChange={(e) => setFormData({ ...formData, color: e.target.value })} 
          />
          <Input 
            placeholder="HS Code" 
            value={formData.hsCode} 
            onChange={(e) => setFormData({ ...formData, hsCode: e.target.value })} 
          />
          <Input 
            placeholder="Wood Type" 
            value={formData.woodType} 
            onChange={(e) => setFormData({ ...formData, woodType: e.target.value })} 
          />
          <Input 
            placeholder="Finish Type" 
            value={formData.finishType} 
            onChange={(e) => setFormData({ ...formData, finishType: e.target.value })} 
          />
          <Input 
            placeholder="Warranty (Months)" 
            type="number"
            value={formData.warrantyMonths} 
            onChange={(e) => setFormData({ ...formData, warrantyMonths: e.target.value })} 
          />
          <Input 
            placeholder="Lead Time (Days)" 
            type="number"
            value={formData.leadTimeDays} 
            onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })} 
          />
          <div className="grid grid-cols-3 gap-2 lg:col-span-1">
            <Input 
              placeholder="H (in)" 
              type="number"
              value={formData.height} 
              onChange={(e) => setFormData({ ...formData, height: e.target.value })} 
            />
            <Input 
              placeholder="W (in)" 
              type="number"
              value={formData.width} 
              onChange={(e) => setFormData({ ...formData, width: e.target.value })} 
            />
            <Input 
              placeholder="L (in)" 
              type="number"
              value={formData.length} 
              onChange={(e) => setFormData({ ...formData, length: e.target.value })} 
            />
          </div>
          <div className="flex items-center gap-2 px-4 h-11 border border-border bg-white/90 rounded-2xl">
            <input 
              type="checkbox" 
              id="assemblyRequired"
              checked={formData.assemblyRequired} 
              onChange={(e) => setFormData({ ...formData, assemblyRequired: e.target.checked })} 
            />
            <label htmlFor="assemblyRequired" className="text-sm">Assembly Required</label>
          </div>
          <div className="flex items-center gap-2 px-4 h-11 border border-border bg-white/90 rounded-2xl">
            <input 
              type="checkbox" 
              id="isCustomizable"
              checked={formData.isCustomizable} 
              onChange={(e) => setFormData({ ...formData, isCustomizable: e.target.checked })} 
            />
            <label htmlFor="isCustomizable" className="text-sm">Is Customizable</label>
          </div>
          <Input 
            placeholder="Low Stock Threshold" 
            type="number" 
            value={formData.lowStockThreshold} 
            onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })} 
          />
          <select 
            className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="DRAFT">DRAFT</option>
            <option value="DISCONTINUED">DISCONTINUED</option>
          </select>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Variants</h4>
            <Button 
              variant="outline" 
              onClick={() => setVariants([...variants, { 
                variantName: "", 
                sku: "", 
                barcode: "",
                fabricColor: "",
                woodFinish: "",
                sizeLabel: "",
                hsCode: ""
              }])}
            >
              Add Variant
            </Button>
          </div>
          {variants.map((variant, index) => (
            <div key={index} className="grid gap-3 md:grid-cols-3 items-center">
              <Input 
                placeholder="Variant Name *" 
                value={variant.variantName} 
                onChange={(e) => {
                  const newVariants = [...variants];
                  newVariants[index].variantName = e.target.value;
                  setVariants(newVariants);
                }} 
              />
              <Input 
                placeholder="Variant SKU *" 
                value={variant.sku} 
                onChange={(e) => {
                  const newVariants = [...variants];
                  newVariants[index].sku = e.target.value;
                  setVariants(newVariants);
                }} 
              />
              <div className="flex gap-2">
                <Input 
                  placeholder="Barcode (Optional)" 
                  value={variant.barcode} 
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].barcode = e.target.value;
                    setVariants(newVariants);
                  }} 
                />
                {variants.length > 1 && (
                  <Button 
                    variant="outline" 
                    className="text-red-500 hover:text-red-600"
                    onClick={() => {
                      const newVariants = [...variants];
                      newVariants.splice(index, 1);
                      setVariants(newVariants);
                    }}
                  >
                    X
                  </Button>
                )}
              </div>
              <div className="grid gap-2 grid-cols-2 md:grid-cols-4 col-span-3">
                <Input 
                  placeholder="Fabric Color" 
                  value={variant.fabricColor} 
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].fabricColor = e.target.value;
                    setVariants(newVariants);
                  }} 
                />
                <Input 
                  placeholder="Wood Finish" 
                  value={variant.woodFinish} 
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].woodFinish = e.target.value;
                    setVariants(newVariants);
                  }} 
                />
                <Input 
                  placeholder="Size Label" 
                  value={variant.sizeLabel} 
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].sizeLabel = e.target.value;
                    setVariants(newVariants);
                  }} 
                />
                <Input 
                  placeholder="Variant HS Code" 
                  value={variant.hsCode} 
                  onChange={(e) => {
                    const newVariants = [...variants];
                    newVariants[index].hsCode = e.target.value;
                    setVariants(newVariants);
                  }} 
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={createProduct.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createProduct.isPending}>
            {createProduct.isPending ? "Creating..." : "Save Product"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
