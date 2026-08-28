import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  BarChart3,
  ClipboardCheck,
  FileText,
  Package,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  ArrowDownUp,
  CreditCard,
  Factory,
  ShieldCheck,
  Download,
  Calendar,
  Filter,
  ChevronDown,
  Printer,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReportsQuery,
  useTrialBalanceQuery,
  useTaxSummaryQuery,
  useArAgingReportQuery,
  useApAgingReportQuery,
  useOutstandingReceivablesQuery,
  useSalesTrendQuery,
  usePurchaseOrdersReportQuery,
  useInventoryValuationQuery,
  useAuditLogQuery,
  useStockMovementsQuery,
  useCustomReportPreviewMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency, formatDate, formatNumber, toNumber } from "@/lib/utils";
import type { ReportBuilderEntity } from "@/types/domain";

type ReportCategory = 
  | "financial"
  | "receivables"
  | "sales"
  | "inventory"
  | "purchasing"
  | "tax"
  | "custom";

const categoryTabs: { id: ReportCategory; label: string; icon: LucideIcon; color: string; roles: string[] }[] = [
  { id: "financial", label: "Financial", icon: FileText, color: "bg-blue-50 text-blue-600", roles: ["ADMIN", "ACCOUNTANT"] },
  { id: "receivables", label: "Receivables & Payables", icon: CreditCard, color: "bg-emerald-50 text-emerald-600", roles: ["ADMIN", "ACCOUNTANT", "SALES"] },
  { id: "sales", label: "Sales & Revenue", icon: TrendingUp, color: "bg-purple-50 text-purple-600", roles: ["ADMIN", "ACCOUNTANT", "SALES"] },
  { id: "inventory", label: "Inventory & Stock", icon: Package, color: "bg-amber-50 text-amber-600", roles: ["ADMIN", "ACCOUNTANT", "WAREHOUSE"] },
  { id: "purchasing", label: "Purchasing", icon: Factory, color: "bg-indigo-50 text-indigo-600", roles: ["ADMIN", "ACCOUNTANT", "WAREHOUSE"] },
  { id: "tax", label: "Tax & Compliance", icon: ShieldCheck, color: "bg-red-50 text-red-600", roles: ["ADMIN", "ACCOUNTANT"] },
  { id: "custom", label: "Custom Builder", icon: BarChart3, color: "bg-slate-50 text-slate-600", roles: ["ADMIN", "ACCOUNTANT", "SALES"] },
];

const presetOptions: Record<ReportBuilderEntity, { label: string; fields: string; filters: string; groupBy: string }> = {
  sales: { label: "Sales", fields: "orderId, customer, status, total, balanceDue", filters: "status=CONFIRMED", groupBy: "status" },
  inventory: { label: "Inventory", fields: "product, variant, warehouse, quantity, status", filters: "status=IN_STOCK", groupBy: "warehouse" },
  customers: { label: "Customers", fields: "customer, type, email, lifetimeRevenue, outstandingBalance", filters: "type=RETAIL", groupBy: "type" },
  suppliers: { label: "Suppliers", fields: "supplier, country, leadTimeDays, totalSpend", filters: "country=Nepal", groupBy: "country" },
  finance: { label: "Finance", fields: "entryId, date, description, sourceType, lineCount", filters: "sourceType=invoice", groupBy: "sourceType" },
};

function parseCsvList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseFilterPairs(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).reduce<Record<string, string>>((acc, item) => {
    const [key, ...rest] = item.split("=");
    const normalizedKey = key?.trim();
    const normalizedValue = rest.join("=").trim();
    if (normalizedKey && normalizedValue) acc[normalizedKey] = normalizedValue;
    return acc;
  }, {});
}

