import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountingSummaryQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { CreateJournalEntryForm } from "@/components/accounting/create-journal-entry-form";
import { Landmark, TrendingDown, TrendingUp, Wallet, ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";

export function AccountingPage() {
  const { user } = useAuth();
  const { data, error, isLoading } = useAccountingSummaryQuery();
  const [createJournalOpen, setCreateJournalOpen] = useState(false);

  if (user?.role !== "ADMIN" && user?.role !== "ACCOUNTANT") {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Finance access required.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Accounting reports and ledger data are limited to Admin and Accountant roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Accounting data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  function StatCard({
    label,
    value,
    icon: Icon,
    trendClass,
    trendIcon: TrendIcon,
  }: {
    label: string;
    value: number;
    icon: React.ElementType;
    trendClass: string;
    trendIcon: React.ElementType;
  }) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${trendClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="flex items-center gap-2">
            <p className="mt-0.5 truncate text-xl font-bold tracking-tight">{formatCurrency(value)}</p>
            <TrendIcon className="h-4 w-4 opacity-50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting & General Ledger"
        actions={[
          {
            label: createJournalOpen ? "Close Form" : "New Journal Entry",
            onClick: () => setCreateJournalOpen(c => !c)
          },
          { label: "Reconcile Bank", variant: "outline" }
        ]}
      />

      {createJournalOpen ? <CreateJournalEntryForm onClose={() => setCreateJournalOpen(false)} /> : null}

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard
          label="Total Cash & Bank"
          value={data.metrics.cashAndBank}
          icon={Wallet}
          trendClass="bg-blue-50 text-blue-600"
          trendIcon={ArrowRight}
        />
        <StatCard
          label="Accounts Receivable"
          value={data.metrics.accountsReceivable}
          icon={TrendingUp}
          trendClass="bg-emerald-50 text-emerald-600"
          trendIcon={ArrowUpRight}
        />
        <StatCard
          label="Accounts Payable"
          value={data.metrics.accountsPayable}
          icon={TrendingDown}
          trendClass="bg-red-50 text-red-600"
          trendIcon={ArrowDownRight}
        />
        <StatCard
          label="Net Tax Payable"
          value={data.metrics.netTaxPayable}
          icon={Landmark}
          trendClass="bg-amber-50 text-amber-600"
          trendIcon={ArrowRight}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest financial movements across the company.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3">
              {data.recentEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-border bg-white p-4">
                  <div>
                    <p className="font-semibold">{entry.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(entry.date)} · Recorded by {entry.createdBy}
                    </p>
                  </div>
                  {entry.reference && (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                      Ref: {entry.reference}
                    </span>
                  )}
                </div>
              ))}
              <div className="flex justify-center mt-2">
                <button className="text-sm font-medium text-primary hover:underline">View All Transactions</button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Cash & Bank Balances</CardTitle>
                <CardDescription>Current liquid assets available.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.liquidityAccounts.length > 0 ? (
                data.liquidityAccounts.map((acc) => (
                  <div key={acc.name} className="flex items-center justify-between rounded-xl bg-secondary/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Landmark className="h-4 w-4" />
                      </div>
                      <p className="font-semibold">{acc.name}</p>
                    </div>
                    <p className="font-bold">{formatCurrency(acc.balance)}</p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">No bank or cash accounts configured.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Financial Statements Summary</CardTitle>
                <CardDescription>High-level metrics for the current period.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.statementCards.map((card) => (
                <div key={card.label} className="rounded-xl border border-border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                  <p className="mt-1 text-lg font-bold">{card.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
