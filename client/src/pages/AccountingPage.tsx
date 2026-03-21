import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccountingSummaryQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { useState } from "react";
import { CreateJournalEntryForm } from "@/components/accounting/create-journal-entry-form";

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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Module 6"
        title="Accounting & General Ledger"
        description="Run a double-entry ledger, auto-post invoices and payments, reconcile bank activity, and produce statutory financial reports."
        actions={[
          {
            label: createJournalOpen ? "Close Form" : "New Journal Entry",
            onClick: () => setCreateJournalOpen(c => !c)
          },
          { label: "Reconcile Bank", variant: "outline" }
        ]}
      />

      {createJournalOpen ? <CreateJournalEntryForm onClose={() => setCreateJournalOpen(false)} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Recent Journal Activity</CardTitle>
              <CardDescription>Latest entries from the live general ledger feed.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3">
            {data.recentEntries.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">{entry.description}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(entry.date)} · {entry.createdBy}
                  {entry.reference ? ` · Ref ${entry.reference}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Financial Statements</CardTitle>
              <CardDescription>P&amp;L, Balance Sheet, Cash Flow, and tax summary from the API.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.statementCards.map((card) => (
              <div key={card.label} className="rounded-2xl bg-secondary/60 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold">{card.label}</p>
                  <p className="font-semibold">{card.value}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{card.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Ledger Snapshot</CardTitle>
            <CardDescription>Current coverage of the chart of accounts and balancing reports.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {data.snapshotCards.map((item) => (
            <div key={item.label} className="rounded-3xl border border-border bg-white p-5">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{item.label}</p>
              <p className="mt-3 font-display text-3xl">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
