import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useRecordPaymentMutation, useInvoicesQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { formatCurrency, toNumber } from "@/lib/utils";

type RecordPaymentFormProps = {
  onClose: () => void;
};

export function RecordPaymentForm({ onClose }: RecordPaymentFormProps) {
  const { push } = useToast();
  const recordPayment = useRecordPaymentMutation();
  const invoices = useInvoicesQuery();
  
  const [formData, setFormData] = useState({
    invoiceId: "",
    amount: "",
    method: "BANK_TRANSFER",
    paymentDate: new Date().toISOString().split("T")[0],
    reference: "",
    note: "",
  });

  const handleSubmit = async () => {
    if (!formData.invoiceId || !formData.amount) {
      push("Validation failed", "Please select an invoice and enter a payment amount.");
      return;
    }

    try {
      await recordPayment.mutateAsync({
        invoiceId: formData.invoiceId,
        amount: Number(formData.amount),
        method: formData.method,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : undefined,
        reference: formData.reference || undefined,
        note: formData.note || undefined,
      });
      
      push("Payment recorded", `The payment has been successfully recorded.`);
      onClose();
    } catch (error) {
      push("Recording failed", getErrorMessage(error, "Unable to record payment."));
    }
  };

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>Record Payment</CardTitle>
          <CardDescription>Log a payment against an existing invoice.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Invoice *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.invoiceId}
              onChange={(e) => {
                const invoiceId = e.target.value;
                setFormData({ ...formData, invoiceId });
              }}
            >
              <option value="">Select an invoice</option>
              {invoices.data?.items.map(inv => (
                <option key={inv.id} value={inv.id}>{inv.invoiceNumber} - Balance: {formatCurrency(toNumber(inv.balance))}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method *</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={formData.method}
              onChange={(e) => setFormData({ ...formData, method: e.target.value })}
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CREDIT_CARD">Credit Card</option>
              <option value="CASH">Cash</option>
              <option value="CHECK">Check</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Date *</label>
            <NepaliDatePickerInput 
              value={formData.paymentDate} 
              onChange={(date) => setFormData({ ...formData, paymentDate: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount Received *</label>
            <Input 
              type="number"
              step="0.01"
              value={formData.amount} 
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })} 
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Reference Code (Txn ID, Check #)</label>
            <Input 
              placeholder="e.g. TXN-987654321" 
              value={formData.reference} 
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })} 
            />
          </div>
          <Input 
            className="md:col-span-2 lg:col-span-3 mt-4"
            placeholder="Additional Notes" 
            value={formData.note} 
            onChange={(e) => setFormData({ ...formData, note: e.target.value })} 
          />
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={onClose} disabled={recordPayment.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={recordPayment.isPending}>
            {recordPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