function formatColumnLabel(value: string) {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function renderPreviewValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * Generic export to CSV
 */
function exportToCSV(data: any[], filename: string, columns?: string[]) {
  if (!data || data.length === 0) {
    toast("No data to export");
    return;
  }
  const keys = columns || Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map(row => keys.map(key => {
    const val = row[key];
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
    if (typeof val === "string" && (val.includes(",") || val.includes('"') || val.includes("\n"))) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return String(val);
  }).join(","));
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${data.length} rows to ${filename}`);
}

/**
 * KPI Card Component
 */
function KPICard({ label, value, icon: Icon, trendClass, detail, onClick }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  trendClass: string;
  detail?: string;
  onClick?: () => void;
}) {
  return (
    <div 
      className={`flex items-center gap-4 rounded-2xl border border-border bg-white p-5 ${onClick ? "cursor-pointer hover:bg-secondary/50" : ""}`}
      onClick={onClick}
    >
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${trendClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          <p className="mt-0.5 truncate text-xl font-bold tracking-tight font-mono tabular-nums">{value}</p>
        </div>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

/**
 * Data Table with export and print
 */
function DataTable({ 
  columns, 
  data, 
  title, 
  exportFilename,
  emptyMessage = "No data available",
  renderRow,
  onResetFilters,
}: {
  columns: { key: string; label: string; render?: (row: any) => React.ReactNode; align?: "left" | "center" | "right" }[];
  data: any[];
  title: string;
  exportFilename: string;
  emptyMessage?: string;
  renderRow?: (row: any) => React.ReactNode;
  onResetFilters?: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2 no-print">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(data, exportFilename)}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            {onResetFilters && (
              <Button variant="outline" size="sm" onClick={onResetFilters}>
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} style={{ textAlign: col.align || "left" }}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((col) => (
                      <TableCell key={col.key} style={{ textAlign: col.align || "left" }}>
                        {col.render ? col.render(row) : renderPreviewValue(row[col.key])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Date Range Picker Component with Fiscal Year & Quick Presets
 */
function DateRangePicker({ 
  startDate, 
  endDate, 
  onChange,
  label = "Date Range"
}: {
  startDate?: Date;
  endDate?: Date;
  onChange: (start?: Date, end?: Date) => void;
  label?: string;
}) {
  const [startStr, setStartStr] = useState(startDate?.toISOString().slice(0, 10) || "");
  const [endStr, setEndStr] = useState(endDate?.toISOString().slice(0, 10) || "");
  
  useEffect(() => {
    setStartStr(startDate ? startDate.toISOString().slice(0, 10) : "");
    setEndStr(endDate ? endDate.toISOString().slice(0, 10) : "");
  }, [startDate, endDate]);

  const applyPreset = (preset: string) => {
    const now = new Date();
    let s: Date | undefined;
    let e: Date | undefined;

    if (preset === "this-month") {
      s = new Date(now.getFullYear(), now.getMonth(), 1);
      e = now;
    } else if (preset === "last-month") {
      s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      e = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === "fy-2080-81") {
      s = new Date("2023-07-17");
      e = new Date("2024-07-15");
    } else if (preset === "fy-2081-82") {
      s = new Date("2024-07-16");
      e = new Date("2025-07-15");
    } else if (preset === "clear") {
      s = undefined;
      e = undefined;
    }

    onChange(s, e);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-secondary/30 p-2.5 rounded-xl border border-border">
      <div className="flex items-center gap-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
        <Input 
          type="date" 
          value={startStr} 
          onChange={(e) => {
            setStartStr(e.target.value);
            onChange(e.target.value ? new Date(e.target.value) : undefined, endStr ? new Date(endStr) : undefined);
          }} 
          className="w-36 h-9 text-xs"
        />
        <span className="text-xs text-muted-foreground font-medium">to</span>
        <Input 
          type="date" 
          value={endStr} 
          onChange={(e) => {
            setEndStr(e.target.value);
            onChange(startStr ? new Date(startStr) : undefined, e.target.value ? new Date(e.target.value) : undefined);
          }} 
          className="w-36 h-9 text-xs"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium" onClick={() => applyPreset("this-month")}>
          This Month
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium" onClick={() => applyPreset("last-month")}>
          Last Month
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium" onClick={() => applyPreset("fy-2080-81")}>
          FY 2080/81
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs font-medium" onClick={() => applyPreset("fy-2081-82")}>
          FY 2081/82
        </Button>
        {(startStr || endStr) && (
          <Button variant="outline" size="sm" className="h-8 text-xs text-muted-foreground" onClick={() => applyPreset("clear")}>
            Reset Filters
          </Button>
        )}
      </div>
    </div>
  );
}

export function ReportingPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ReportCategory>("financial");
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});
  const [customEntity, setCustomEntity] = useState<ReportBuilderEntity>("sales");
  const [customFields, setCustomFields] = useState(presetOptions.sales.fields);
  const [customFilters, setCustomFilters] = useState(presetOptions.sales.filters);
  const [customGroupBy, setCustomGroupBy] = useState(presetOptions.sales.groupBy);

  // Check permissions
  const canAccess = (roles: string[]) => roles.includes(user?.role || "");
  
  // Fetch all reports lazily
  const { data: reportsData, error: reportsError, isLoading: reportsLoading } = useReportsQuery();
  const { data: trialBalance, isLoading: tbLoading } = useTrialBalanceQuery();
  const { data: taxSummary, isLoading: tsLoading } = useTaxSummaryQuery(dateRange.start, dateRange.end);
  const { data: arAging, isLoading: arLoading } = useArAgingReportQuery(dateRange.start, dateRange.end);
  const { data: apAging, isLoading: apLoading } = useApAgingReportQuery();
  const { data: outstandingReceivables, isLoading: orLoading } = useOutstandingReceivablesQuery();
  const { data: salesTrend, isLoading: stLoading } = useSalesTrendQuery(dateRange.start, dateRange.end, "month");
  const { data: purchaseReport, isLoading: prLoading } = usePurchaseOrdersReportQuery(dateRange.start, dateRange.end);
  const { data: inventoryValuation, isLoading: ivLoading } = useInventoryValuationQuery();
  const { data: auditLog, isLoading: alLoading } = useAuditLogQuery({ 
    startDate: dateRange.start, 
    endDate: dateRange.end,
    page: 1,
    pageSize: 100 
  });
  const { data: stockMovements, isLoading: smLoading } = useStockMovementsQuery({ 
    startDate: dateRange.start, 
    endDate: dateRange.end,
    page: 1,
    pageSize: 100 
  });

  const previewMutation = useCustomReportPreviewMutation();
  const [previewData, setPreviewData] = useState<any>(null);

  // Permission check
  if (!canAccess(["ADMIN", "ACCOUNTANT", "SALES"])) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Reporting access required.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Reporting and analytics are available to Admin, Accountant, and Sales roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  const loading = reportsLoading || tbLoading || tsLoading || arLoading || apLoading || orLoading || stLoading || prLoading || ivLoading || alLoading || smLoading;

  if (loading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (reportsError) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Reports could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(reportsError)}</p>
        </CardContent>
      </Card>
    );
  }

  const handleCustomEntityChange = (nextEntity: ReportBuilderEntity) => {
    setCustomEntity(nextEntity);
    setCustomFields(presetOptions[nextEntity].fields);
    setCustomFilters(presetOptions[nextEntity].filters);
    setCustomGroupBy(presetOptions[nextEntity].groupBy);
    previewMutation.reset();
    setPreviewData(null);
  };

  const handlePreviewCustomReport = async () => {
    const fieldList = parseCsvList(customFields);
    if (fieldList.length === 0) {
      toast("Fields required", { description: "Add at least one field to preview a custom report." });
      return;
    }
    previewMutation.reset();
    try {
      const result = await previewMutation.mutateAsync({
        entity: customEntity,
        fields: fieldList,
        filters: parseFilterPairs(customFilters),
        groupBy: parseCsvList(customGroupBy),
      });
      setPreviewData(result);
    } catch (requestError) {
      toast.error("Preview failed", { description: getErrorMessage(requestError) });
    }
  };

  // Financial Summary Data
  const financialSummary = reportsData?.reportCards.find(r => r.id === "financial-summary");
  const profitLoss = reportsData?.reportCards.find(r => r.id === "financial-summary") ? 
    (reportsData as any).profitAndLoss : null;

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="space-y-4">
        <PageHeader title="Report Center" />
        
        {/* Date Range Filter - applies to all time-based reports */}
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 p-4">
            <DateRangePicker 
              startDate={dateRange.start} 
              endDate={dateRange.end} 
              onChange={(start, end) => setDateRange({ start, end })}
              label="Filter Period:"
            />
            <div className="flex-1" />
            <Badge variant="secondary" className="text-xs">
              {user?.role} Access
            </Badge>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 border-b border-border pb-2">
          {categoryTabs
            .filter(tab => canAccess(tab.roles))
            .map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? `border-primary text-primary ${tab.color} bg-opacity-10`
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "financial" && canAccess(["ADMIN", "ACCOUNTANT"]) && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <KPICard 
              label="Net Profit" 
              value={formatCurrency(toNumber(reportsData?.profitAndLoss?.netProfit || 0))} 
              icon={TrendingUp} 
              trendClass="bg-emerald-50 text-emerald-600"
              detail={`Income ${formatCurrency(toNumber(reportsData?.profitAndLoss?.income || 0))} • Expenses ${formatCurrency(toNumber(reportsData?.profitAndLoss?.expenses || 0))}`}
            />
            <KPICard 
              label="Total Assets" 
              value={formatCurrency(toNumber(reportsData?.balanceSheet?.assets?.reduce((s: number, a: any) => s + toNumber(a.balance), 0) || 0))} 
              icon={Wallet} 
              trendClass="bg-blue-50 text-blue-600"
              detail={`Liabilities ${formatCurrency(toNumber(reportsData?.balanceSheet?.liabilities?.reduce((s: number, a: any) => s + toNumber(a.balance), 0) || 0))}`}
            />
            <KPICard 
              label="Operating Cash" 
              value={formatCurrency(toNumber(reportsData?.cashFlow?.operating || 0))} 
              icon={ArrowDownUp} 
              trendClass="bg-purple-50 text-purple-600"
              detail={`Net ${formatCurrency(toNumber(reportsData?.cashFlow?.netChange || 0))}`}
            />
            <KPICard 
              label="AR Balance" 
              value={formatCurrency(reportsData?.arAging?.reduce((s: number, r: any) => s + toNumber(r.balance), 0) || 0)} 
              icon={CreditCard} 
              trendClass="bg-amber-50 text-amber-600"
            />
            <KPICard 
              label="Net Tax Payable" 
              value={formatCurrency(toNumber(taxSummary?.netPayable || 0))} 
              icon={ShieldCheck} 
              trendClass="bg-red-50 text-red-600"
              detail={`Output ${formatCurrency(toNumber(taxSummary?.outputTax || 0))} • Input ${formatCurrency(toNumber(taxSummary?.inputTax || 0))}`}
            />
          </div>

          {/* Financial Statements Grid */}
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Profit & Loss */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Profit & Loss Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between font-medium text-sm">
                  <span>Revenue</span>
                  <span className="text-emerald-600">{formatCurrency(toNumber(reportsData?.profitAndLoss?.income || 0))}</span>
                </div>
                <div className="flex justify-between font-medium text-sm">
                  <span>Expenses</span>
                  <span className="text-red-600">{formatCurrency(toNumber(reportsData?.profitAndLoss?.expenses || 0))}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Net Profit</span>
                  <span className={toNumber(reportsData?.profitAndLoss?.netProfit || 0) >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {formatCurrency(toNumber(reportsData?.profitAndLoss?.netProfit || 0))}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => exportToCSV(
                  [{...reportsData?.profitAndLoss, period: dateRange.start?.toISOString().slice(0,10) + " to " + dateRange.end?.toISOString().slice(0,10)}], 
                  "profit-loss.csv"
                )}>
                  <Download className="h-4 w-4 mr-2" /> Export P&L
                </Button>
              </CardContent>
            </Card>

            {/* Balance Sheet */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Balance Sheet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between font-medium text-sm">
                  <span>Total Assets</span>
                  <span>{formatCurrency(toNumber(reportsData?.balanceSheet?.assets?.reduce((s: number, a: any) => s + toNumber(a.balance), 0) || 0))}</span>
                </div>
                <div className="flex justify-between font-medium text-sm">
                  <span>Total Liabilities</span>
                  <span>{formatCurrency(toNumber(reportsData?.balanceSheet?.liabilities?.reduce((s: number, a: any) => s + toNumber(a.balance), 0) || 0))}</span>
                </div>
                <div className="flex justify-between font-medium text-sm">
                  <span>Equity</span>
                  <span>{formatCurrency(toNumber(reportsData?.balanceSheet?.equity?.reduce((s: number, a: any) => s + toNumber(a.balance), 0) || 0))}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => exportToCSV(
                  [...(reportsData?.balanceSheet?.assets || []).map((a: any) => ({type: "Asset", ...a})), 
                   ...(reportsData?.balanceSheet?.liabilities || []).map((a: any) => ({type: "Liability", ...a})),
                   ...(reportsData?.balanceSheet?.equity || []).map((a: any) => ({type: "Equity", ...a}))], 
                  "balance-sheet.csv"
                )}>
                  <Download className="h-4 w-4 mr-2" /> Export Balance Sheet
                </Button>
              </CardContent>
            </Card>

            {/* Cash Flow */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Cash Flow Statement</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Operating</span>
                  <span>{formatCurrency(toNumber(reportsData?.cashFlow?.operating || 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Investing</span>
                  <span>{formatCurrency(toNumber(reportsData?.cashFlow?.investing || 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Financing</span>
                  <span>{formatCurrency(toNumber(reportsData?.cashFlow?.financing || 0))}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Net Change</span>
                  <span>{formatCurrency(toNumber(reportsData?.cashFlow?.netChange || 0))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Trial Balance */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Trial Balance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between font-medium text-sm">
                  <span>Total Debits</span>
                  <span>{formatCurrency(trialBalance?.reduce((s: number, r: any) => s + toNumber(r.debit), 0) || 0)}</span>
                </div>
                <div className="flex justify-between font-medium text-sm">
                  <span>Total Credits</span>
                  <span>{formatCurrency(trialBalance?.reduce((s: number, r: any) => s + toNumber(r.credit), 0) || 0)}</span>
                </div>
                <div className="flex justify-between font-bold" style={{ color: Math.abs(
                  (trialBalance?.reduce((s: number, r: any) => s + toNumber(r.debit), 0) || 0) - 
                  (trialBalance?.reduce((s: number, r: any) => s + toNumber(r.credit), 0) || 0)
                ) < 0.01 ? "green" : "red" }}>
                  <span>Difference</span>
                  <span>{formatCurrency(Math.abs(
                    (trialBalance?.reduce((s: number, r: any) => s + toNumber(r.debit), 0) || 0) - 
                    (trialBalance?.reduce((s: number, r: any) => s + toNumber(r.credit), 0) || 0)
                  ))}</span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => exportToCSV(
                  trialBalance || [], "trial-balance.csv"
                )}>
                  <Download className="h-4 w-4 mr-2" /> Export Trial Balance
                </Button>
              </CardContent>
            </Card>

            {/* Tax Summary */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Tax Summary (VAT)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Output VAT (Sales)</span>
                  <span>{formatCurrency(toNumber(taxSummary?.outputTax || 0))}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Input VAT (Purchases)</span>
                  <span>{formatCurrency(toNumber(taxSummary?.inputTax || 0))}</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Net Payable</span>
                  <span className={toNumber(taxSummary?.netPayable || 0) >= 0 ? "text-red-600" : "text-emerald-600"}>
                    {formatCurrency(toNumber(taxSummary?.netPayable || 0))}
                  </span>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => exportToCSV(
                  [{outputTax: taxSummary?.outputTax, inputTax: taxSummary?.inputTax, netPayable: taxSummary?.netPayable}], 
                  "tax-summary.csv"
                )}>
                  <Download className="h-4 w-4 mr-2" /> Export Tax Summary
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "receivables" && canAccess(["ADMIN", "ACCOUNTANT", "SALES"]) && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KPICard 
              label="Total Outstanding AR" 
              value={formatCurrency(outstandingReceivables?.rows?.reduce((s: number, r: any) => s + toNumber(r.balanceDue), 0) || 0)} 
              icon={CreditCard} 
              trendClass="bg-blue-50 text-blue-600"
            />
            <KPICard 
              label="Overdue (90+)" 
              value={formatCurrency(outstandingReceivables?.rows?.filter((r: any) => r.bucket === "90+").reduce((s: number, r: any) => s + toNumber(r.balanceDue), 0) || 0)} 
              icon={Users} 
              trendClass="bg-red-50 text-red-600"
            />
            <KPICard 
              label="Total AP" 
              value={formatCurrency(apAging?.rows?.reduce((s: number, r: any) => s + toNumber(r.balance), 0) || 0)} 
              icon={Receipt} 
              trendClass="bg-amber-50 text-amber-600"
            />
            <KPICard 
              label="AP Overdue" 
              value={formatCurrency(apAging?.rows?.filter((r: any) => r.bucket === "90+").reduce((s: number, r: any) => s + toNumber(r.balance), 0) || 0)} 
              icon={Factory} 
              trendClass="bg-orange-50 text-orange-600"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DataTable
              title="AR Aging by Customer"
              exportFilename="ar-aging.csv"
              data={arAging?.rows || []}
              columns={[
                { key: "customerId", label: "Customer ID" },
                { key: "customerName", label: "Customer", render: (r) => r.customerName || r.customer },
                { key: "bucket0_30", label: "0-30 Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket0_30 || 0)) },
                { key: "bucket31_60", label: "31-60 Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket31_60 || 0)) },
                { key: "bucket61_90", label: "61-90 Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket61_90 || 0)) },
                { key: "bucket90_plus", label: "90+ Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket90_plus || 0)) },
                { key: "totalOutstanding", label: "Total", align: "right" as const, render: (r) => formatCurrency(toNumber(r.totalOutstanding || 0)) },
              ]}
            />
            <DataTable
              title="AP Aging by Supplier"
              exportFilename="ap-aging.csv"
              data={apAging?.rows || []}
              columns={[
                { key: "supplierId", label: "Supplier ID" },
                { key: "supplierName", label: "Supplier", render: (r) => r.supplierName || r.supplier },
                { key: "bucket0_30", label: "0-30 Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket0_30 || 0)) },
                { key: "bucket31_60", label: "31-60 Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket31_60 || 0)) },
                { key: "bucket61_90", label: "61-90 Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket61_90 || 0)) },
                { key: "bucket90_plus", label: "90+ Days", align: "right" as const, render: (r) => formatCurrency(toNumber(r.bucket90_plus || 0)) },
                { key: "totalOutstanding", label: "Total", align: "right" as const, render: (r) => formatCurrency(toNumber(r.totalOutstanding || 0)) },
              ]}
            />
            <DataTable
              title="Outstanding Receivables Detail"
              exportFilename="outstanding-receivables.csv"
              data={outstandingReceivables?.rows || []}
              columns={[
                { key: "salesOrderId", label: "Order ID", render: (r) => r.salesOrderId?.slice(0,8) },
                { key: "customer", label: "Customer" },
                { key: "customerType", label: "Type", render: (r) => <Badge variant="secondary">{r.customerType}</Badge> },
                { key: "salesperson", label: "Salesperson" },
                { key: "orderDate", label: "Order Date", render: (r) => formatDate(r.orderDate) },
                { key: "dueDate", label: "Due Date", render: (r) => formatDate(r.dueDate) },
                { key: "daysOverdue", label: "Days Overdue", align: "center" as const, render: (r) => <Badge variant={r.daysOverdue > 90 ? "destructive" : r.daysOverdue > 30 ? "warning" : "default"}>{r.daysOverdue}</Badge> },
                { key: "bucket", label: "Bucket" },
                { key: "balanceDue", label: "Balance Due", align: "right" as const, render: (r) => formatCurrency(toNumber(r.balanceDue)) },
                { key: "isInvoiced", label: "Invoiced", render: (r) => r.isInvoiced ? "✓" : "✗" },
                { key: "latestInvoiceNumber", label: "Latest Invoice" },
              ]}
            />
          </div>
        </div>
      )}

      {activeTab === "sales" && canAccess(["ADMIN", "ACCOUNTANT", "SALES"]) && (
        <div className="space-y-6">
          {/* KPI Row */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KPICard 
              label="Total Revenue" 
              value={formatCurrency(salesTrend?.rows?.reduce((s: number, r: any) => s + toNumber(r.revenue), 0) || 0)} 
              icon={TrendingUp} 
              trendClass="bg-emerald-50 text-emerald-600"
              detail={`${formatNumber(salesTrend?.rows?.reduce((s: number, r: any) => s + toNumber(r.quantity), 0) || 0)} units`}
            />
            <KPICard 
              label="Total Orders" 
              value={formatNumber(salesTrend?.rows?.reduce((s: number, r: any) => s + toNumber(r.orders), 0) || 0)} 
              icon={ClipboardCheck} 
              trendClass="bg-blue-50 text-blue-600"
            />
            <KPICard 
              label="Avg Order Value" 
              value={
                salesTrend?.rows 
                  ? formatCurrency(
                      (salesTrend.rows.reduce((s: number, r: any) => s + toNumber(r.revenue), 0)) / 
                      Math.max(1, salesTrend.rows.reduce((s: number, r: any) => s + toNumber(r.orders), 0))
                    )
                  : "—"
              } 
              icon={Wallet} 
              trendClass="bg-purple-50 text-purple-600"
            />
            <KPICard 
              label="Active Months" 
              value={formatNumber(salesTrend?.rows?.length || 0)} 
              icon={Calendar} 
              trendClass="bg-slate-50 text-slate-600"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <DataTable
              title="Monthly Sales Trend"
              exportFilename="sales-trend-monthly.csv"
              data={salesTrend?.rows || []}
              columns={[
                { key: "month", label: "Month" },
                { key: "revenue", label: "Revenue", align: "right" as const, render: (r) => formatCurrency(toNumber(r.revenue)) },
                { key: "quantity", label: "Units", align: "right" as const, render: (r) => formatNumber(toNumber(r.quantity)) },
                { key: "orders", label: "Orders", align: "right" as const, render: (r) => formatNumber(toNumber(r.orders)) },
              ]}
            />
            {/* Sales by Salesperson */}
            <Card>
              <CardHeader className="pb-4 flex flex-row items-center justify-between">
                <CardTitle>Sales by Salesperson</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">View:</span>
                  <select 
                    defaultValue="salesperson"
                    className="h-8 rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    onChange={() => {}}
                  >
                    <option value="salesperson">Salesperson</option>
                    <option value="category">Category</option>
                    <option value="month">Month</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  title=""
                  exportFilename="sales-by-salesperson.csv"
                  data={salesTrend?.rows || []} // Will be fetched with groupBy=salesperson
                  columns={[
                    { key: "name", label: "Salesperson" },
                    { key: "revenue", label: "Revenue", align: "right" as const, render: (r) => formatCurrency(toNumber(r.revenue)) },
                    { key: "quantity", label: "Units", align: "right" as const, render: (r) => formatNumber(toNumber(r.quantity)) },
                    { key: "orders", label: "Orders", align: "right" as const, render: (r) => formatNumber(toNumber(r.orders)) },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "inventory" && canAccess(["ADMIN", "ACCOUNTANT", "WAREHOUSE"]) && (() => {
        const valItems = inventoryValuation?.items || (inventoryValuation as any)?.rows || [];
        const totalVal = inventoryValuation?.totalValue ?? (inventoryValuation as any)?.grandTotal ?? 0;
        const totalUnits = valItems.reduce((s: number, r: any) => s + toNumber(r.stockQuantity ?? r.totalQty ?? 0), 0);
        const categoriesCount = new Set(valItems.map((r: any) => r.category)).size;

        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
              <KPICard 
                label="Total Inventory Value" 
                value={formatCurrency(totalVal)} 
                icon={Package} 
                trendClass="bg-blue-50 text-blue-600"
              />
              <KPICard 
                label="Total Variants" 
                value={formatNumber(valItems.length)} 
                icon={BarChart3} 
                trendClass="bg-purple-50 text-purple-600"
              />
              <KPICard 
                label="Total Units" 
                value={formatNumber(totalUnits)} 
                icon={ArrowDownUp} 
                trendClass="bg-emerald-50 text-emerald-600"
              />
              <KPICard 
                label="Categories" 
                value={formatNumber(categoriesCount)} 
                icon={ClipboardCheck} 
                trendClass="bg-amber-50 text-amber-600"
              />
            </div>

            <DataTable
              title="Inventory Valuation by Product"
              exportFilename="inventory-valuation.csv"
              data={valItems}
              columns={[
                { key: "product", label: "Product" },
                { key: "variant", label: "Variant" },
                { key: "category", label: "Category" },
                { key: "stockQuantity", label: "Stock Qty", align: "right" as const, render: (r) => formatNumber(toNumber(r.stockQuantity ?? r.totalQty ?? 0)) },
                { key: "unitCost", label: "Unit Cost", align: "right" as const, render: (r) => formatCurrency(toNumber(r.unitCost)) },
                { key: "totalValue", label: "Total Value", align: "right" as const, render: (r) => formatCurrency(toNumber(r.totalValue)) },
              ]}
            />

            <DataTable
              title="Stock Movement History"
              exportFilename="stock-movements.csv"
              data={stockMovements?.movements || []}
              columns={[
                { key: "occurredAt", label: "Date & Time", render: (r) => formatDate(r.occurredAt) },
                { key: "product", label: "Product" },
                { key: "variant", label: "Variant" },
                { key: "type", label: "Type", render: (r) => <Badge variant="secondary">{r.type}</Badge> },
                { key: "quantity", label: "Qty Delta", align: "right" as const, render: (r) => (
                  <span className={r.quantity > 0 ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                    {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
                  </span>
                )},
                { key: "balanceAfter", label: "Balance After", align: "right" as const, render: (r) => formatNumber(r.balanceAfter) },
                { key: "warehouse", label: "Warehouse" },
                { key: "user", label: "User" },
                { key: "reason", label: "Reason / Source", render: (r) => r.reason || r.source || "—" },
              ]}
            />
          </div>
        );
      })()}

      {activeTab === "purchasing" && canAccess(["ADMIN", "ACCOUNTANT", "WAREHOUSE"]) && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <KPICard 
              label="Total PO Value" 
              value={formatCurrency(purchaseReport?.totalPoValue || 0)} 
              icon={Wallet} 
              trendClass="bg-blue-50 text-blue-600"
            />
            <KPICard 
              label="Total POs" 
              value={formatNumber(purchaseReport?.totalPoCount || 0)} 
              icon={ClipboardCheck} 
              trendClass="bg-purple-50 text-purple-600"
            />
            <KPICard 
              label="Supplier Spend" 
              value={formatCurrency(purchaseReport?.supplierSpend?.reduce((s: number, r: any) => s + toNumber(r.spend), 0) || 0)} 
              icon={Factory} 
              trendClass="bg-emerald-50 text-emerald-600"
            />
            <KPICard 
              label="Active Suppliers" 
              value={formatNumber(purchaseReport?.supplierSpend?.length || 0)} 
              icon={Users} 
              trendClass="bg-amber-50 text-amber-600"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>PO Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(purchaseReport?.statusBreakdown || {}).map(([status, count]) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className="capitalize">{status.replace(/_/g, " ")}</span>
                    <Badge variant="secondary">{String(count)}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <DataTable
              title="Supplier Spend Analysis"
              exportFilename="supplier-spend.csv"
              data={purchaseReport?.supplierSpend || []}
              columns={[
                { key: "supplier", label: "Supplier" },
                { key: "spend", label: "Total Spend", align: "right" as const, render: (r) => formatCurrency(toNumber(r.spend)) },
                { key: "invoices", label: "Invoices", align: "center" as const },
                { key: "paid", label: "Paid", align: "right" as const, render: (r) => formatCurrency(toNumber(r.paid)) },
                { key: "pending", label: "Pending", align: "right" as const, render: (r) => formatCurrency(toNumber(r.pending)) },
              ]}
            />
          </div>
        </div>
      )}

      {activeTab === "tax" && canAccess(["ADMIN", "ACCOUNTANT"]) && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            <KPICard 
              label="Output VAT" 
              value={formatCurrency(toNumber(taxSummary?.outputTax || 0))} 
              icon={TrendingUp} 
              trendClass="bg-emerald-50 text-emerald-600"
            />
            <KPICard 
              label="Input VAT" 
              value={formatCurrency(toNumber(taxSummary?.inputTax || 0))} 
              icon={ArrowDownUp} 
              trendClass="bg-blue-50 text-blue-600"
            />
            <KPICard 
              label="Net VAT Payable" 
              value={formatCurrency(toNumber(taxSummary?.netPayable || 0))} 
              icon={ShieldCheck} 
              trendClass={toNumber(taxSummary?.netPayable || 0) >= 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {/* VAT Register Summary - linked to VAT Register page */}
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>VAT Register (Sales Book)</CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/vat-register">View Full Register →</a>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Monthly VAT register with IRD-compliant formatting. Shows all VAT/PAN invoices with BS dates.
                </p>
                <Button variant="outline" size="sm" className="w-full" onClick={() => window.open("/vat-register", "_blank")}>
                  Open VAT Register
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  title=""
                  exportFilename="audit-log.csv"
                  data={auditLog?.logs || []}
                  columns={[
                    { key: "timestamp", label: "Time", render: (r) => formatDate(r.timestamp) },
                    { key: "action", label: "Action", render: (r) => <Badge variant="secondary">{r.action}</Badge> },
                    { key: "entityType", label: "Entity" },
                    { key: "entityId", label: "Entity ID", render: (r) => r.entityId?.slice(0, 8) },
                    { key: "user", label: "User" },
                    { key: "ipAddress", label: "IP" },
                  ]}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeTab === "custom" && canAccess(["ADMIN", "ACCOUNTANT", "SALES"]) && (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Build focused exports when fixed reports aren't enough.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(presetOptions) as ReportBuilderEntity[]).map((candidate) => (
                  <Button
                    key={candidate}
                    type="button"
                    variant={customEntity === candidate ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleCustomEntityChange(candidate)}
                  >
                    {presetOptions[candidate].label}
                  </Button>
                ))}
              </div>
              <Input value={customFields} onChange={(e) => setCustomFields(e.target.value)} placeholder="Fields: invoiceNumber, customer, total" />
              <Input value={customFilters} onChange={(e) => setCustomFilters(e.target.value)} placeholder="Filters: status=paid, category=Sofa" />
              <Input value={customGroupBy} onChange={(e) => setCustomGroupBy(e.target.value)} placeholder="Group by: category, salesperson" />
              <Button className="w-full" onClick={handlePreviewCustomReport} disabled={previewMutation.isPending}>
                {previewMutation.isPending ? "Previewing..." : "Preview"}
              </Button>

              {previewMutation.error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {getErrorMessage(previewMutation.error, "Unable to preview custom report.")}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Preview</CardTitle>
              <CardDescription>
                {previewData
                  ? `Showing ${previewData.previewRows.length} of ${previewData.totalRows} matching ${presetOptions[previewData.entity as ReportBuilderEntity]?.label?.toLowerCase() || previewData.entity} rows.`
                  : "Run a preview to inspect the rows before export."}
              </CardDescription>
              {previewData && <Badge variant="outline">{previewData.exportLabel}</Badge>}
            </CardHeader>
            <CardContent>
              {previewMutation.isPending ? (
                <Skeleton className="h-[280px]" />
              ) : previewData ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-secondary px-3 py-1">Fields: {previewData.fields.join(", ")}</span>
                    <span className="rounded-md bg-secondary px-3 py-1">Group by: {previewData.groupBy.join(", ") || "None"}</span>
                    <span className="rounded-md bg-secondary px-3 py-1">
                      Filters: {Object.entries(previewData.filters).map(([k, v]) => `${k}=${renderPreviewValue(v)}`).join(", ") || "None"}
                    </span>
                  </div>

                  {previewData.previewRows.length > 0 ? (
                    <div className="overflow-hidden rounded-lg border border-border bg-white">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {previewData.previewColumns.map((column: string) => (
                                <TableHead key={column}>{formatColumnLabel(column)}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {previewData.previewRows.map((row: any, rowIndex: number) => (
                              <TableRow key={`${previewData.entity}-${rowIndex}`}>
                                {previewData.previewColumns.map((column: string) => (
                                  <TableCell key={`${rowIndex}-${column}`}>{renderPreviewValue(row[column])}</TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg bg-secondary/60 p-6 text-sm text-muted-foreground">
                      No rows matched the current field and filter combination.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-secondary/60 p-6 text-sm text-muted-foreground">
                  Choose a dataset and preview only the rows you need.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
