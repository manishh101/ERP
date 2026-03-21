import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/layout/toast-provider";
import { useCreateJournalEntryMutation, useAccountsQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CreateJournalEntryFormProps = {
  onClose: () => void;
};

export function CreateJournalEntryForm({ onClose }: CreateJournalEntryFormProps) {
  const { push } = useToast();
  const createJournal = useCreateJournalEntryMutation();
  const accounts = useAccountsQuery();
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    reference: "",
  });

  const [lines, setLines] = useState([
    { accountId: "", debit: "0", credit: "0" },
    { accountId: "", debit: "0", credit: "0" }
  ]);

  const handleSubmit = async () => {
    if (!formData.description) {
      push("Validation failed", "Please enter a description for the journal entry.");
      return;
    }

    const validLines = lines.filter(line => line.accountId && (Number(line.debit) > 0 || Number(line.credit) > 0));
    
    if (validLines.length < 2) {
      push("Validation failed", "A journal entry must have at least two valid lines.");
      return;
    }

    const totalDebit = validLines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredit = validLines.reduce((sum, line) => sum + Number(line.credit), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.0001) {
      push("Imbalanced Journal", `Total Debit (${totalDebit.toFixed(2)}) must equal Total Credit (${totalCredit.toFixed(2)}).`);
      return;
    }

    try {
      await createJournal.mutateAsync({
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
        description: formData.description,
        reference: formData.reference || undefined,
        lines: validLines.map(line => ({
          accountId: line.accountId,
          debit: Number(line.debit),
          credit: Number(line.credit)
        }))
      });
      
      push("Journal Entry Created", `Balanced entry posted successfully.`);
      onClose();
    } catch (error) {
      push("Posting failed", getErrorMessage(error, "Unable to post journal entry."));
    }
  };

  const totalDebit = lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.0001;

  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardHeader>
        <div>
          <CardTitle>New Journal Entry</CardTitle>
          <CardDescription>Manually post a double-entry journal directly to the ledger.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date *</label>
            <NepaliDatePickerInput 
              value={formData.date} 
              onChange={(date) => setFormData({ ...formData, date: date.toISOString().split("T")[0] })} 
            />
          </div>
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Description *</label>
            <Input 
              placeholder="e.g. Month-end depreciation adjustment" 
              value={formData.description} 
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
            />
          </div>
          <div className="space-y-2 lg:col-span-3">
            <label className="text-sm font-medium">Reference Code (Optional)</label>
            <Input 
              placeholder="e.g. ADJ-2026-OCT" 
              value={formData.reference} 
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })} 
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Transaction Lines</h4>
            <Button 
              variant="outline" 
              onClick={() => setLines([...lines, { accountId: "", debit: "0", credit: "0" }])}
            >
              Add Line
            </Button>
          </div>
          
          <div className="rounded-xl border border-border bg-white overflow-hidden">
            <div className="grid grid-cols-12 gap-3 bg-secondary/30 p-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="col-span-6">Account</div>
              <div className="col-span-3 text-right">Debit</div>
              <div className="col-span-2 text-right">Credit</div>
              <div className="col-span-1 text-center"></div>
            </div>
            
            <div className="p-2 space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-6">
                    <select 
                      className="flex h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={line.accountId}
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].accountId = e.target.value;
                        setLines(newLines);
                      }}
                    >
                      <option value="">Select Account</option>
                      {accounts.data?.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.code} - {acc.name} ({acc.type})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <Input 
                      className="h-10 text-right"
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.debit} 
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].debit = e.target.value;
                        if (Number(e.target.value) > 0) newLines[index].credit = "0"; // A line can't be both
                        setLines(newLines);
                      }} 
                    />
                  </div>
                  <div className="col-span-2">
                    <Input 
                      className="h-10 text-right"
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.credit} 
                      onChange={(e) => {
                        const newLines = [...lines];
                        newLines[index].credit = e.target.value;
                        if (Number(e.target.value) > 0) newLines[index].debit = "0"; // A line can't be both
                        setLines(newLines);
                      }} 
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <Button 
                      variant="ghost" 
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                      onClick={() => {
                        if (lines.length > 2) {
                          const newLines = [...lines];
                          newLines.splice(index, 1);
                          setLines(newLines);
                        }
                      }}
                      disabled={lines.length <= 2}
                    >
                      X
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-12 gap-3 bg-secondary/10 p-4 border-t border-border mt-2">
              <div className="col-span-6 text-right font-medium">Totals:</div>
              <div className="col-span-3 text-right font-semibold">{totalDebit.toFixed(2)}</div>
              <div className="col-span-2 text-right font-semibold">{totalCredit.toFixed(2)}</div>
              <div className="col-span-1"></div>
            </div>
            {!isBalanced && (
              <div className="px-4 pb-4 text-sm text-red-500 font-medium text-right">
                Difference: {Math.abs(totalDebit - totalCredit).toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6 border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} disabled={createJournal.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createJournal.isPending || !isBalanced || totalDebit === 0}
            className={isBalanced && totalDebit > 0 ? "bg-green-600 hover:bg-green-700 text-white" : ""}
          >
            {createJournal.isPending ? "Posting..." : "Post Journal Entry"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
