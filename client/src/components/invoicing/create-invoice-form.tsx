import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateInvoiceMutation, useSalesOrdersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CreateInvoiceFormProps = {
  onClose: () => void;
};

export function CreateInvoiceForm({ onClose }: CreateInvoiceFormProps) {
  const { push } = useToast();
  const createInvoice = useCreateInvoiceMutation();
  const salesOrders = useSalesOrdersQuery();
  
  const [formData, setFormData] = useState({
    soId: "",
    issueDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    status: "DRAFT",
    invoiceAmount: "0",
    taxAmount: "0",
    invoiceType: "VAT",
    notes: "",
    bsDate: "",
    fiscalYear: "",
  });

  const handleSubmit = async () => {
    if (!formData.soId || !formData.invoiceAmount) {
      push("Validation failed", "Please select a sales order and enter a total amount.");
      return;
    }

    try {
      await createInvoice.mutateAsync({
        soId: formData.soId,
        issueDate: formData.issueDate ? new Date(formData.issueDate).toISOString() : undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        status: formData.status,
        invoiceAmount: Number(formData.invoiceAmount),
        taxAmount: Number(formData.taxAmount),
        invoiceType: formData.invoiceType,
        notes: formData.notes || undefined,
        bsDate: formData.bsDate || undefined,
        fiscalYear: formData.fiscalYear || undefined,
      });
      
      push("Invoice created", `Invoice generated successfully.`);
      onClose();
    } catch (error) {
      push("Creation failed", getErrorMessage(error, "Unable to create invoice."));
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Create Invoice</CardTitle>
          <CardDescription>Generate an invoice for an existing sales order.</CardDescription>
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
                // Simple auto-fill for total based on sales order items, ideally backend calculates
              }}
            >
              <option value="">Select a sales order</option>
              {salesOrders.data?.items.map(so => (
                <option key={so.id} value={so.id}>{so.id} - {so.customer}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SENT">SENT</option>
              <option value="PAID">PAID</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Issue Date</label>
            <NepaliDatePickerInput 
              value={formData.issueDate} 
              onChange={(date) => setFormData({ ...formData, issueDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date</label>
            <NepaliDatePickerInput 
              value={formData.dueDate} 
              onChange={(date) => setFormData({ ...formData, dueDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Amount *</label>
            <Input 
              type="number"
              step="0.01"
              value={formData.invoiceAmount} 
              onChange={(e) => setFormData({ ...formData, invoiceAmount: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tax Amount</label>
            <Input 
              type="number"
              step="0.01"
              value={formData.taxAmount} 
              onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Invoice Type</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.invoiceType}
              onChange={(e) => setFormData({ ...formData, invoiceType: e.target.value })}
            >
              <option value="NONE">No Tax</option>
              <option value="VAT">VAT</option>
              <option value="PAN">PAN</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">B.S. Date (e.g. 2080-12-01)</label>
            <Input 
              placeholder="YYYY-MM-DD"
              value={formData.bsDate} 
              onChange={(e) => setFormData({ ...formData, bsDate: e.target.value })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Fiscal Year (e.g. 2080/81)</label>
            <Input 
              placeholder="YYYY/YY"
              value={formData.fiscalYear} 
              onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })} 
            />
          </div>
          <Input 
            className="md:col-span-1 lg:col-span-1"
            placeholder="Invoice Notes / Payment Terms" 
            value={formData.notes} 
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })} 
          />
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={createInvoice.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createInvoice.isPending}>
            {createInvoice.isPending ? "Creating..." : "Save Invoice"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
