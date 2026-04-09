import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useArLedgerQuery, useCustomersQuery } from "@/hooks/use-queries";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ArLedgerPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const customers = useCustomersQuery();
  const ledger = useArLedgerQuery(selectedCustomerId);
  const { token } = useAuth();

  const handleDownloadPdf = async () => {
    try {
      if (!selectedCustomerId) return;
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/auth/download-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to get download token');
      const { token: downloadToken } = await response.json();

      const url = `${baseUrl}/reports/customer-ledger/${selectedCustomerId}/pdf?token=${downloadToken}`;
      window.open(url, "_blank");
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to generate secure download link');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Receivables"
        title="Account Receivable Ledger"
        description="Transaction history and outstanding balances by customer."
      />

      <select 
        className="flex h-11 w-full max-w-sm rounded-2xl border border-border bg-white/90 px-4 text-sm"
        value={selectedCustomerId}
        onChange={(e) => setSelectedCustomerId(e.target.value)}
      >
        <option value="">Select a customer</option>
        {customers.data?.items.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {selectedCustomerId && (
        <Card>
          <CardHeader>
            <div className="flex flex-row items-center justify-between w-full">
              <div className="flex-1">
                <CardTitle>Ledger Details</CardTitle>
              </div>
              {ledger.data && (
                <>
                  <div className="flex-1 flex justify-center items-baseline gap-3">
                    <span className="text-sm text-muted-foreground tracking-wider uppercase">Current Balance</span>
                    <span className="text-2xl font-display">{formatCurrency(ledger.data.closingBalance)}</span>
                  </div>
                  <div className="flex-1 text-right">
                    <Button variant="default" size="sm" onClick={handleDownloadPdf} disabled={!ledger.data || ledger.data.entries.length === 0}>
                      <Download className="mr-2 h-4 w-4" /> Download PDF Statement
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {ledger.isLoading ? (
              <Skeleton className="h-[400px]" />
            ) : ledger.data ? (
              <div className="rounded-2xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead>Payment Reference</TableHead>
                      <TableHead className="text-right">Debit (Sales)</TableHead>
                      <TableHead className="text-right">Credit (Payment)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={5}>Opening Balance</TableCell>
                      <TableCell className="text-right">{formatCurrency(ledger.data.openingBalance)}</TableCell>
                    </TableRow>
                    {ledger.data.entries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(entry.entryDate)}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.narration || entry.entryType.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.referenceId}</TableCell>
                        <TableCell className="text-right">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(entry.runningBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(() => {
                      const totalDebit = ledger.data.entries.reduce((sum: number, entry: any) => sum + (entry.debit > 0 ? Number(entry.debit) : 0), 0);
                      const totalCredit = ledger.data.entries.reduce((sum: number, entry: any) => sum + (entry.credit > 0 ? Number(entry.credit) : 0), 0);
                      return (
                        <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                          <TableCell colSpan={3} className="text-right text-base">Total:</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalDebit)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(totalCredit)}</TableCell>
                          <TableCell className="text-right text-primary ext-base">{formatCurrency(ledger.data.closingBalance)}</TableCell>
                        </TableRow>
                      );
                    })()}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground italic">
                No ledger data found for this customer.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
