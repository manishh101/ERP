import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useVatRegisterQuery } from "@/hooks/use-queries";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Printer, Search, ShieldCheck, FileText } from "lucide-react";

const NEPALI_FISCAL_MONTHS = [
  { value: "4", name: "Month 01 (Shrawan / साउन)" },
  { value: "5", name: "Month 02 (Bhadra / भदौ)" },
  { value: "6", name: "Month 03 (Ashwin / असोज)" },
  { value: "7", name: "Month 04 (Kartik / कार्तिक)" },
  { value: "8", name: "Month 05 (Mangsir / मंसिर)" },
  { value: "9", name: "Month 06 (Poush / पुष)" },
  { value: "10", name: "Month 07 (Magh / माघ)" },
  { value: "11", name: "Month 08 (Falgun / फागुन)" },
  { value: "12", name: "Month 09 (Chaitra / चैत)" },
  { value: "1", name: "Month 10 (Baisakh / वैशाख)" },
  { value: "2", name: "Month 11 (Jestha / जेठ)" },
  { value: "3", name: "Month 12 (Ashadh / असार)" },
];

export default function VatRegisterPage() {
  const [fiscalYear, setFiscalYear] = useState("2080/81");
  const [month, setMonth] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const vatRegister = useVatRegisterQuery(month || undefined);

  // Filter entries based on search query
  const filteredEntries = useMemo(() => {
    if (!vatRegister.data?.entries) return [];
    if (!searchQuery.trim()) return vatRegister.data.entries;

    const q = searchQuery.toLowerCase();
    return vatRegister.data.entries.filter((entry: any) => {
      const matchInv = entry.invoiceNumber?.toLowerCase().includes(q);
      const matchCust = entry.customerName?.toLowerCase().includes(q);
      const matchPan = entry.panNo?.toLowerCase().includes(q);
      return matchInv || matchCust || matchPan;
    });
  }, [vatRegister.data?.entries, searchQuery]);

  // Recalculate summary totals for filtered view
  const filteredTotals = useMemo(() => {
    return filteredEntries.reduce(
      (acc: any, entry: any) => {
        acc.taxableAmount += Number(entry.taxableAmount || 0);
        acc.outputVat += Number(entry.outputVat || 0);
        acc.totalWithVat += Number(entry.totalWithVat || 0);
        return acc;
      },
      { taxableAmount: 0, outputVat: 0, totalWithVat: 0 },
    );
  }, [filteredEntries]);

  const handleExportCsv = () => {
    if (!filteredEntries || filteredEntries.length === 0) {
      alert("No data available to export.");
      return;
    }

    const headers = [
      "BS Date",
      "Invoice Number",
      "Customer / Entity Name",
      "PAN/VAT Number",
      "Taxable Amount (NPR)",
      "Zero Rated / Exempt",
      "Output VAT 13% (NPR)",
      "Grand Total (NPR)",
    ];

    const rows = filteredEntries.map((e: any) => [
      `"${e.bsDate || ""}"`,
      `"${e.invoiceNumber || ""}"`,
      `"${(e.customerName || "").replace(/"/g, '""')}"`,
      `"${e.panNo || ""}"`,
      e.taxableAmount,
      0,
      e.outputVat,
      e.totalWithVat,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `VAT_Sales_Register_Annex7_${fiscalYear.replace("/", "-")}_Month_${month || "All"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="VAT Sales Register (Annex 7)"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Export CSV
            </Button>
            <Button variant="default" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Print Register
            </Button>
          </div>
        }
      />

      {/* Compliance Banner */}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1 text-emerald-900">
          <p className="font-bold">
            Statutory IRD Compliance &mdash; Sales Register (बिक्री खाता - अनुसूची ७):
          </p>
          <p className="leading-relaxed">
            This register reflects official VAT Tax Invoices issued under Value Added Tax Rules (IRD Nepal). All taxable amounts and output VAT figures are sourced directly from the authorized tax invoice registry.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold">Register Period & Search Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Fiscal Year
            </label>
            <Input
              placeholder="e.g. 2080/81"
              value={fiscalYear}
              onChange={(e) => setFiscalYear(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Nepali Month
            </label>
            <select
              className="flex h-10 w-full rounded-xl border border-border bg-white px-3 text-xs"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              <option value="">Full Fiscal Year (सबै महिना)</option>
              {NEPALI_FISCAL_MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase">
              Search Register
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Invoice #, Party, or PAN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 text-xs rounded-xl pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Register Table Card */}
      <Card className="rounded-2xl border-border shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Sales Register Table (अनुसूची ७)
              </CardTitle>
              <CardDescription>
                Taxable sales, zero-rated exports, and output VAT collection records.
              </CardDescription>
            </div>

            {vatRegister.data && (
              <div className="flex gap-6 text-right bg-slate-50 rounded-2xl border border-border px-5 py-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    Taxable Subtotal
                  </p>
                  <p className="text-lg font-display font-bold text-foreground">
                    {formatCurrency(filteredTotals.taxableAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    Output VAT (13%)
                  </p>
                  <p className="text-lg font-display font-bold text-emerald-600">
                    {formatCurrency(filteredTotals.outputVat)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
                    Grand Total
                  </p>
                  <p className="text-lg font-display font-bold text-primary">
                    {formatCurrency(filteredTotals.totalWithVat)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {vatRegister.isLoading ? (
            <Skeleton className="h-[400px] rounded-2xl" />
          ) : vatRegister.data ? (
            <div className="rounded-2xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100/70 border-b border-border">
                    <TableHead>Date (BS)</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Customer / Buyer Name</TableHead>
                    <TableHead>PAN/VAT No.</TableHead>
                    <TableHead className="text-right">Taxable Value</TableHead>
                    <TableHead className="text-right">Zero / Exempt</TableHead>
                    <TableHead className="text-right">Output VAT (13%)</TableHead>
                    <TableHead className="text-right font-bold text-primary">Grand Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry: any) => (
                    <TableRow key={entry.id} className="hover:bg-slate-50/50">
                      <TableCell className="whitespace-nowrap font-medium text-xs">
                        {entry.bsDate || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {entry.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{entry.customerName}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {entry.panNo || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-xs tabular-nums">
                        {formatCurrency(entry.taxableAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground text-xs tabular-nums">
                        -
                      </TableCell>
                      <TableCell className="text-right font-mono text-emerald-600 font-semibold text-xs tabular-nums">
                        {formatCurrency(entry.outputVat)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary text-xs tabular-nums">
                        {formatCurrency(entry.totalWithVat)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredEntries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-48 text-center text-muted-foreground italic">
                        No VAT sales transactions found for the selected filter criteria.
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                    <TableCell colSpan={4} className="text-xs font-bold uppercase tracking-wider">
                      PERIOD TOTALS ({filteredEntries.length} Invoices)
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums font-bold">
                      {formatCurrency(filteredTotals.taxableAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular-nums">-</TableCell>
                    <TableCell className="text-right font-mono text-emerald-600 text-xs tabular-nums font-bold">
                      {formatCurrency(filteredTotals.outputVat)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-primary text-xs tabular-nums font-bold">
                      {formatCurrency(filteredTotals.totalWithVat)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground italic">
              Unable to load VAT register data. Please check your network connection or backend configuration.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
