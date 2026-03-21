import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useRecordPaymentMutation, useSalesOrdersQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { formatCurrency, toNumber } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL } from "@/lib/api";
import { Download, CheckCircle2 } from "lucide-react";

type RecordPaymentFormProps = {
  onClose: () => void;
};

export function RecordPaymentForm({ onClose }: RecordPaymentFormProps) {
  const { push } = useToast();
  const recordPayment = useRecordPaymentMutation();
  const salesOrders = useSalesOrdersQuery();
  
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    salesOrderId: "",
    amount: "",
    method: "BANK_TRANSFER",
    paymentDate: new Date().toISOString().split("T")[0],
    reference: "",
    note: "",
  });
  const [downloadLink, setDownloadLink] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!formData.salesOrderId || !formData.amount) {
      push("Validation failed", "Please select a sales order and enter a payment amount.");
      return;
    }

    try {
      const payment = await recordPayment.mutateAsync({
        salesOrderId: formData.salesOrderId,
        amount: Number(formData.amount),
        method: formData.method,
        paymentDate: formData.paymentDate ? new Date(formData.paymentDate).toISOString() : undefined,
        reference: formData.reference || undefined,
        note: formData.note || undefined,
      });
      
      push("Payment recorded", `The payment has been successfully recorded.`);
      
      // Get download token
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const tokenRes = await fetch(`${baseUrl}/auth/download-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (tokenRes.ok) {
        const { token: downloadToken } = await tokenRes.json();
        setDownloadLink(`${baseUrl}/payments/${payment.id}/receipt?token=${downloadToken}`);
      }
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
        {downloadLink ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4 bg-emerald-50 rounded-3xl border border-emerald-200">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <div className="text-center">
              <p className="font-semibold text-emerald-900">Success!</p>
              <p className="text-sm text-emerald-700">Payment has been recorded.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>Done</Button>
              <Button onClick={() => window.open(downloadLink, "_blank")}>
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* ... existing form fields ... */}
              {/* I'll keep the same fields but wrapped in this condition */}
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Sales Order *</label>
                <select 
                  className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
                  value={formData.salesOrderId}
                  onChange={(e) => {
                    const salesOrderId = e.target.value;
                    setFormData({ ...formData, salesOrderId });
                  }}
                >
                  <option value="">Select an order</option>
                  {salesOrders.data?.items.map(so => (
                    <option key={so.id} value={so.id}>{so.id} - {so.customer} - Balance: {formatCurrency(toNumber(so.balanceDue))}</option>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
