import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/shared/data-table";
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
  DollarSign,
  Package,
  Truck,
  Activity,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import {
  useCustomerQuery,
  useCustomerLedgerQuery,
  useDeleteCustomerMutation,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { RecordDepositModal } from "@/components/sales/record-deposit-modal";
import { CreateCustomerForm } from "@/components/sales/create-customer-form";
import { CreateSalesOrderForm } from "@/components/sales/create-sales-order-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type CustomerWorkspaceTabs =
  | "overview"
  | "orders"
  | "payments"
  | "ar-ledger"
  | "invoices"
  | "deliveries"
  | "activity";

const TAB_CONFIG: { id: CustomerWorkspaceTabs; label: string; icon: React.ReactNode }[] = [
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
  const { token, user } = useAuth();
  const isAuthorizedToEdit = ["ADMIN", "SALES", "ACCOUNTANT"].includes(user?.role || "");

  const { data: customer, error, isLoading } = useCustomerQuery(id!);

  // Ledger Filter Dates
  const [ledgerStartDate, setLedgerStartDate] = useState<Date>();
  const [ledgerEndDate, setLedgerEndDate] = useState<Date>();
  const [showLedgerFilters, setShowLedgerFilters] = useState(false);

  const { data: ledgerData, isLoading: isLedgerLoading } = useCustomerLedgerQuery(id!, {
    startDate: ledgerStartDate,
    endDate: ledgerEndDate,
  });

  const deleteCustomerMutation = useDeleteCustomerMutation();

  const [activeTab, setActiveTab] = useState<CustomerWorkspaceTabs>("overview");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");
  const [selectedOrderBalance, setSelectedOrderBalance] = useState<number>(0);

  const [isEditing, setIsEditing] = useState(false);
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
        <CardContent className="py-10 text-center">
          <p className="font-semibold text-destructive">Failed to load customer workspace.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/parties")}>
            Back to Parties Directory
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ─── Compute Financial Metrics (Memoized) ───
  const orders = useMemo(() => customer.salesOrders || [], [customer.salesOrders]);
  
  // Extract payments from customer's sales orders
  const payments = useMemo(() => {
    return orders
      .flatMap((so: any) =>
        (so.payments || []).map((p: any) => ({
          ...p,
          date: p.paymentDate || p.createdAt,
          relatedEntity: `Order #${so.id.slice(0, 8)}`,
          salesOrderId: so.id,
        }))
      )
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders]);

  const {
    totalPurchases,
    totalPayments,
    outstandingBalance,
    creditLimit,
    creditAvailable,
    creditUtilization,
    pendingOrdersWithBalance,
  } = useMemo(() => {
    const purchases = orders.reduce((sum: number, o: any) => sum + toNumber(o.orderAmount || o.grandTotal || o.total), 0);
    const pmts = payments.reduce((sum: number, p: any) => sum + toNumber(p.amount), 0);
    const balance = toNumber(customer.outstandingBalance || 0);
    const limit = toNumber(customer.creditLimit || 0);
    const available = limit > 0 ? Math.max(0, limit - balance) : 0;
    const utilization = limit > 0 ? (balance / limit) * 100 : 0;
    const pendingWithBal = orders.filter((o: any) => toNumber(o.balanceDue) > 0 && o.status !== "CANCELLED");

    return {
      totalPurchases: purchases,
      totalPayments: pmts,
      outstandingBalance: balance,
      creditLimit: limit,
      creditAvailable: available,
      creditUtilization: utilization,
      pendingOrdersWithBalance: pendingWithBal,
    };
  }, [orders, payments, customer.outstandingBalance, customer.creditLimit]);

  // Smart Order Selector for Payments
  const openPaymentForBestOrder = () => {
    if (pendingOrdersWithBalance.length > 0) {
      const bestOrder = pendingOrdersWithBalance[0];
      setSelectedOrderId(bestOrder.id);
      setSelectedOrderNumber(bestOrder.id.slice(0, 8));
      setSelectedOrderBalance(toNumber(bestOrder.balanceDue));
    } else if (orders.length > 0) {
      setSelectedOrderId(orders[0].id);
      setSelectedOrderNumber(orders[0].id.slice(0, 8));
      setSelectedOrderBalance(toNumber(orders[0].balanceDue));
    } else {
      toast.info("No active sales orders", { description: "Please create a sales order before recording a payment." });
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleDeleteCustomer = async () => {
    try {
      await deleteCustomerMutation.mutateAsync(customer.id);
      toast.success("Party deleted successfully");
      navigate("/parties");
    } catch (err) {
      toast.error("Failed to delete party", { description: getErrorMessage(err) });
    }
  };

  // ─── Orders Table Columns (Memoized) ───
  const orderColumns: ColumnDef<any, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            className="p-0 h-auto text-primary hover:underline font-mono"
            onClick={() => navigate(`/sales/${row.original.id}`)}
          >
            #{row.original.id.slice(0, 8)}
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
          const rawStatus = row.original.status;
          return (
            <Badge
              variant={
                rawStatus === "PAID" || rawStatus === "DELIVERED"
                  ? "default"
                  : rawStatus === "CANCELLED"
                  ? "destructive"
                  : "secondary"
              }
            >
              {formatEnumLabel(rawStatus)}
            </Badge>
          );
        },
      },
      {
        id: "total",
        header: () => <div className="text-right">Total</div>,
        cell: ({ row }) => (
          <div className="text-right font-medium tabular-nums">
            {formatCurrency(toNumber(row.original.orderAmount || row.original.grandTotal || row.original.total))}
          </div>
        ),
      },
      {
        accessorKey: "balanceDue",
        header: () => <div className="text-right">Balance Due</div>,
        cell: ({ row }) => {
          const bal = toNumber(row.original.balanceDue);
          return (
            <div className={cn("text-right tabular-nums font-semibold", bal > 0 ? "text-amber-700" : "text-emerald-700")}>
              {formatCurrency(bal)}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const bal = toNumber(row.original.balanceDue);
          return (
            <div className="flex justify-end gap-1">
              {bal > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                  onClick={() => {
                    setSelectedOrderId(row.original.id);
                    setSelectedOrderNumber(row.original.id.slice(0, 8));
                    setSelectedOrderBalance(bal);
                    setIsPaymentModalOpen(true);
                  }}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" />
                  Pay
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/${row.original.id}`)}>
                <Eye className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate],
  );

  // ─── Payments Table Columns (Memoized) ───
  const paymentColumns: ColumnDef<any, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{formatDate(row.original.date)}</div>
            <div className="text-xs text-muted-foreground">{row.original.bsDate || "-"}</div>
          </div>
        ),
      },
      {
        accessorKey: "method",
        header: "Method",
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {String(row.original.method || "CASH").toLowerCase().replace("_", " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "amount",
        header: () => <div className="text-right">Amount</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold tabular-nums text-emerald-700">
            {formatCurrency(toNumber(row.original.amount))}
          </div>
        ),
      },
      {
        accessorKey: "reference",
        header: "Reference",
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.reference || "—"}</span>,
      },
      {
        accessorKey: "relatedEntity",
        header: "Against",
        cell: ({ row }) => (
          <Link to={`/sales/${row.original.salesOrderId}`} className="font-medium text-primary hover:underline">
            {row.original.relatedEntity}
          </Link>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`${API_BASE_URL}/payments/${row.original.id}/receipt?token=${token}`, "_blank")}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [token],
  );

  // ─── AR Ledger Data ───
  const ledgerEntries = ledgerData?.entries || [];
  const openingBalance = ledgerData?.openingBalance ?? 0;
  const closingBalance = ledgerData?.closingBalance ?? outstandingBalance;

  const totalDebits = ledgerEntries.reduce((sum: number, e: any) => sum + toNumber(e.debit), 0);
  const totalCredits = ledgerEntries.reduce((sum: number, e: any) => sum + toNumber(e.credit), 0);

  return (
    <div className="space-y-6">
      {/* Navigation & Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigate("/parties")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
              <Badge variant="outline" className="capitalize font-semibold">
                {customer.type.toLowerCase()}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {customer.address}{customer.district ? `, ${customer.district}` : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="default" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => setIsNewOrderOpen(true)}>
            <Plus className="h-4 w-4" /> New Sales Order
          </Button>
          <Button variant="outline" className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 font-semibold" onClick={openPaymentForBestOrder}>
            <DollarSign className="h-4 w-4" /> Record Payment
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => window.open(`${API_BASE_URL}/reports/customer-ledger/${customer.id}/pdf?token=${token}${ledgerStartDate ? `&startDate=${ledgerStartDate.toISOString()}` : ""}${ledgerEndDate ? `&endDate=${ledgerEndDate.toISOString()}` : ""}`, "_blank")}>
            <Download className="h-4 w-4" /> Statement PDF
          </Button>
          {isAuthorizedToEdit && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                <Edit className="h-4 w-4 mr-1" /> Edit Profile
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setIsDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Profile Edit Form */}
      {isEditing && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Edit Party Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCustomerForm onClose={() => setIsEditing(false)} initialData={customer} />
          </CardContent>
        </Card>
      )}

      {/* Customer Contact & Account Information Card */}
      <Card>
        <CardContent className="pt-6 grid gap-4 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Phone</p>
            <div className="flex items-center gap-2 font-medium">
              <Phone className="h-4 w-4 text-muted-foreground" />
              {customer.phone || "N/A"}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email Address</p>
            <div className="flex items-center gap-2 font-medium">
              <Mail className="h-4 w-4 text-muted-foreground" />
              {customer.email || "N/A"}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PAN / VAT Registration</p>
            <div className="flex items-center gap-2 font-medium">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              {customer.panNo || customer.vatNo || "Unregistered"}
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Location Detail</p>
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {customer.address}
              {customer.ward && ` (Ward ${customer.ward})`}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outstanding Balance</p>
            <p className={cn("text-3xl font-bold tracking-tight", outstandingBalance > 0 ? "text-amber-700" : "text-emerald-700")}>
              {formatCurrency(outstandingBalance)}
            </p>
            {creditLimit > 0 && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-bold">{creditUtilization.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full",
                      creditUtilization > 80 ? "bg-red-500" : creditUtilization > 50 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(creditUtilization, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Credit Available</p>
            <p className="text-3xl font-bold tracking-tight text-emerald-700">{formatCurrency(creditAvailable)}</p>
            <p className="text-xs text-muted-foreground">Limit: {formatCurrency(creditLimit)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Sales Volume</p>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalPurchases)}</p>
            <p className="text-xs text-muted-foreground">{orders.length} Sales Orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Payments Received</p>
            <p className="text-3xl font-bold tracking-tight text-emerald-700">{formatCurrency(totalPayments)}</p>
            <p className="text-xs text-muted-foreground">{payments.length} Payments Logged</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabbed Workspace */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as CustomerWorkspaceTabs)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          {TAB_CONFIG.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center justify-center gap-1.5 text-sm">
              {tab.icon} {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Attention Banner if Outstanding or Pending Orders */}
          {pendingOrdersWithBalance.length > 0 && (
            <Card className="bg-amber-500/10 border-amber-500/30">
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                      {pendingOrdersWithBalance.length} Sales Orders require payment settlement
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Total outstanding across pending orders: {formatCurrency(outstandingBalance)}
                    </p>
                  </div>
                </div>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={openPaymentForBestOrder}>
                  Settle Payment Now
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recent Orders */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Sales Orders</CardTitle>
                  <CardDescription>Latest commercial orders</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("orders")}>
                  View All ({orders.length})
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={orderColumns}
                  data={orders.slice(0, 5)}
                  pageSize={5}
                  hideSearch
                  hidePagination
                  emptyMessage="No orders found."
                />
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Recent Payments</CardTitle>
                  <CardDescription>Latest credited transactions</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("payments")}>
                  View All ({payments.length})
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={paymentColumns}
                  data={payments.slice(0, 5)}
                  pageSize={5}
                  hideSearch
                  hidePagination
                  emptyMessage="No payments recorded."
                />
              </CardContent>
            </Card>

            {/* AR Ledger Summary Box */}
            <Card className="md:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Commercial AR Summary</CardTitle>
                  <CardDescription>Calculated strictly from Sales Orders &amp; Payments</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab("ar-ledger")}>
                  Full AR Ledger &rarr;
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 rounded-xl bg-muted/40">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Opening Balance</p>
                    <p className="text-xl font-bold mt-1">{formatCurrency(openingBalance)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-emerald-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Total Credits (Payments)</p>
                    <p className="text-xl font-bold text-emerald-700 mt-1">{formatCurrency(totalCredits)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-500/10">
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Total Debits (Sales)</p>
                    <p className="text-xl font-bold text-rose-700 mt-1">{formatCurrency(totalDebits)}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary">Current Closing Balance</p>
                  <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(closingBalance)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. ORDERS TAB */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Sales Orders History</CardTitle>
                <CardDescription>Commercial sales orders placed by this party</CardDescription>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={() => setIsNewOrderOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Order
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={orderColumns}
                data={orders}
                pageSize={25}
                searchPlaceholder="Search sales orders..."
                emptyMessage="No sales orders found for this party."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. PAYMENTS TAB */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payments Received</CardTitle>
                <CardDescription>Financial receipts logged against sales orders</CardDescription>
              </div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={openPaymentForBestOrder}>
                <DollarSign className="h-4 w-4 mr-1" /> Record Payment
              </Button>
            </CardHeader>
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

        {/* 4. AR LEDGER TAB */}
        <TabsContent value="ar-ledger" className="space-y-4">
          {/* Filters & Export Toolbar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setShowLedgerFilters(!showLedgerFilters)}>
                    <Filter className="h-4 w-4 mr-1.5" /> Date Filter
                    {showLedgerFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
                  </Button>
                  {showLedgerFilters && (
                    <div className="flex items-center gap-2">
                      <NepaliDatePickerInput value={ledgerStartDate} onChange={setLedgerStartDate} placeholder="Start Date" />
                      <span className="text-xs text-muted-foreground">to</span>
                      <NepaliDatePickerInput value={ledgerEndDate} onChange={setLedgerEndDate} placeholder="End Date" />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setLedgerStartDate(undefined);
                          setLedgerEndDate(undefined);
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `${API_BASE_URL}/reports/customer-ledger/${customer.id}/pdf?token=${token}${
                          ledgerStartDate ? `&startDate=${ledgerStartDate.toISOString()}` : ""
                        }${ledgerEndDate ? `&endDate=${ledgerEndDate.toISOString()}` : ""}`,
                        "_blank"
                      )
                    }
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF Statement
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    <Printer className="h-3.5 w-3.5 mr-1.5" /> Print
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
                  <CardTitle>Accounts Receivable Khata / Ledger</CardTitle>
                  <CardDescription>
                    Commercial Truth — based on SalesOrder.orderAmount (decoupled from VAT tax invoices)
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4 text-sm bg-muted/40 px-3 py-1.5 rounded-lg border">
                  <span className="text-muted-foreground">Opening:</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(openingBalance)}</span>
                  <span className="text-muted-foreground">Closing:</span>
                  <span className="font-bold text-primary tabular-nums">{formatCurrency(closingBalance)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLedgerLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 font-medium">
                        <TableHead>Date (AD)</TableHead>
                        <TableHead>Date (BS)</TableHead>
                        <TableHead>Particulars / Narration</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead className="text-right">Debit (Sales)</TableHead>
                        <TableHead className="text-right">Credit (Payment)</TableHead>
                        <TableHead className="text-right">Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/20 font-medium text-xs">
                        <TableCell colSpan={4} className="text-right font-bold">Opening Balance</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right font-bold tabular-nums">{formatCurrency(openingBalance)}</TableCell>
                      </TableRow>
                      {ledgerEntries.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell className="whitespace-nowrap text-xs">{formatDate(entry.date)}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{entry.bsDate || "-"}</TableCell>
                          <TableCell className="max-w-xs text-xs truncate">{entry.narration || formatEnumLabel(entry.type)}</TableCell>
                          <TableCell className="font-mono text-xs">{entry.reference || "-"}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums font-medium">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-emerald-700 font-medium">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold tabular-nums">{formatCurrency(entry.balance)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20 text-xs">
                        <TableCell colSpan={4} className="text-right">Total Summary:</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(totalDebits)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-700">{formatCurrency(totalCredits)}</TableCell>
                        <TableCell className="text-right text-primary text-sm tabular-nums">{formatCurrency(closingBalance)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  {ledgerEntries.length === 0 && (
                    <div className="py-12 text-center text-muted-foreground italic text-xs">
                      No commercial transactions found in the selected date range.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Statutory Tax Invoices</CardTitle>
                  <CardDescription>
                    Official VAT / Compliance Invoices issued for tax reporting (TaxInvoice.invoiceAmount)
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-800 dark:text-amber-200 border-amber-300">
                  Compliance / Tax Truth
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  {
                    accessorKey: "id",
                    header: "Invoice Number",
                    cell: ({ row }: { row: any }) => (
                      <span className="font-mono text-xs font-bold text-primary">
                        {row.original.invoiceNumber || row.original.id.slice(0, 10)}
                      </span>
                    ),
                  },
                  {
                    accessorKey: "issueDate",
                    header: "Date Issued",
                    cell: ({ row }: { row: any }) => (
                      <div>
                        <div className="font-medium">{formatDate(row.original.issueDate || row.original.createdAt)}</div>
                        <div className="text-xs text-muted-foreground">{row.original.bsDate || "-"}</div>
                      </div>
                    ),
                  },
                  {
                    accessorKey: "status",
                    header: "Status",
                    cell: ({ row }: { row: any }) => (
                      <Badge variant={row.original.status === "PAID" ? "default" : "secondary"}>
                        {formatEnumLabel(row.original.status)}
                      </Badge>
                    ),
                  },
                  {
                    id: "taxableAmount",
                    header: () => <div className="text-right">Taxable Amount</div>,
                    cell: ({ row }: { row: any }) => (
                      <div className="text-right tabular-nums">{formatCurrency(toNumber(row.original.taxableAmount))}</div>
                    ),
                  },
                  {
                    id: "vatAmount",
                    header: () => <div className="text-right">VAT (13%)</div>,
                    cell: ({ row }: { row: any }) => (
                      <div className="text-right tabular-nums text-muted-foreground">{formatCurrency(toNumber(row.original.vatAmount))}</div>
                    ),
                  },
                  {
                    id: "total",
                    header: () => <div className="text-right">Invoice Total</div>,
                    cell: ({ row }: { row: any }) => (
                      <div className="text-right font-bold tabular-nums">
                        {formatCurrency(toNumber(row.original.invoiceAmount || row.original.total))}
                      </div>
                    ),
                  },
                ]}
                data={(customer.taxInvoices as any[]) || []}
                pageSize={25}
                searchPlaceholder="Search statutory tax invoices..."
                emptyMessage="No statutory tax invoices issued for this party."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. DELIVERIES TAB */}
        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Schedules &amp; Status</CardTitle>
              <CardDescription>Logistics items scheduled for dispatch and delivery</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  {
                    accessorKey: "id",
                    header: "Delivery ID",
                    cell: ({ row }: { row: any }) => <span className="font-mono text-xs">#{row.original.id.slice(0, 8)}</span>,
                  },
                  {
                    accessorKey: "scheduledDate",
                    header: "Scheduled",
                    cell: ({ row }: { row: any }) => formatDate(row.original.scheduledDate),
                  },
                  {
                    accessorKey: "status",
                    header: "Status",
                    cell: ({ row }: { row: any }) => (
                      <Badge variant={row.original.status === "DELIVERED" ? "default" : "secondary"}>
                        {formatEnumLabel(row.original.status)}
                      </Badge>
                    ),
                  },
                  { accessorKey: "deliveryAddress", header: "Address" },
                  {
                    accessorKey: "driver",
                    header: "Driver",
                    cell: ({ row }: { row: any }) => row.original.driver?.name || "Unassigned",
                  },
                ]}
                data={(customer.deliveries as any[]) || []}
                pageSize={25}
                searchPlaceholder="Search deliveries..."
                emptyMessage="No delivery records found."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. ACTIVITY TAB */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Party Audit Trail</CardTitle>
              <CardDescription>System log of all updates and commercial activities</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  {
                    accessorKey: "timestamp",
                    header: "Time",
                    cell: ({ row }: { row: any }) => (
                      <div className="whitespace-nowrap text-xs">{formatDate(row.original.timestamp)}</div>
                    ),
                  },
                  {
                    accessorKey: "action",
                    header: "Action",
                    cell: ({ row }: { row: any }) => <Badge variant="secondary">{formatEnumLabel(row.original.action)}</Badge>,
                  },
                  { accessorKey: "entityType", header: "Entity" },
                  {
                    accessorKey: "entityId",
                    header: "Reference",
                    cell: ({ row }: { row: any }) => <span className="font-mono text-xs">{row.original.entityId}</span>,
                  },
                  {
                    accessorKey: "user",
                    header: "User",
                    cell: ({ row }: { row: any }) => row.original.user?.name || "System",
                  },
                ]}
                data={(customer.activityLog as any[]) || []}
                pageSize={25}
                searchPlaceholder="Search audit log..."
                emptyMessage="No audit activity recorded for this party."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── MODALS & SHEETS ─── */}

      {/* Payment Deposit Modal */}
      {isPaymentModalOpen && selectedOrderId && (
        <RecordDepositModal
          orderId={selectedOrderId}
          orderNumber={selectedOrderNumber || selectedOrderId.slice(0, 8)}
          defaultAmount={selectedOrderBalance > 0 ? selectedOrderBalance : undefined}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedOrderId(null);
          }}
        />
      )}

      {/* New Order Creation Sheet */}
      <Sheet open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <SheetContent className="sm:max-w-[90vw] overflow-y-auto p-0">
          <SheetHeader className="px-6 pt-6">
            <SheetTitle>Create Sales Order for {customer.name}</SheetTitle>
          </SheetHeader>
          <div className="px-6 pb-6">
            <CreateSalesOrderForm onClose={() => setIsNewOrderOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Party Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              Are you sure you want to delete <strong>{customer.name}</strong>?
            </p>
            {orders.length > 0 && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 rounded-lg text-xs flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>This party has {orders.length} existing sales orders. Deletion will be blocked by the system for data safety.</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteCustomerMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCustomer}
              disabled={deleteCustomerMutation.isPending || orders.length > 0}
            >
              {deleteCustomerMutation.isPending ? "Deleting..." : "Confirm Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
