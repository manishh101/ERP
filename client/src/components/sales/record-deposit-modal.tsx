import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRecordSalesOrderDepositMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

type RecordDepositModalProps = {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  defaultAmount?: number;
};

export function RecordDepositModal({ orderId, orderNumber, onClose, defaultAmount }: RecordDepositModalProps) {

  const recordDeposit = useRecordSalesOrderDepositMutation();
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast("Validation failed", { description: "Please enter a valid deposit amount." });
      return;
    }

    try {
      await recordDeposit.mutateAsync({
        id: orderId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
      });

      toast("Deposit recorded", { description: `The deposit for order ${orderNumber} has been successfully recorded.` });
      onClose();
    } catch (error) {
      toast.error("Recording failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Enter the deposit amount received for order <strong>{orderNumber}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
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
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={recordDeposit.isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={recordDeposit.isPending}>
            {recordDeposit.isPending ? "Recording..." : "Confirm Deposit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
