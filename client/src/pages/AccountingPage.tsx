import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAccountingSummaryQuery,
  useAccountsQuery,
  useJournalEntriesListQuery,
  type RawAccount,
  type RawJournalEntryDetailed,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreateJournalEntryForm } from "@/components/accounting/create-journal-entry-form";
import { CreateAccountDialog } from "@/components/accounting/create-account-dialog";
import { BankReconcileModal } from "@/components/accounting/bank-reconcile-modal";
import {
  Landmark,
  TrendingDown,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Receipt,
  CreditCard,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

type AccountingTab = "overview" | "accounts" | "journal" | "reconcile";

export function AccountingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AccountingTab>("overview");
  const [createJournalOpen, setCreateJournalOpen] = useState(false);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [bankReconcileOpen, setBankReconcileOpen] = useState(false);

  // Queries
  const summaryQuery = useAccountingSummaryQuery();
  const accountsQuery = useAccountsQuery();

  // Pagination for GL Journal Entries tab
  const [journalPage, setJournalPage] = useState(1);
  const journalEntriesQuery = useJournalEntriesListQuery(journalPage, 20);

  // Chart of Accounts tab filters
  const [accountSearch, setAccountSearch] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("ALL");

  // Journal Entry expanded card state
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

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

  if (summaryQuery.isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (summaryQuery.error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Accounting data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(summaryQuery.error)}</p>
        </CardContent>
      </Card>
    );
  }

  const data = summaryQuery.data;

  // Filtered accounts for Chart of Accounts tab
  const filteredAccounts = (accountsQuery.data ?? []).filter((account: RawAccount) => {
    const matchesType = accountTypeFilter === "ALL" || account.type === accountTypeFilter;
    const matchesSearch =
      !accountSearch.trim() ||
      account.code.toLowerCase().includes(accountSearch.toLowerCase()) ||
      account.name.toLowerCase().includes(accountSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

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
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${trendClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="flex items-center gap-2">
            <p className="mt-0.5 truncate text-xl font-bold tracking-tight font-mono tabular-nums">
              {formatCurrency(value)}
            </p>
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
            onClick: () => setCreateJournalOpen((c) => !c),
          },
          {
            label: "Reconcile Bank",
            variant: "outline",
            onClick: () => setBankReconcileOpen(true),
          },
        ]}
      />

      {/* Modals & Slide-outs */}
      {createJournalOpen && <CreateJournalEntryForm onClose={() => setCreateJournalOpen(false)} />}
      {createAccountOpen && <CreateAccountDialog onClose={() => setCreateAccountOpen(false)} />}
      {bankReconcileOpen && <BankReconcileModal onClose={() => setBankReconcileOpen(false)} />}

      {/* Primary Module Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "overview" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Financial Overview
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "accounts" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Chart of Accounts
          </button>
          <button
            onClick={() => setActiveTab("journal")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "journal" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Journal Entries & GL
          </button>
          <button
            onClick={() => setActiveTab("reconcile")}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === "reconcile" ? "bg-primary text-white" : "bg-white text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            Bank & Reconciliation
          </button>
        </div>

        {/* Quick Links to Domain Workspaces */}
        <div className="flex items-center gap-2">
          <Link
            to="/accounting/ledger"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <BookOpen className="h-3.5 w-3.5 text-blue-600" />
            AR Ledger (Khata)
          </Link>
          <Link
            to="/accounting/vat"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Receipt className="h-3.5 w-3.5 text-amber-600" />
            VAT Register
          </Link>
          <Link
            to="/payments"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-white text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
            Payments Log
          </Link>
        </div>
      </div>

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {activeTab === "overview" && data && (
        <div className="space-y-6">
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
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Journal Entries</CardTitle>
                    <CardDescription>Latest financial transactions logged in the system.</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("journal")}>
                    View All GL Entries <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {data.recentEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:border-primary/30 transition-colors"
                    >
                      <div>
                        <p className="font-semibold">{entry.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(entry.date)} · Recorded by {entry.createdBy}
                        </p>
                      </div>
                      {entry.reference && (
                        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-mono font-medium text-muted-foreground">
                          Ref: {entry.reference}
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Cash & Liquid Accounts</CardTitle>
                    <CardDescription>Current available liquid balances.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.liquidityAccounts.length > 0 ? (
                    data.liquidityAccounts.map((acc) => (
                      <div key={acc.name} className="flex items-center justify-between rounded-xl bg-secondary/40 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Landmark className="h-4 w-4" />
                          </div>
                          <p className="font-semibold text-sm">{acc.name}</p>
                        </div>
                        <p className="font-mono font-bold text-sm">{formatCurrency(acc.balance)}</p>
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
                    <CardDescription>Key metrics for the current reporting period.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.statementCards.map((card) => (
                    <div key={card.label} className="rounded-xl border border-border bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                      <p className="mt-1 text-lg font-mono font-bold">{card.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{card.detail}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHART OF ACCOUNTS */}
      {activeTab === "accounts" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>Master list of financial accounts used across journal entries and balance sheets.</CardDescription>
              </div>
              <Button onClick={() => setCreateAccountOpen(true)} className="bg-primary text-white">
                <Plus className="h-4 w-4 mr-2" /> Add Account
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account Search & Category Filters */}
              <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by code or name..."
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-1 bg-secondary/50 p-1 rounded-lg">
                  {["ALL", "ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setAccountTypeFilter(type)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        accountTypeFilter === type ? "bg-white shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accounts Table */}
              <div className="rounded-xl border border-border overflow-hidden bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-secondary/40 font-medium uppercase tracking-wider text-xs text-muted-foreground border-b border-border">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Account Name</th>
                      <th className="p-3.5">Type</th>
                      <th className="p-3.5 text-right">Current Balance (NPR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {accountsQuery.isLoading ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          Loading Chart of Accounts...
                        </td>
                      </tr>
                    ) : filteredAccounts.length > 0 ? (
                      filteredAccounts.map((acc: RawAccount) => (
                        <tr key={acc.id} className="hover:bg-secondary/20 transition-colors">
                          <td className="p-3.5 font-mono font-semibold text-primary">{acc.code}</td>
                          <td className="p-3.5 font-medium">{acc.name}</td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                acc.type === "ASSET"
                                  ? "bg-blue-100 text-blue-800"
                                  : acc.type === "LIABILITY"
                                  ? "bg-red-100 text-red-800"
                                  : acc.type === "EQUITY"
                                  ? "bg-purple-100 text-purple-800"
                                  : acc.type === "INCOME"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {acc.type}
                            </span>
                          </td>
                          <td className="p-3.5 text-right font-mono font-semibold tabular-nums">
                            {formatCurrency(Number(acc.balance))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No matching accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: JOURNAL ENTRIES & GL */}
      {activeTab === "journal" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>General Ledger & Journal Entries</CardTitle>
                <CardDescription>Complete double-entry accounting trail of balanced debits and credits.</CardDescription>
              </div>
              <Button onClick={() => setCreateJournalOpen(true)} className="bg-primary text-white">
                <Plus className="h-4 w-4 mr-2" /> Post Journal Entry
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {journalEntriesQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : journalEntriesQuery.data?.items && journalEntriesQuery.data.items.length > 0 ? (
                <div className="space-y-3">
                  {journalEntriesQuery.data.items.map((entry: RawJournalEntryDetailed) => {
                    const isExpanded = expandedEntryId === entry.id;
                    const totalDebit = entry.lines?.reduce((sum, l) => sum + Number(l.debit || 0), 0) || 0;
                    const totalCredit = entry.lines?.reduce((sum, l) => sum + Number(l.credit || 0), 0) || 0;

                    return (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-border bg-white overflow-hidden shadow-sm transition-all"
                      >
                        <div
                          className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors gap-3"
                          onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-muted-foreground">
                              {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                            </div>
                            <div>
                              <p className="font-semibold">{entry.description}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {formatDate(entry.date)} · By {entry.createdBy?.name || "System"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            {entry.reference && (
                              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-secondary font-medium">
                                Ref: {entry.reference}
                              </span>
                            )}
                            <div className="text-right font-mono text-xs font-semibold">
                              <span className="text-emerald-700">Dr: {formatCurrency(totalDebit)}</span>
                              <span className="mx-1 text-muted-foreground">|</span>
                              <span className="text-blue-700">Cr: {formatCurrency(totalCredit)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Line Items Detail */}
                        {isExpanded && (
                          <div className="border-t border-border bg-secondary/10 p-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                              Journal Entry Lines
                            </h4>
                            <div className="rounded-lg border border-border bg-white overflow-hidden text-xs">
                              <table className="w-full text-left">
                                <thead className="bg-secondary/30 font-medium uppercase text-muted-foreground">
                                  <tr>
                                    <th className="p-2.5">Account Code & Name</th>
                                    <th className="p-2.5">Type</th>
                                    <th className="p-2.5 text-right">Debit (NPR)</th>
                                    <th className="p-2.5 text-right">Credit (NPR)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                  {entry.lines?.map((line) => (
                                    <tr key={line.id}>
                                      <td className="p-2.5 font-medium">
                                        <span className="font-mono font-semibold text-primary mr-2">
                                          {line.account?.code || "GL"}
                                        </span>
                                        {line.account?.name || "Account"}
                                      </td>
                                      <td className="p-2.5 text-muted-foreground">{line.account?.type || "-"}</td>
                                      <td className="p-2.5 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                                        {Number(line.debit) > 0 ? formatCurrency(Number(line.debit)) : "-"}
                                      </td>
                                      <td className="p-2.5 text-right font-mono font-semibold text-blue-700 tabular-nums">
                                        {Number(line.credit) > 0 ? formatCurrency(Number(line.credit)) : "-"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Pagination Controls */}
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Showing Page {journalPage} of {Math.ceil((journalEntriesQuery.data?.total || 0) / 20)}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={journalPage <= 1}
                        onClick={() => setJournalPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={
                          journalPage >= Math.ceil((journalEntriesQuery.data?.total || 0) / 20)
                        }
                        onClick={() => setJournalPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-muted-foreground">No journal entries logged yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 4: BANK & RECONCILIATION */}
      {activeTab === "reconcile" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bank & Cash Reconciliation</CardTitle>
                <CardDescription>Reconcile cash and bank accounts against official bank statements.</CardDescription>
              </div>
              <Button onClick={() => setBankReconcileOpen(true)} className="bg-primary text-white">
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Import Statement CSV
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 text-sm">Automated Payment Matching</h4>
                    <p className="text-xs text-blue-700 mt-1">
                      Upload your bank's monthly CSV statement to match transactions automatically against customer AR payments and supplier disbursements by reference number and exact NPR amounts.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Liquidity Account Reconciliation Overview</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {(data?.liquidityAccounts || []).map((acc) => (
                    <div key={acc.name} className="rounded-xl border border-border p-4 bg-white shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Landmark className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{acc.name}</p>
                            <p className="text-xs text-muted-foreground">General Ledger Account</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground">Book Balance:</p>
                        <p className="font-mono font-bold text-base">{formatCurrency(acc.balance)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
