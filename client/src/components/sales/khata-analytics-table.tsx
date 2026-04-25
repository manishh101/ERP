import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import NepaliDate from "nepali-datetime";
import { DataTable } from "@/components/shared/data-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatCurrency, formatNumber, getNepaliMonthName, toNumber } from "@/lib/utils";
import type { ArLedgerEntry } from "@/types/domain";

type MonthRow = {
  id: string;
  monthKey: string; // e.g. "2081-03"
  monthLabel: string; // e.g. "Shrawan 2081"
  totalQty: number;
  totalValue: number;
  amountPaid: number;
  closingBalance: number;
};

interface KhataAnalyticsTableProps {
  ledgerEntries: ArLedgerEntry[];
  salesOrders: Array<{
    orderDate?: string;
    grandTotal?: number | string;
    orderAmount?: number | string;
    balanceDue?: number | string;
    paidAmount?: number | string;
    lineItems?: Array<{
      quantity?: number | string;
      product?: string;
      variant?: string;
    }>;
  }>;
}

function groupByNepaliMonth(
  ledgerEntries: ArLedgerEntry[],
  salesOrders: KhataAnalyticsTableProps["salesOrders"],
): MonthRow[] {
  const monthMap = new Map<string, MonthRow>();

  // Group sales orders by Nepali month
  for (const order of salesOrders) {
    if (!order.orderDate) continue;

    let bsYear: number;
    let bsMonth: number;
    try {
      const nd = new NepaliDate(new Date(order.orderDate));
      bsYear = nd.getYear();
      bsMonth = nd.getMonth();
    } catch {
      continue;
    }

    const key = `${bsYear}-${String(bsMonth).padStart(2, "0")}`;
    const existing = monthMap.get(key) ?? {
      id: key,
      monthKey: key,
      monthLabel: `${getNepaliMonthName(bsMonth)} ${bsYear}`,
      totalQty: 0,
      totalValue: 0,
      amountPaid: 0,
      closingBalance: 0,
    };

    const qty = (order.lineItems ?? []).reduce(
      (sum, li) => sum + toNumber(li.quantity),
      0,
    );
    existing.totalQty += qty;
    existing.totalValue += toNumber(order.orderAmount || order.grandTotal);
    existing.amountPaid += toNumber(order.paidAmount);

    monthMap.set(key, existing);
  }

  // Compute closing balance from ledger entries
  if (ledgerEntries.length > 0) {
    const lastEntry = ledgerEntries[ledgerEntries.length - 1];
    const rows = Array.from(monthMap.values()).sort((a, b) =>
      a.monthKey.localeCompare(b.monthKey),
    );

    let runningBalance = 0;
    for (const row of rows) {
      runningBalance += row.totalValue - row.amountPaid;
      row.closingBalance = runningBalance;
    }

    // Adjust last row to match actual ledger closing balance
    if (rows.length > 0) {
      rows[rows.length - 1].closingBalance = lastEntry.balance;
    }

    return rows;
  }

  return Array.from(monthMap.values()).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey),
  );
}

export function KhataAnalyticsTable({ ledgerEntries, salesOrders }: KhataAnalyticsTableProps) {
  const [drillDownMonth, setDrillDownMonth] = useState<MonthRow | null>(null);

  const rows = useMemo(
    () => groupByNepaliMonth(ledgerEntries, salesOrders),
    [ledgerEntries, salesOrders],
  );

  // Get products dispatched for a given month
  const drillDownItems = useMemo(() => {
    if (!drillDownMonth) return [];
    return salesOrders
      .filter((order) => {
        if (!order.orderDate) return false;
        try {
          const nd = new NepaliDate(new Date(order.orderDate));
          const key = `${nd.getYear()}-${String(nd.getMonth()).padStart(2, "0")}`;
          return key === drillDownMonth.monthKey;
        } catch {
          return false;
        }
      })
      .flatMap((order) =>
        (order.lineItems ?? []).map((li) => ({
          orderId: order.id,
          product: li.product ?? "Unknown",
          variant: li.variant ?? "Default",
          quantity: toNumber(li.quantity),
        })),
      );
  }, [drillDownMonth, salesOrders]);

  const columns: ColumnDef<MonthRow, unknown>[] = [
    {
      accessorKey: "monthLabel",
      header: "Nepali Month",
      cell: ({ row }) => (
        <span className="font-semibold text-sm">{row.getValue("monthLabel")}</span>
      ),
    },
    {
      accessorKey: "totalQty",
      header: () => <div className="text-right w-full block">Qty Ordered</div>,
      cell: ({ row }) => (
        <button
          className="block w-full text-right tabular-nums font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setDrillDownMonth(row.original)}
        >
          {formatNumber(row.getValue("totalQty") as number)}
        </button>
      ),
    },
    {
      accessorKey: "totalValue",
      header: () => <div className="text-right w-full block">Order Value (NPR)</div>,
      cell: ({ row }) => (
        <div className="text-right w-full block tabular-nums font-medium">
          {formatCurrency(row.getValue("totalValue") as number)}
        </div>
      ),
    },
    {
      accessorKey: "amountPaid",
      header: () => <div className="text-right w-full block">Amount Paid (NPR)</div>,
      cell: ({ row }) => (
        <div className="text-right w-full block tabular-nums font-medium text-green-700">
          {formatCurrency(row.getValue("amountPaid") as number)}
        </div>
      ),
    },
    {
      accessorKey: "closingBalance",
      header: () => <div className="text-right w-full block">Closing Balance (NPR)</div>,
      cell: ({ row }) => {
        const bal = row.getValue("closingBalance") as number;
        return (
          <div className={`text-right w-full block tabular-nums font-bold ${bal > 0 ? "text-amber-700" : "text-green-700"}`}>
            {formatCurrency(bal)}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Khata Analytics</CardTitle>
          <CardDescription>
            Month-by-month transaction history. Click a quantity to see dispatched products.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={rows}
            pageSize={12}
            emptyMessage="No transaction history available for this party."
          />
        </CardContent>
      </Card>

      {/* Drill-down Sheet: Products dispatched in a month */}
      <Sheet open={!!drillDownMonth} onOpenChange={(open) => !open && setDrillDownMonth(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Products Dispatched</SheetTitle>
            <SheetDescription>
              {drillDownMonth?.monthLabel} — {drillDownMonth?.totalQty} total units
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-2">
            {drillDownItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No product line detail available for this month.
              </p>
            ) : (
              <div className="rounded-lg border divide-y">
                {drillDownItems.map((item, idx) => (
                  <div key={`${item.orderId}-${idx}`} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">{item.product}</p>
                      <p className="text-xs text-muted-foreground">{item.variant} · Order {item.orderId}</p>
                    </div>
                    <span className="tabular-nums text-sm font-bold">{item.quantity} pcs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
