import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useRecordSalesOrderDepositMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type RecordDepositModalProps = {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
};

export function RecordDepositModal({ orderId, orderNumber, onClose }: RecordDepositModalProps) {
  const { push } = useToast();
  const recordDeposit = useRecordSalesOrderDepositMutation();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      push("Validation failed", "Please enter a valid deposit amount.");
      return;
    }

    try {
      await recordDeposit.mutateAsync({
        id: orderId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
      });
      
      push("Deposit recorded", `The deposit for order ${orderNumber} has been successfully recorded.`);
      onClose();
    } catch (error) {
      push("Recording failed", getErrorMessage(error, "Unable to record deposit."));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-6">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <div>
            <CardTitle>Record Deposit</CardTitle>
            <CardDescription className="mt-2">Enter the deposit amount received for order <strong>{orderNumber}</strong>.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Deposit Amount *</label>
            <Input 
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method *</label>
              <select 
                className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="BANK">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="QR">QR Payment</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Reference</label>
              <Input 
                placeholder="Ref # / Note"
                value={reference} 
                onChange={(e) => setReference(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={onClose} disabled={recordDeposit.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={recordDeposit.isPending}>
              {recordDeposit.isPending ? "Recording..." : "Confirm Deposit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
