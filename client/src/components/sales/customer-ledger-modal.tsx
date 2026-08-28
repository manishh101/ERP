import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useCustomerLedgerQuery } from "@/hooks/use-queries";
import { useAuth } from "@/components/auth/auth-provider";
import { formatCurrency, formatEnumLabel, formatDate } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ArLedgerEntry } from "@/types/domain";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CustomerLedgerModalProps = {
  customerId: string;
  customerName: string;
  onClose: () => void;
};

const ledgerColumns: ColumnDef<ArLedgerEntry, unknown>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("date")),
  },
  {
    accessorKey: "type",
    header: "Particulars",
    cell: ({ row }) => {
      const original = row.original as any;
      return original.narration || formatEnumLabel(row.getValue("type"));
    },
  },
  { accessorKey: "reference", header: "Reference" },
  {
    accessorKey: "debit",
    header: () => <div className="text-right">Debit (Sales)</div>,
    cell: ({ row }) => {
      const val = row.getValue("debit") as number;
      return <div className="text-right tabular-nums">{val > 0 ? formatCurrency(val) : "—"}</div>;
    },
  },
  {
    accessorKey: "credit",
    header: () => <div className="text-right">Credit (Payment)</div>,
    cell: ({ row }) => {
      const val = row.getValue("credit") as number;
      return <div className="text-right tabular-nums">{val > 0 ? formatCurrency(val) : "—"}</div>;
    },
  },
  {
    accessorKey: "balance",
    header: () => <div className="text-right">Balance</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold tabular-nums">
        {formatCurrency(row.getValue("balance") as number)}
      </div>
    ),
  },
];

export function CustomerLedgerModal({ customerId, customerName, onClose }: CustomerLedgerModalProps) {
  const { token } = useAuth();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const { data: ledger, isLoading } = useCustomerLedgerQuery(customerId, { startDate, endDate });

  const handleDownloadPdf = async () => {
    try {
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/auth/download-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to get download token');
      const { token: downloadToken } = await response.json();

      let url = `${baseUrl}/reports/customer-ledger/${customerId}/pdf?token=${downloadToken}`;
      if (startDate) url += `&startDate=${startDate.toISOString()}`;
      if (endDate) url += `&endDate=${endDate.toISOString()}`;
      
      window.open(url, "_blank");
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to generate secure download link');
    }
  };

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-6xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Khata (Ledger)</SheetTitle>
          <SheetDescription>{customerName}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-48">
              <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
              <NepaliDatePickerInput 
                value={startDate} 
                onChange={setStartDate} 
                placeholder="Start Date"
              />
            </div>
            <div className="w-48">
              <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
              <NepaliDatePickerInput 
                value={endDate} 
                onChange={setEndDate} 
                placeholder="End Date"
              />
            </div>
            {(startDate || endDate) && (
              <Button 
                variant="ghost" 
                className="mt-5 text-muted-foreground"
                onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
              >
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : ledger?.entries && ledger.entries.length > 0 ? (
            <div className="space-y-4">
              <DataTable data={ledger.entries} columns={ledgerColumns} pageSize={50} />

              <div className="flex justify-end pt-2">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Closing Balance</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {formatCurrency(ledger.closingBalance)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              No transactions found for this party in the selected date range.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t pt-4 mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownloadPdf} disabled={!ledger?.entries || ledger.entries.length === 0}>
            Download PDF
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
