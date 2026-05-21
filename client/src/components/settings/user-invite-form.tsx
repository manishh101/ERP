import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useInviteUserMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type UserInviteFormProps = {
  onClose: () => void;
};

export function UserInviteForm({ onClose }: UserInviteFormProps) {
  
  const inviteUser = useInviteUserMutation();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "", // Optional, server might handle it
    role: "SALES",
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast("Validation failed", { description: "Please provide all required fields." });
      return;
    }

    if (formData.password.length < 8) {
      toast("Validation failed", { description: "Password must be at least 8 characters long." });
      return;
    }

    try {
      await inviteUser.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role as any,
        isActive: true,
      });
      
      toast("User invited", { description: `An invitation has been sent to ${formData.email}.` });
      onClose();
    } catch (error) {
      toast.error("Invitation failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
      <h4 className="font-semibold text-primary">Invite New Team Member</h4>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Full Name *</label>
          <Input 
            placeholder="e.g. John Doe" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Email Address *</label>
          <Input 
            type="email"
            placeholder="e.g. john@example.com" 
            value={formData.email} 
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Role</label>
          <select 
            className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="ACCOUNTANT">ACCOUNTANT</option>
            <option value="SALES">SALES</option>
            <option value="WAREHOUSE">WAREHOUSE</option>
            <option value="DRIVER">DRIVER</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Temp Password *</label>
          <Input 
            type="password"
            placeholder="Min 8 characters" 
            value={formData.password} 
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} 
          />
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button variant="outline" onClick={onClose} disabled={inviteUser.isPending}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={inviteUser.isPending}>
          {inviteUser.isPending ? "Inviting..." : "Invite User"}
        </Button>
      </div>
    </div>
  );
}
