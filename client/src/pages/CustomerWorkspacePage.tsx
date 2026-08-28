import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { YearMonthFilter } from "@/components/shared/year-month-filter";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, formatEnumLabel, toNumber } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL } from "@/lib/api";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  Receipt,
  CreditCard,
  FileText,
  Download,
  Printer,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Activity,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import {
  useCustomerQuery,
  useCustomerLedgerQuery,
  useSalesOrdersQuery,
  usePaymentsQuery,
  useRecordPaymentMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import type { SalesOrderRow, PaymentRow } from "@/types/domain";
import { RecordDepositModal } from "@/components/sales/record-deposit-modal";
import { cn } from "@/lib/utils";

type CustomerWorkspaceTabs = "overview" | "orders" | "payments" | "ar-ledger" | "invoices" | "deliveries" | "activity";

const TAB_CONFIG: { id: CustomerWorkspaceTabs; label: string; icon: React.ReactNode; count?: number }[] = [
  { id: "overview", label: "Overview", icon: <Building2 className="h-4 w-4" /> },
  { id: "orders", label: "Orders", icon: <Package className="h-4 w-4" /> },
  { id: "payments", label: "Payments", icon: <DollarSign className="h-4 w-4" /> },
  { id: "ar-ledger", label: "AR Ledger", icon: <FileText className="h-4 w-4" /> },
  { id: "invoices", label: "Invoices", icon: <Receipt className="h-4 w-4" /> },
  { id: "deliveries", label: "Deliveries", icon: <Truck className="h-4 w-4" /> },
  { id: "activity", label: "Activity", icon: <Activity className="h-4 w-4" /> },
];

export function CustomerWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();

  const { data: customer, error, isLoading } = useCustomerQuery(id!);
  const { data: ledgerData } = useCustomerLedgerQuery(id!);
  const { data: salesOrdersData } = useSalesOrdersQuery();
  const { data: paymentsData } = usePaymentsQuery(1, 500, "", "", "");

  const [activeTab, setActiveTab] = useState<CustomerWorkspaceTabs>("overview");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [ledgerStartDate, setLedgerStartDate] = useState<Date>();
  const [ledgerEndDate, setLedgerEndDate] = useState<Date>();
  const [showLedgerFilters, setShowLedgerFilters] = useState(false);

  const recordPayment = useRecordPaymentMutation();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold text-destructive">Failed to load customer workspace.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  // ─── Compute Financial Metrics ───
  const orders = customer.salesOrders || [];
  const payments = paymentsData?.items?.filter((p: PaymentRow) => p.relatedEntityId === customer.id) || [];

  const totalPurchases = orders.reduce((sum, o) => sum + toNumber(o.total || o.orderAmount || o.grandTotal), 0);
  const totalPayments = payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
  const outstandingBalance = toNumber(customer.outstandingBalance || 0);
  const creditLimit = toNumber(customer.creditLimit || 0);
  const creditAvailable = creditLimit > 0 ? Math.max(0, creditLimit - outstandingBalance) : 0;
  const creditUtilization = creditLimit > 0 ? (outstandingBalance / creditLimit) * 100 : 0;

  // ─── Orders Table Columns ───
  const orderColumns: ColumnDef<any, unknown>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:underline" onClick={() => navigate(`/sales/${row.original.id}`)}>
          {row.original.id.slice(0, 12)}…
        </Button>
      ),
    },
    {
      accessorKey: "orderDate",
      header: "Date",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{formatDate(row.original.orderDate)}</div>
          <div className="text-xs text-muted-foreground">{row.original.bsDate || "-"}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const rawStatus = row.original.rawStatus || row.original.status;
        return <Badge variant={rawStatus === "PAID" ? "default" : rawStatus === "CANCELLED" ? "destructive" : "secondary"}>{formatEnumLabel(rawStatus)}</Badge>;
      },
    },
    {
      id: "total",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => <div className="text-right font-medium tabular-nums">{formatCurrency(toNumber(row.original.total || row.original.orderAmount || row.original.grandTotal))}</div>,
    },
    {
      accessorKey: "balanceDue",
      header: () => <div className="text-right">Balance Due</div>,
      cell: ({ row }) => {
        const bal = toNumber(row.original.balanceDue);
        return <div className={cn("text-right tabular-nums", bal > 0 ? "font-bold text-amber-700" : "text-green-700")}>{formatCurrency(bal)}</div>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedOrderId(row.original.id); setIsPaymentModalOpen(true); }} disabled={toNumber(row.original.balanceDue) <= 0}>
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pay</span>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a href={`/sales/${row.original.id}`}><Eye className="h-3.5 w-3.5" /></a>
          </Button>
        </div>
      ),
    },
  ];

  // ─── Payments Table Columns ───
  const paymentColumns: ColumnDef<PaymentRow, unknown>[] = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{formatDate(row.original.date)}</div>
          <div className="text-xs text-muted-foreground">{row.original.bsDate}</div>
        </div>
      ),
    },
    {
      accessorKey: "method",
      header: "Method",
      cell: ({ row }) => <Badge variant="secondary" className="capitalize">{row.original.method.toLowerCase().replace("_", " ")}</Badge>,
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{formatCurrency(toNumber(row.original.amount))}</div>,
    },
    {
      accessorKey: "reference",
      header: "Reference",
    },
    {
      accessorKey: "relatedEntity",
      header: "Against",
      cell: ({ row }) => <span className="font-medium text-primary">{row.original.relatedEntity}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => window.open(`${API_BASE_URL}/payments/${row.original.id}/receipt?token=${token}`, "_blank")}>
          <Download className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];

  // ─── AR Ledger Entries (from ledgerData) ───
  const ledgerEntries = ledgerData ?? [];
  const filteredLedgerEntries = useMemo(() => {
    let entries = ledgerEntries;
    if (ledgerStartDate) entries = entries.filter((e: any) => new Date(e.date) >= ledgerStartDate);
    if (ledgerEndDate) entries = entries.filter((e: any) => new Date(e.date) <= ledgerEndDate);
    return entries;
  }, [ledgerEntries, ledgerStartDate, ledgerEndDate]);

  const openingBalance = filteredLedgerEntries.length > 0
    ? toNumber(filteredLedgerEntries[0].balance) - toNumber(filteredLedgerEntries[0].debit) + toNumber(filteredLedgerEntries[0].credit)
    : toNumber(customer.outstandingBalance || 0);

  const closingBalance = filteredLedgerEntries.length > 0
    ? toNumber(filteredLedgerEntries[filteredLedgerEntries.length - 1].balance)
    : openingBalance;

  const totalDebits = filteredLedgerEntries.reduce((sum, e) => sum + toNumber(e.debit), 0);
  const totalCredits = filteredLedgerEntries.reduce((sum, e) => sum + toNumber(e.credit), 0);

  const ledgerColumns: ColumnDef<any, unknown>[] = [
    { accessorKey: "date", header: "Date", cell: ({ row }) => <div><div>{formatDate(row.original.date)}</div><div className="text-xs text-muted-foreground">{row.original.bsDate || "-"}</div></div> },
    { accessorKey: "narration", header: "Particulars", cell: ({ row }) => row.original.narration || formatEnumLabel(row.original.type) },
    { accessorKey: "reference", header: "Reference" },
    { accessorKey: "debit", header: () => <div className="text-right">Debit (Sales)</div>, cell: ({ row }) => <div className="text-right tabular-nums">{row.original.debit > 0 ? formatCurrency(row.original.debit) : "—"}</div> },
    { accessorKey: "credit", header: () => <div className="text-right">Credit (Payment)</div>, cell: ({ row }) => <div className="text-right tabular-nums">{row.original.credit > 0 ? formatCurrency(row.original.credit) : "—"}</div> },
    { accessorKey: "balance", header: () => <div className="text-right">Running Balance</div>, cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{formatCurrency(row.original.balance)}</div> },
  ];

  // ─── Handle Payment Recording ───
  const handleRecordPayment = async (payload: { salesOrderId: string; amount: number; method: string; reference?: string }) => {
    try {
      await recordPayment.mutateAsync({
        salesOrderId: payload.salesOrderId,
        amount: payload.amount,
        method: payload.method as any,
        reference: payload.reference,
        paymentDate: new Date().toISOString().split("T")[0],
      });
      toast.success("Payment recorded successfully");
      setIsPaymentModalOpen(false);
      setSelectedOrderId(null);
    } catch (err) {
      toast.error("Failed to record payment", { description: getErrorMessage(err) });
    }
  };

  // ─── Header ───
  return (
    <div className="space-y-6">
      {/* Navigation Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate("/parties")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{customer.type.toLowerCase()}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setActiveTab("ar-ledger")}>
            <FileText className="h-4 w-4 mr-2" /> Statement
          </Button>
          <Button variant="outline" onClick={() => window.open(`/reports/customer-ledger/${customer.id}/pdf`, "_blank")}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
          <Button variant="default" className="gap-2" onClick={() => { setSelectedOrderId(orders[0]?.id || ""); setIsPaymentModalOpen(true); }}>
            <DollarSign className="h-4 w-4" /> Record Payment
          </Button>
        </div>
      </div>

      {/* Customer Header Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-muted-foreground" /> Customer Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</p>
            <p className="font-medium capitalize">{customer.type.toLowerCase()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone</p>
            <div className="flex items-center gap-2 font-medium"><Phone className="h-4 w-4 text-muted-foreground" />{customer.phone || "N/A"}</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</p>
            <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-muted-foreground" />{customer.email || "N/A"}</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PAN / VAT</p>
            <div className="flex items-center gap-2 font-medium"><Receipt className="h-4 w-4 text-muted-foreground" />{customer.panNo || customer.vatNo || "Unregistered"}</div>
          </div>
          <div className="space-y-1 md:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Address</p>
            <div className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4 text-muted-foreground" />{customer.address}{customer.district && `, ${customer.district}`}</div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Limit</p>
            <p className="font-medium">{formatCurrency(creditLimit)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoice Preference</p>
            <p className="font-medium">{customer.invoicePref}</p>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Balance</p>
            <p className={cn("text-3xl font-bold tracking-tight", outstandingBalance > 0 ? "text-amber-700" : "text-green-700")}>
              {formatCurrency(outstandingBalance)}
            </p>
            {creditLimit > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-bold">{creditUtilization.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={cn("h-full", creditUtilization > 80 ? "bg-red-500" : creditUtilization > 50 ? "bg-amber-500" : "bg-green-500")} style={{ width: `${Math.min(creditUtilization, 100)}%` }} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Available</p>
            <p className="text-3xl font-bold tracking-tight text-green-700">{formatCurrency(creditAvailable)}</p>
            <p className="text-xs text-muted-foreground">Limit: {formatCurrency(creditLimit)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Purchases</p>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalPurchases)}</p>
            <p className="text-xs text-muted-foreground">{orders.length} orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Payments</p>
            <p className="text-3xl font-bold tracking-tight text-green-700">{formatCurrency(totalPayments)}</p>
            <p className="text-xs text-muted-foreground">{payments.length} payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as CustomerWorkspaceTabs)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center gap-1.5 text-sm">
              {tab.icon} {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Orders</CardTitle>
                <Button variant="ghost" size="sm" asChild><a href={`/sales?customer=${customer.id}`}>View All</a></Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={orderColumns}
                  data={orders.slice(0, 10)}
                  pageSize={10}
                  hideSearch
                  hidePagination
                  emptyMessage="No orders found."
                />
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Recent Payments</CardTitle>
                <Button variant="ghost" size="sm" asChild><a href={`/payments?customer=${customer.id}`}>View All</a></Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={paymentColumns}
                  data={payments.slice(0, 10)}
                  pageSize={10}
                  hideSearch
                  hidePagination
                  emptyMessage="No payments found."
                />
              </CardContent>
            </Card>

            {/* AR Ledger Summary */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>AR Ledger Summary</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("ar-ledger")}>View Full Ledger</Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opening Balance</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(openingBalance)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-emerald-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Credits</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCredits)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-rose-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Total Debits</p>
                    <p className="text-xl font-bold text-rose-700 mt-1">{formatCurrency(totalDebits)}</p>
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Closing Balance</p>
                  <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(closingBalance)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={orderColumns}
                data={orders}
                pageSize={25}
                searchPlaceholder="Search orders..."
                emptyMessage="No sales orders found for this customer."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={paymentColumns}
                data={payments}
                pageSize={25}
                searchPlaceholder="Search payments..."
                emptyMessage="No payments found for this customer."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* AR LEDGER TAB */}
        <TabsContent value="ar-ledger" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => setShowLedgerFilters(!showLedgerFilters)}>
                  <Filter className="h-4 w-4 mr-2" /> Filters
                  {showLedgerFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                </Button>
                {showLedgerFilters && (
                  <>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">From</label>
                      <NepaliDatePickerInput value={ledgerStartDate} onChange={setLedgerStartDate} placeholder="Start Date" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">To</label>
                      <NepaliDatePickerInput value={ledgerEndDate} onChange={setLedgerEndDate} placeholder="End Date" />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setLedgerStartDate(undefined); setLedgerEndDate(undefined); }}>
                      Clear
                    </Button>
                  </>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(`/reports/customer-ledger/${customer.id}/pdf${ledgerStartDate || ledgerEndDate ? `?startDate=${ledgerStartDate?.toISOString()}&endDate=${ledgerEndDate?.toISOString()}` : ""}`, "_blank")}>
                    <Download className="h-3.5 w-3.5 mr-1" /> PDF Statement
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5 mr-1" /> Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between w-full">
                <div>
                  <CardTitle>Account Receivable Ledger</CardTitle>
                  <CardDescription>Commercial truth — based on SalesOrder.orderAmount</CardDescription>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">Opening:</span>
                  <span className="font-semibold">{formatCurrency(openingBalance)}</span>
                  <span className="text-muted-foreground">Closing:</span>
                  <span className="font-bold text-primary">{formatCurrency(closingBalance)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 font-medium">
                      <TableHead>Date (AD)</TableHead>
                      <TableHead>Date (BS)</TableHead>
                      <TableHead>Particulars</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead className="text-right">Debit</TableHead>
                      <TableHead className="text-right">Credit</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell colSpan={4} className="text-right">Opening Balance</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(openingBalance)}</TableCell>
                    </TableRow>
                    {filteredLedgerEntries.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">{formatDate(entry.date)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{entry.bsDate || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{entry.narration || formatEnumLabel(entry.type)}</TableCell>
                        <TableCell className="font-mono text-xs">{entry.reference}</TableCell>
                        <TableCell className="text-right">{entry.debit > 0 ? formatCurrency(entry.debit) : "—"}</TableCell>
                        <TableCell className="text-right">{entry.credit > 0 ? formatCurrency(entry.credit) : "—"}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(entry.balance)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                      <TableCell colSpan={4} className="text-right text-base">Total:</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalDebits)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(totalCredits)}</TableCell>
                      <TableCell className="text-right text-primary text-base">{formatCurrency(closingBalance)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                {filteredLedgerEntries.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground italic">No ledger entries in selected range.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { accessorKey: "id", header: "Invoice ID", cell: ({ row }: { row: any }) => <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:underline">{row.original.id.slice(0, 12)}…</Button> },
                  { accessorKey: "issueDate", header: "Date", cell: ({ row }: { row: any }) => <div><div>{formatDate(row.original.issueDate || row.original.invoiceDate)}</div><div className="text-xs text-muted-foreground">{row.original.bsDate || "-"}</div></div> },
                  { accessorKey: "status", header: "Status", cell: ({ row }: { row: any }) => <Badge variant={row.original.status === "PAID" ? "default" : "secondary"}>{formatEnumLabel(row.original.status)}</Badge> },
                  { id: "total", header: () => <div className="text-right">Amount</div>, cell: ({ row }: { row: any }) => <div className="text-right font-medium tabular-nums">{formatCurrency(toNumber(row.original.total || row.original.invoiceAmount))}</div> },
                  { accessorKey: "balanceDue", header: () => <div className="text-right">Balance</div>, cell: ({ row }: { row: any }) => <div className={cn("text-right tabular-nums", toNumber(row.original.balanceDue) > 0 ? "text-amber-700" : "text-green-700")}>{formatCurrency(toNumber(row.original.balanceDue))}</div> },
                ]}
                data={(customer.taxInvoices as any[]) || []}
                pageSize={25}
                searchPlaceholder="Search invoices..."
                emptyMessage="No tax invoices found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DELIVERIES TAB */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { accessorKey: "id", header: "Delivery ID", cell: ({ row }: { row: any }) => <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:underline">{row.original.id.slice(0, 12)}…</Button> },
                  { accessorKey: "scheduledDate", header: "Scheduled", cell: ({ row }: { row: any }) => <div>{formatDate(row.original.scheduledDate)}</div> },
                  { accessorKey: "status", header: "Status", cell: ({ row }: { row: any }) => <Badge variant={row.original.status === "DELIVERED" ? "default" : "secondary"}>{formatEnumLabel(row.original.status)}</Badge> },
                  { accessorKey: "deliveryAddress", header: "Address" },
                  { accessorKey: "driver", header: "Driver", cell: ({ row }: { row: any }) => row.original.driver?.name || "Unassigned" },
                ]}
                data={(customer.deliveries as any[]) || []}
                pageSize={25}
                searchPlaceholder="Search deliveries..."
                emptyMessage="No deliveries found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIVITY TAB */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { accessorKey: "timestamp", header: "Time", cell: ({ row }: { row: any }) => <div className="whitespace-nowrap">{formatDate(row.original.timestamp)}</div> },
                  { accessorKey: "action", header: "Action", cell: ({ row }: { row: any }) => <Badge variant="secondary">{formatEnumLabel(row.original.action)}</Badge> },
                  { accessorKey: "entityType", header: "Entity" },
                  { accessorKey: "entityId", header: "Reference", cell: ({ row }: { row: any }) => <span className="font-mono text-xs">{row.original.entityId}</span> },
                  { accessorKey: "user", header: "User", cell: ({ row }: { row: any }) => row.original.user?.name || "System" },
                ]}
                data={(customer.activityLog as any[]) || []}
                pageSize={25}
                searchPlaceholder="Search activity..."
                emptyMessage="No activity recorded."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedOrderId && (
        <RecordDepositModal
          orderId={selectedOrderId}
          orderNumber={selectedOrderId}
          onClose={() => { setIsPaymentModalOpen(false); setSelectedOrderId(null); }}
        />
      )}
    </div>
  );
}
