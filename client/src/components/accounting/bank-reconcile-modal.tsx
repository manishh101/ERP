import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useBankImportMutation } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";

type BankReconcileModalProps = {
  onClose: () => void;
};

export function BankReconcileModal({ onClose }: BankReconcileModalProps) {
  const bankImport = useBankImportMutation();
  const [fileName, setFileName] = useState("");
  const [csvContent, setCsvContent] = useState("");
  const [importResult, setImportResult] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent) {
      toast.error("No CSV Content", { description: "Please select or paste a valid CSV bank statement file." });
      return;
    }

    try {
      const result = await bankImport.mutateAsync({
        fileName: fileName || "bank_statement.csv",
        csvContent,
      });
      setImportResult(result);
      toast.success("Bank Statement Processed", {
        description: `Imported ${result.totalLines} lines. ${result.totalLines - result.unmatchedLines} matched automatically.`,
      });
    } catch (error) {
      toast.error("Import Failed", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Bank Statement Reconciliation
          </CardTitle>
          <CardDescription>
            Upload your bank's CSV statement to automatically match transactions with logged ERP payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!importResult ? (
            <>
              <div className="space-y-3">
                <label className="text-sm font-medium">Upload Bank Statement CSV File</label>
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to select CSV file</p>
                  <p className="text-xs text-muted-foreground mt-1">File must include Date, Reference, Description, and Amount headers.</p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="mt-4 text-xs"
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Or Paste CSV Raw Content</label>
                <textarea
                  className="w-full h-32 p-3 font-mono text-xs rounded-md border border-border bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Date,Reference,Description,Amount&#10;2026-08-01,PAY-1002,Client Deposit,50000.00"
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button variant="outline" onClick={onClose} disabled={bankImport.isPending}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={bankImport.isPending || !csvContent.trim()}
                  className="bg-primary text-white"
                >
                  {bankImport.isPending ? "Processing CSV..." : "Process Statement"}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <div>
                    <h4 className="font-semibold text-emerald-900">Reconciliation Complete</h4>
                    <p className="text-sm text-emerald-700">
                      Statement file <span className="font-mono">{importResult.fileName}</span> processed successfully.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl border border-border p-4 text-center">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Total Lines</p>
                  <p className="text-2xl font-bold mt-1">{importResult.totalLines}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 text-center">
                  <p className="text-xs font-medium uppercase text-emerald-700">Matched Payments</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    {importResult.totalLines - importResult.unmatchedLines}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 text-center">
                  <p className="text-xs font-medium uppercase text-amber-700">Unmatched Lines</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{importResult.unmatchedLines}</p>
                </div>
              </div>

              {importResult.lines && importResult.lines.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Statement Line Details</h4>
                  <div className="rounded-xl border border-border overflow-hidden max-h-60 overflow-y-auto text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-secondary/40 font-medium uppercase tracking-wider text-muted-foreground sticky top-0">
                        <tr>
                          <th className="p-2">Date</th>
                          <th className="p-2">Reference</th>
                          <th className="p-2">Description</th>
                          <th className="p-2 text-right">Amount</th>
                          <th className="p-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {importResult.lines.map((line: any) => (
                          <tr key={line.id}>
                            <td className="p-2">{new Date(line.transactionDate).toLocaleDateString()}</td>
                            <td className="p-2 font-mono">{line.reference || "N/A"}</td>
                            <td className="p-2">{line.description}</td>
                            <td className="p-2 text-right font-mono font-medium">{line.amount}</td>
                            <td className="p-2 text-center">
                              {line.isMatched ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                  Matched
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800">
                                  Unmatched
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button onClick={onClose} className="bg-primary text-white">
                  Done
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
