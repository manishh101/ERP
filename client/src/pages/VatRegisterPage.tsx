import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVatRegisterQuery } from "@/hooks/use-queries";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

export default function VatRegisterPage() {
  const [fiscalYear, setFiscalYear] = useState("2080/81"); 
  const [month, setMonth] = useState(""); 
  const vatRegister = useVatRegisterQuery(month || undefined); 

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tax Compliance"
        title="VAT Sales Register"
        description="Official record of all tax invoices issued, taxable amounts, and output VAT. This reflects the tax truth of your business, separate from the commercial ledger."
      />

      <Card>
        <CardHeader>
          <CardTitle>Register Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="space-y-2 flex-1 max-w-[200px]">
            <label className="text-sm font-medium">Fiscal Year</label>
            <Input 
              placeholder="e.g. 2080/81" 
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
            />
          </div>
          <div className="space-y-2 flex-1 max-w-[200px]">
            <label className="text-sm font-medium">Month (1-12)</label>
            <select 
              className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Full Fiscal Year</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>Month {i + 1}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Sales Register (VAT Annex 7)</CardTitle>
            </div>
            {vatRegister.data && (
              <div className="flex gap-8 text-right bg-primary/5 rounded-3xl border border-primary/20 px-6 py-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Taxable Value</p>
                  <p className="text-xl font-display">{formatCurrency(vatRegister.data.totals.taxableAmount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Output VAT</p>
                  <p className="text-xl font-display text-emerald-600">{formatCurrency(vatRegister.data.totals.outputVat)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Grand Total</p>
                  <p className="text-xl font-display text-primary">{formatCurrency(vatRegister.data.totals.totalWithVat)}</p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {vatRegister.isLoading ? (
            <Skeleton className="h-[400px]" />
          ) : vatRegister.data ? (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date (BS)</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Customer / Entity</TableHead>
                    <TableHead>PAN/VAT No.</TableHead>
                    <TableHead className="text-right">Taxable Amt</TableHead>
                    <TableHead className="text-right">Export/Zero</TableHead>
                    <TableHead className="text-right">VAT (13%)</TableHead>
                    <TableHead className="text-right font-bold text-primary">Grand Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vatRegister.data.entries.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap font-medium">{entry.bsDate}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{entry.invoiceNumber}</TableCell>
                      <TableCell>{entry.customerName}</TableCell>
                      <TableCell className="font-mono text-[10px]">{entry.panNo || "-"}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(entry.taxableAmount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-emerald-600 font-semibold">{formatCurrency(entry.outputVat)}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{formatCurrency(entry.totalWithVat)}</TableCell>
                    </TableRow>
                  ))}
                  {vatRegister.data.entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic">
                        No transactions found for the selected month or period.
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                    <TableCell colSpan={4}>TOTALS</TableCell>
                    <TableCell className="text-right">{formatCurrency(vatRegister.data.totals.taxableAmount)}</TableCell>
                    <TableCell className="text-right">-</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(vatRegister.data.totals.outputVat)}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(vatRegister.data.totals.totalWithVat)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground italic">
              Unable to load VAT register data. Please check your fiscal year settings.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
