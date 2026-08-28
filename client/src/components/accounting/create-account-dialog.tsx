import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useCreateAccountMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type CreateAccountDialogProps = {
  onClose: () => void;
};

export function CreateAccountDialog({ onClose }: CreateAccountDialogProps) {
  const createAccount = useCreateAccountMutation();
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "ASSET" as "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      toast.error("Validation failed", { description: "Please provide both account code and account name." });
      return;
    }

    try {
      await createAccount.mutateAsync({
        code: formData.code.trim(),
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim() || undefined,
      });

      toast.success("Account Created", { description: `Account ${formData.code} - ${formData.name} added to Chart of Accounts.` });
      onClose();
    } catch (error) {
      toast.error("Account Creation Failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-lg bg-white shadow-xl">
        <CardHeader>
          <CardTitle>Add New Account</CardTitle>
          <CardDescription>Add a new General Ledger account to your Chart of Accounts.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Code *</label>
                <Input
                  placeholder="e.g. 1020"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type *</label>
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                >
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="INCOME">INCOME</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Account Name *</label>
              <Input
                placeholder="e.g. Petty Cash Account"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Input
                placeholder="e.g. For daily office expense disburshments"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose} disabled={createAccount.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAccount.isPending} className="bg-primary text-white">
                {createAccount.isPending ? "Creating..." : "Save Account"}
              </Button>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
