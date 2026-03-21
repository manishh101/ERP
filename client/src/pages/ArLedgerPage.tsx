import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useArLedgerQuery, useCustomersQuery } from "@/hooks/use-queries";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function ArLedgerPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const customers = useCustomersQuery();
  const ledger = useArLedgerQuery(selectedCustomerId);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financial Truth"
        title="Account Receivable Ledger"
        description="Detailed transaction history and outstanding balances for each customer. This reflects the commercial reality of your business."
      />

      <Card>
        <CardHeader>
          <CardTitle>Select Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <select 
            className="flex h-11 w-full max-w-md rounded-2xl border border-border bg-white/90 px-4 text-sm"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
          >
            <option value="">Select a customer</option>
            {customers.data?.items.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedCustomerId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Ledger Details</CardTitle>
              </div>
              {ledger.data && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-display">{formatCurrency(ledger.data.closingBalance)}</p>
                </div>
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
                      <TableHead>Type</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Narration</TableHead>
                      <TableHead className="text-right">Debit (+)</TableHead>
                      <TableHead className="text-right">Credit (-)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableCell colSpan={6}>Opening Balance</TableCell>
                      <TableCell className="text-right">{formatCurrency(ledger.data.openingBalance)}</TableCell>
                    </TableRow>
                    {ledger.data.entries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(entry.entryDate)}</TableCell>
                        <TableCell className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {entry.entryType.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{entry.referenceId}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">{entry.narration || "-"}</TableCell>
                        <TableCell className="text-right text-red-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(entry.runningBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                      <TableCell colSpan={6}>Closing Balance</TableCell>
                      <TableCell className="text-right text-primary">{formatCurrency(ledger.data.closingBalance)}</TableCell>
                    </TableRow>
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
