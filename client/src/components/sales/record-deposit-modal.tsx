import { useState, useMemo } from "react";
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
import { formatCurrency, toNumber } from "@/lib/utils";
import { CreditCard, DollarSign, Info } from "lucide-react";

type RecordDepositModalProps = {
  orderId: string;
  orderNumber: string;
  onClose: () => void;
  defaultAmount?: number;
};

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK", label: "Bank Transfer" },
  { value: "QR", label: "QR / Fonepay" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "POS / Card" },
  { value: "INSTALLMENT", label: "Installment Plan" },
];

export function RecordDepositModal({
  orderId,
  orderNumber,
  onClose,
  defaultAmount,
}: RecordDepositModalProps) {
  const recordDeposit = useRecordSalesOrderDepositMutation();
  const maxOutstanding = defaultAmount ?? 0;

  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");

  const numAmount = toNumber(amount);
  const remainingAfter = Math.max(0, maxOutstanding - numAmount);

  const handlePreset = (pct: number) => {
    if (maxOutstanding <= 0) return;
    const computed = (maxOutstanding * (pct / 100)).toFixed(2);
    setAmount(String(Math.round(Number(computed) * 100) / 100));
  };

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Validation failed", { description: "Please enter a valid deposit payment amount." });
      return;
    }

    try {
      await recordDeposit.mutateAsync({
        id: orderId,
        amount: Number(amount),
        method,
        reference: reference || undefined,
      });

      toast.success("Payment recorded", {
        description: `Payment of ${formatCurrency(Number(amount))} recorded for order #${orderNumber}. AR ledger credited.`,
      });
      onClose();
    } catch (error) {
      toast.error("Recording failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </span>
            <DialogTitle className="text-lg font-bold">Record Customer Payment</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Log deposit or progress payment for Order <strong>#{orderNumber}</strong>. Updates the AR
            ledger atomically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Outstanding Balance Banner */}
          {maxOutstanding > 0 && (
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 text-xs">
              <span className="text-muted-foreground font-medium">Current Balance Due:</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(maxOutstanding)}
              </span>
            </div>
          )}

          {/* Amount and Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="deposit-amount-input" className="text-xs font-semibold text-foreground">Payment Amount (Rs.) *</label>
              {maxOutstanding > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 rounded-md"
                    onClick={() => handlePreset(25)}
                  >
                    25%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 rounded-md"
                    onClick={() => handlePreset(50)}
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2 rounded-md text-emerald-600 font-bold"
                    onClick={() => handlePreset(100)}
                  >
                    Full ({formatCurrency(maxOutstanding)})
                  </Button>
                </div>
              )}
            </div>

            <Input
              id="deposit-amount-input"
              type="number"
              step="0.01"
              autoFocus
              placeholder="0.00"
              aria-label="Payment Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
              className="h-11 rounded-xl text-base font-bold"
            />

            {maxOutstanding > 0 && numAmount > 0 && (
              <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
                <span>New balance after payment:</span>
                <span className="font-semibold text-foreground">{formatCurrency(remainingAfter)}</span>
              </div>
            )}
          </div>

          {/* Payment Method & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="deposit-payment-mode" className="text-xs font-medium">Payment Mode *</label>
              <select
                id="deposit-payment-mode"
                aria-label="Payment Mode"
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="deposit-reference-input" className="text-xs font-medium">Reference / Note</label>
              <Input
                id="deposit-reference-input"
                placeholder="Cheque #, txn ref, note"
                aria-label="Reference or Note"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="h-11 rounded-xl text-xs"
              />
            </div>
          </div>

          {/* AR Ledger Notice */}
          <div className="flex items-start gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-[11px] text-emerald-800 dark:text-emerald-200">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              This logs a financial payment against Sales Order #{orderNumber}, updates customer AR
              ledger, and marks the order status appropriately.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" onClick={onClose} disabled={recordDeposit.isPending} className="rounded-xl">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={recordDeposit.isPending}
            className="rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {recordDeposit.isPending ? "Recording..." : "Confirm & Post Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
