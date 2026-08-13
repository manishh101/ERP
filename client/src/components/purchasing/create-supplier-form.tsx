import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useCreateSupplierMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { Building2, User, Phone, Mail, MapPin, CreditCard, Calendar, FileText, Globe, Hash } from "lucide-react";

type CreateSupplierFormProps = {
  onClose: () => void;
};

export function CreateSupplierForm({ onClose }: CreateSupplierFormProps) {
  const createSupplier = useCreateSupplierMutation();
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    email: "",
    phone: "",
    panNo: "",
    vatNo: "",
    address: "",
    country: "Nepal",
    paymentTerms: "Cash/Credit",
    leadTimeDays: "7",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Validation failed", { description: "Supplier Name is required." });
      return;
    }

    if (!formData.country.trim()) {
      toast.error("Validation failed", { description: "Country is required." });
      return;
    }

    try {
      await createSupplier.mutateAsync({
        name: formData.name.trim(),
        contact: formData.contact.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        panNo: formData.panNo.trim() || undefined,
        vatNo: formData.vatNo.trim() || undefined,
        country: formData.country.trim(),
        paymentTerms: formData.paymentTerms.trim() || "Cash/Credit",
        leadTimeDays: Number(formData.leadTimeDays) || 7,
        notes: formData.notes.trim() || undefined,
      });

      toast.success("Supplier created", { description: `${formData.name} has been successfully added.` });
      onClose();
    } catch (error) {
      toast.error("Creation failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-6 pt-2 pb-6">
      {/* Section 1: Business Identification */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1.5">
          <Building2 className="h-4 w-4" />
          <span>Business Identification</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Supplier / Company Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Gajlaxmi Steel & Hardware Pvt. Ltd."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Hash className="h-3 w-3" /> PAN Number
              </label>
              <Input
                placeholder="e.g. 600123456"
                value={formData.panNo}
                onChange={(e) => setFormData({ ...formData, panNo: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Hash className="h-3 w-3" /> VAT Number (Optional)
              </label>
              <Input
                placeholder="e.g. 600123456"
                value={formData.vatNo}
                onChange={(e) => setFormData({ ...formData, vatNo: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Contact Person & Details */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1.5">
          <User className="h-4 w-4" />
          <span>Contact Person & Info</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Contact Person Name
            </label>
            <Input
              placeholder="e.g. Ram Kumar Sharma (Sales Manager)"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Contact / Mobile No.
              </label>
              <Input
                placeholder="e.g. +977-9851023456"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email Address
              </label>
              <Input
                placeholder="e.g. supplier@company.com"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Location & Address */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1.5">
          <MapPin className="h-4 w-4" />
          <span>Location & Business Address</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Physical Location / Address
            </label>
            <Input
              placeholder="e.g. Main Industrial Zone, Ward 4, Biratnagar"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Globe className="h-3 w-3" /> Country <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Nepal"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Section 4: Purchasing & Payment Terms */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1.5">
          <CreditCard className="h-4 w-4" />
          <span>Commercial & Supply Settings</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Lead Time (Days) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              min="0"
              placeholder="e.g. 7"
              value={formData.leadTimeDays}
              onChange={(e) => setFormData({ ...formData, leadTimeDays: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Payment Terms
            </label>
            <Input
              placeholder="e.g. Net 30, Cash, Credit 15 Days"
              value={formData.paymentTerms}
              onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Section 5: Internal Notes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary border-b pb-1.5">
          <FileText className="h-4 w-4" />
          <span>Additional Notes</span>
        </div>

        <div>
          <Textarea
            placeholder="Special purchasing requirements, bank details, or internal notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="min-h-[80px]"
          />
        </div>
      </div>

      {/* Form Action Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={createSupplier.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={createSupplier.isPending}>
          {createSupplier.isPending ? "Creating..." : "Save Supplier"}
        </Button>
      </div>
    </div>
  );
}

