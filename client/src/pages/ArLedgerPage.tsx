import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { YearMonthFilter, useYearMonthFilteredRows } from "@/components/shared/year-month-filter";
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
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const customers = useCustomersQuery();
  const ledger = useArLedgerQuery(selectedCustomerId);
  const { token } = useAuth();
  const ledgerEntries = ledger.data?.entries ?? [];
  const filteredEntries = useYearMonthFilteredRows(
    ledgerEntries,
    (entry: any) => entry.bsDate || entry.entryDate,
    filterYear,
    filterMonth,
  );
  const firstFilteredEntry = filteredEntries[0];
  const filteredOpeningBalance = firstFilteredEntry
    ? Number(firstFilteredEntry.runningBalance) - Number(firstFilteredEntry.debit) + Number(firstFilteredEntry.credit)
    : (filterYear ? ledger.data?.closingBalance ?? 0 : ledger.data?.openingBalance ?? 0);
  const filteredClosingBalance = filteredEntries.length > 0
    ? Number(filteredEntries[filteredEntries.length - 1].runningBalance)
    : filteredOpeningBalance;
  const filteredTotalDebit = filteredEntries.reduce((sum: number, entry: any) => sum + (entry.debit > 0 ? Number(entry.debit) : 0), 0);
  const filteredTotalCredit = filteredEntries.reduce((sum: number, entry: any) => sum + (entry.credit > 0 ? Number(entry.credit) : 0), 0);

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
        title="Account Receivable Ledger"
      />

      <div className="flex flex-wrap items-center gap-3">
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
        <div className="ml-auto flex items-center justify-end gap-3 flex-wrap">
          <YearMonthFilter
            year={filterYear}
            month={filterMonth}
            onYearChange={(y) => { setFilterYear(y); setFilterMonth(""); }}
            onMonthChange={setFilterMonth}
          />
          {(filterYear || filterMonth) && (
            <button
              onClick={() => { setFilterYear(""); setFilterMonth(""); }}
              className="text-xs text-muted-foreground underline hover:text-foreground"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

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
                    <span className="text-2xl font-display">{formatCurrency(filterYear ? filteredClosingBalance : ledger.data.closingBalance)}</span>
                  </div>
                  <div className="flex-1 text-right">
                    <Button variant="default" size="sm" onClick={handleDownloadPdf} disabled={!ledger.data || filteredEntries.length === 0}>
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
                      <TableCell className="text-right font-mono font-bold tabular-nums">{formatCurrency(filterYear ? filteredOpeningBalance : ledger.data.openingBalance)}</TableCell>
                    </TableRow>
                    {filteredEntries.map((entry: any) => (
                      <TableRow key={entry.id} className="hover:bg-secondary/20 transition-colors">
                        <TableCell className="whitespace-nowrap text-xs">
                          <div className="font-medium">{formatDate(entry.entryDate)}</div>
                          {entry.bsDate && <div className="text-[11px] text-muted-foreground font-mono">BS {entry.bsDate}</div>}
                        </TableCell>
                        <TableCell className="max-w-xs truncate font-medium">{entry.narration || entry.entryType.replace(/_/g, " ")}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.referenceId ? (
                            <span className="px-2 py-0.5 rounded bg-secondary font-medium text-foreground">
                              Ref: {entry.referenceId}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-700 tabular-nums">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-blue-700 tabular-nums">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold tabular-nums">
                          {formatCurrency(entry.runningBalance)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                      <TableCell colSpan={3} className="text-right text-base">Total:</TableCell>
                      <TableCell className="text-right font-mono text-emerald-800 tabular-nums">{formatCurrency(filteredTotalDebit)}</TableCell>
                      <TableCell className="text-right font-mono text-blue-800 tabular-nums">{formatCurrency(filteredTotalCredit)}</TableCell>
                      <TableCell className="text-right text-primary text-base font-mono font-bold tabular-nums">{formatCurrency(filterYear ? filteredClosingBalance : ledger.data.closingBalance)}</TableCell>
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
