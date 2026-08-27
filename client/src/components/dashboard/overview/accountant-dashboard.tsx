import { FileClock, Landmark, ReceiptText, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AccountantOverview } from "@/types/domain";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Section } from "./section";
import { AgingSummary } from "./aging-summary";
import { ArByCustomerTable } from "./ar-by-customer-table";
import { RecentPaymentsTable } from "./recent-payments-table";
import { AlertsList } from "./alerts-list";

/**
 * VAT — tax/compliance truth, sourced only from the VAT Register. Rendered as
 * its own block, visually separated from the AR (commercial) sections above,
 * so the two are never read as a single combined figure.
 */
function VatSummary({ vat }: { vat: AccountantOverview["vat"] }) {
  const cells: Array<{ label: string; value: number; tone?: string }> = [
    { label: "Output VAT", value: vat.outputTax },
    { label: "Input VAT", value: vat.inputTax },
    { label: "Net Payable", value: vat.netPayable, tone: vat.netPayable > 0 ? "text-amber-700" : "text-emerald-700" },
  ];

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-col items-start gap-1 pb-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">VAT — Current Fiscal Year</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          From the VAT Register (tax compliance). Kept separate from receivables.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {cells.map((cell) => (
            <div key={cell.label} className="rounded-lg border border-border/70 bg-background p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{cell.label}</p>
              <p className={cn("mt-1.5 text-lg font-semibold tabular-nums", cell.tone ?? "text-foreground")}>
                {formatCurrency(cell.value)}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Accountant view: receivables (commercial AR), collections, and VAT
 * (compliance) — each in its own section, never summed. AR comes from
 * SalesOrder balances; VAT comes exclusively from the VAT Register.
 */
export function AccountantDashboard({ data }: { data: AccountantOverview }) {
  const { receivables, payments, vat, reconciliation, arAging } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Outstanding AR"
          value={formatCurrency(receivables.outstandingAr)}
          sub={`${formatNumber(receivables.customerCount)} customer${receivables.customerCount === 1 ? "" : "s"}`}
          tone={receivables.outstandingAr > 0 ? "warning" : "neutral"}
          href="/accounting/ledger"
          icon={ReceiptText}
        />
        <StatTile
          label="Received This Month"
          value={formatCurrency(payments.receivedMonth)}
          tone="positive"
          href="/payments"
          icon={Wallet}
        />
        <StatTile
          label="VAT Net Payable"
          value={formatCurrency(vat.netPayable)}
          sub="Output − Input (FY)"
          tone={vat.netPayable > 0 ? "warning" : "neutral"}
          href="/accounting/vat"
          icon={Landmark}
        />
        <StatTile
          label="Uninvoiced AR"
          value={formatCurrency(reconciliation.uninvoicedValue)}
          sub={`${formatNumber(reconciliation.uninvoicedCount)} order${reconciliation.uninvoicedCount === 1 ? "" : "s"} to invoice`}
          tone={reconciliation.uninvoicedCount > 0 ? "warning" : "neutral"}
          href="/invoicing"
          icon={FileClock}
        />
      </div>

      <AgingSummary data={arAging} />

      <Section title="Outstanding by Customer" description="Commercial balances owed, oldest first.">
        <ArByCustomerTable rows={data.arByCustomer} />
      </Section>

      <Section title="Tax Compliance" description="VAT register — reported separately from receivables.">
        <VatSummary vat={vat} />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentPaymentsTable rows={payments.recent} />
        <AlertsList alerts={data.alerts} />
      </div>
    </div>
  );
}
