import type { ReactNode } from "react";

export type UserRole = "ADMIN" | "ACCOUNTANT" | "SALES" | "WAREHOUSE" | "DRIVER";
export type StockAdjustmentReason = "CORRECTION" | "DAMAGE" | "RETURNED" | "FOUND";

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  section: string;
  roles?: UserRole[];
};

export type Kpi = {
  label: string;
  value: string;
  change: string;
  tone: "positive" | "neutral" | "negative";
  tooltip?: string;
};

export type AuthUser = {
  id: string;
  tenantId?: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  workspaceName?: string;
  currency?: string;
};

export type DashboardRecentSalesOrder = {
  id: string;
  customer: string;
  status: string;
  deliveryDate: string;
  total: number;
};

export type SalesOrderLineItem = {
  id: string;
  productVariantId?: string;
  customProductName?: string;
  quantity: number;
};

export type DashboardLowStockItem = {
  id: string;
  product: string;
  variant: string;
  quantity: number;
};

export type AgingBuckets = {
  "0-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
  totalOutstanding: number;
  customerCount: number;
};

export type ShowroomPeriodMetrics = {
  units: number;
  value: number;
};

export type ShowroomAnalytics = {
  customerId: string;
  customerName: string;
  currentMonth: ShowroomPeriodMetrics;
  previousMonth: ShowroomPeriodMetrics;
  yearToDate: ShowroomPeriodMetrics;
};

export type DashboardPayload = {
  kpis: Kpi[];
  revenueVsCogs: Array<{ month: string; revenue: number; cogs: number }>;
  cashFlow: Array<{ month: string; inflow: number; outflow: number }>;
  topProducts: Array<{ name: string; quantity: number }>;
  recentSalesOrders: DashboardRecentSalesOrder[];
  lowStockItems: DashboardLowStockItem[];
  arAging?: AgingBuckets; // AR Aging buckets (PRD §5.1)
  // Server-side centralized metrics (single source of truth)
  totalRevenue?: number;
  totalCogs?: number;
  netProfit?: number;
  arAgingByCustomer?: Record<string, string>; // customerName → bucket ("0-30", "31-60", etc.)
};

// ---------------------------------------------------------------------------
// Dashboard Overview — role-aware command center (GET /dashboard/overview).
// Mirrors the discriminated union in server/src/services/dashboard.service.ts.
// WAREHOUSE and DRIVER intentionally carry NO monetary fields.
// ---------------------------------------------------------------------------

export type DashboardRecentPayment = {
  id: string;
  customer: string;
  amount: number;
  method: string;
  date: string;
};

export type DashboardLowStockRow = {
  id: string;
  product: string;
  variant: string;
  quantity: number;
  threshold: number;
};

export type DashboardStockRow = {
  id: string;
  product: string;
  variant: string;
  quantity: number;
};

export type DashboardActivity = {
  id: string;
  action: string;
  entityType: string;
  user: string;
  timestamp: string;
};

export type DashboardDelivery = {
  id: string;
  customer: string;
  address: string;
  status: string;
  scheduledDate: string;
};

export type DashboardTopCustomer = {
  id: string;
  name: string;
  revenue: number;
};

export type DashboardArCustomerRow = {
  customerId: string;
  customerName: string;
  customerType: string;
  bucket0_30: number;
  bucket31_60: number;
  bucket61_90: number;
  bucket90_plus: number;
  totalOutstanding: number;
};

export type DashboardAlert = {
  id: string;
  severity: "info" | "warn" | "danger";
  title: string;
  detail: string;
};

export type DashboardSalesTrendPoint = {
  month: string;
  revenue: number;
  orders: number;
};

export type AdminOverview = {
  role: "ADMIN";
  generatedAt: string;
  finance: { salesToday: number; salesMonth: number; receivedMonth: number; outstandingAr: number };
  arAging: AgingBuckets;
  arByCustomer: DashboardArCustomerRow[];
  salesTrend: DashboardSalesTrendPoint[];
  topCustomers: DashboardTopCustomer[];
  topProducts: Array<{ name: string; quantity: number }>;
  lowStock: { count: number; items: DashboardLowStockRow[] };
  recentOrders: DashboardRecentSalesOrder[];
  recentPayments: DashboardRecentPayment[];
  recentActivity: DashboardActivity[];
};

export type AccountantOverview = {
  role: "ACCOUNTANT";
  generatedAt: string;
  receivables: { outstandingAr: number; customerCount: number };
  arAging: AgingBuckets;
  arByCustomer: DashboardArCustomerRow[];
  payments: { receivedMonth: number; recent: DashboardRecentPayment[] };
  vat: { outputTax: number; inputTax: number; netPayable: number };
  reconciliation: { invoicedCount: number; uninvoicedCount: number; uninvoicedValue: number };
  alerts: DashboardAlert[];
};

export type SalesOverview = {
  role: "SALES";
  generatedAt: string;
  today: { salesToday: number; ordersToday: number };
  orderStatus: Record<string, number>;
  pendingOrders: { count: number; items: DashboardRecentSalesOrder[] };
  collections: { receivedMonth: number; recent: DashboardRecentPayment[] };
  topCustomers: DashboardTopCustomer[];
};

export type WarehouseOverview = {
  role: "WAREHOUSE";
  generatedAt: string;
  stock: { totalVariants: number; lowStockCount: number; outOfStockCount: number };
  lowStock: { items: DashboardLowStockRow[] };
  outOfStock: { items: DashboardStockRow[] };
  deliveries: { today: Record<string, number>; activeQueue: number };
  pendingReceipts: { count: number };
};

export type DriverOverview = {
  role: "DRIVER";
  generatedAt: string;
  today: Record<string, number>;
  activeQueue: number;
  assigned: DashboardDelivery[];
};

export type DashboardOverview =
  | AdminOverview
  | AccountantOverview
  | SalesOverview
  | WarehouseOverview
  | DriverOverview;

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

export type ProductVariantOption = {
  id: string;
  variantName: string;
  skuVariant: string;
  stockQuantity: number;
  additionalCost?: number;
  fabricColor?: string;
  woodFinish?: string;
  sizeLabel?: string;
  hsCode?: string;
};

export type ProductRow = {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  material: string;
  status: string;
  stock: number;
  margin: number;
  valuation: number;
  sellingPrice: number;
  costPrice?: number;
  defaultVariantId: string;
  imageUrls?: string[];
  isSellable?: boolean;
  variants?: ProductVariantOption[];
  // Furniture specific
  height?: number;
  width?: number;
  length?: number;
  hsCode?: string;
  woodType?: string;
  finishType?: string;
  assemblyRequired?: boolean;
  warrantyMonths?: number;
  leadTimeDays?: number;
  isCustomizable?: boolean;
  sizeLabel?: string;
};

export type PurchaseOrderLineRow = {
  id: string;
  quantity: number;
  receivedQuantity: number;
  unitCost?: number;
  taxAmount?: number;
  supplierItemName?: string;
  product: string;
  variant: string;
};

export type PurchaseOrderRow = {
  id: string;
  supplierId: string;
  supplier: string;
  status: string;
  rawStatus: string;
  orderDate: string;
  expectedDelivery: string | null;
  shippingTerms?: string;
  notes?: string;
  totalAmount: number;
  receipts: number;
  supplierInvoices: number;
  rawSupplierInvoices?: Array<{
    id: string;
    invoiceNumber: string;
    issueDate: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    status: string;
    rawStatus?: string;
    notes?: string;
  }>;
  rawGoodsReceipts?: Array<{
    id: string;
    receiptNumber?: string;
    receivedAt: string;
    notes?: string;
    linesCount: number;
  }>;
  rawPayments?: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    method: string;
    reference?: string;
    supplierInvoiceId?: string;
  }>;
  pendingQuantity: number;
  lineItems: PurchaseOrderLineRow[];
};

export type PurchaseOrderMatchSummary = {
  purchaseOrderId: string;
  poStatus: string;
  poValue: number;
  receivedValue: number;
  invoicedValue: number;
  isMatched: boolean;
  receipts: number;
  supplierInvoices: number;
};

export type ProductDetailVariantRow = {
  id: string;
  variant: string;
  warehouse: string;
  quantity: number;
};

export type ProductDetailMetric = {
  label: string;
  value: string;
};

export type ProductDetailHistoryItem = {
  id: string;
  label: string;
};

export type ProductDetailPayload = {
  id: string;
  name: string;
  sku: string;
  description: string;
  status: string;
  category: string;
  material: string;
  costPrice: number;
  sellingPrice: number;
  margin: number;
  totalStock: number;
  recentSalesQty: number;
  height?: number;
  width?: number;
  length?: number;
  sizeLabel?: string;
  imageUrls: string[];
  variantRows: ProductDetailVariantRow[];
  metrics: ProductDetailMetric[];
  history: ProductDetailHistoryItem[];
};

export type SupplierRow = {
  id: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  address?: string;
  panNo?: string;
  vatNo?: string;
  country: string;
  paymentTerms?: string;
  leadTime?: string;
  leadTimeDays?: number;
  onTimeRate?: string;
  spend?: number;
  notes?: string;
  isActive?: boolean;
};

export type SupplierInvoiceAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type SupplierInvoiceRow = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string | null;
  supplier: string;
  supplierId: string;
  purchaseOrderId?: string | null;
  status: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  notes?: string;
  attachments: SupplierInvoiceAttachment[];
};

export type TaxRateRow = {
  id: string;
  name: string;
  rate: number;
  category: string;
  isCompound: boolean;
  isDefault: boolean;
};

export type SalesOrderRow = {
  id: string;
  customerId: string;
  customer: string;
  customerType: string;
  status: string;
  rawStatus: string;
  orderDate: string;
  deliveryDate: string;
  total: number;
  balanceDue: number;
  paidAmount: number;
  cogs: number;
  // Furniture fields
  isCustomOrder?: boolean;
  expectedReadyDate?: string;
  assemblyNotes?: string;
  deliveryFloor?: number;
  items?: { name: string; quantity: number }[];
};

export type TaxInvoiceRow = {
  id: string;
  soId: string;
  invoiceNumber: string;
  customer: string;
  status: string;
  dueDate: string | null;
  issueDate?: string | null;
  amount: number; // Will map to invoiceAmount
  taxAmount: number;
  taxableAmount: number;
  balance: number;
  invoiceType: string;
  printed?: boolean;
  bsDate?: string;
  fiscalYear?: string;
  notes?: string;
  paymentMode?: string;
};

export type ArLedgerEntry = {
  id: string;
  date: string;
  type: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

export type PaymentRow = {
  id: string;
  date: string;
  bsDate: string;
  reference: string;
  amount: number;
  method: string;
  relatedEntity: string;
  relatedEntityId: string;
};

export type VatRegisterEntry = {
  id: string;
  date: string;
  bsDate: string;
  invoiceNumber: string;
  customerName: string;
  panNo?: string;
  taxableAmount: number;
  outputVat: number;
  totalWithVat: number;
};

export type DeliveryRow = {
  id: string;
  soId: string;
  customer: string;
  customerPhone?: string;
  driver: string;
  driverId?: string;
  vehicle?: string;
  status: string;
  rawStatus: string;
  scheduledDate: string;
  actualDeliveryDate?: string;
  receiverName?: string;
  receiverPhone?: string;
  route: string;
  deliveryAddress: string;
  notes?: string;
  proofPhotoUrl?: string;
  failureReason?: string;
  completedAt?: string;
  floor: number;
  assemblyNote?: string;
  deliveryCharge: number;
  assemblyCharge: number;
  floorDelivery: boolean;
  assemblyService: boolean;
  lineItems: Array<{
    id: string;
    productName: string;
    quantity: number;
    sku?: string;
  }>;
};

export type InventoryRecordRow = {
  id: string;
  productVariantId: string;
  product: string;
  variant: string;
  warehouseId: string;
  warehouse: string;
  quantity: number;
  status: string;
};

export type InventoryValuationRow = {
  id: string;
  product: string;
  variant: string;
  category: string;
  stockQuantity: number;
  unitCost: number;
  totalValue: number;
  byWarehouse: Array<{
    warehouse: string;
    quantity: number;
    status: string;
    value: number;
  }>;
};

export type InventoryMovementRow = {
  id: string;
  product: string;
  variant: string;
  warehouse: string;
  type: string;
  quantity: number;
  occurredAt: string;
  source: string;
  user: string;
};

export type LowStockRow = {
  id: string;
  productId: string;
  product: string;
  variant: string;
  quantity: number;
  threshold: number;
  warehouses: string[];
};

export type ReportCard = {
  id: string;
  title: string;
  description: string;
  exportLabel: string;
  summary: string;
  detail: string;
};

export type ReportBuilderEntity = "sales" | "inventory" | "customers" | "suppliers" | "finance";

export type CustomReportRequest = {
  entity: ReportBuilderEntity;
  fields: string[];
  filters: Record<string, string>;
  groupBy: string[];
};

export type CustomReportPreview = {
  entity: ReportBuilderEntity;
  fields: string[];
  filters: Record<string, unknown>;
  groupBy: string[];
  previewColumns: string[];
  previewRows: Array<Record<string, unknown>>;
  totalRows: number;
  exportLabel: string;
};

export type SearchResult = {
  type: string;
  label: string;
  href: string;
  meta?: string;
  description?: string;
  keywords?: string[];
};

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  rawRole: UserRole;
  isActive: boolean;
  status: string;
};

export type WarehouseSummary = {
  id: string;
  name: string;
  location: string;
  type: string;
  isActive: boolean;
};

export type SettingsPayload = {
  companyProfile: {
    name: string;
    address: string;
    panNo?: string;
    vatNo?: string;
    bankDetails: string;
    email?: string;
    phone?: string;
    website?: string;
  };
  currency: {
    baseCurrency: string;
    supportedCurrencies: string[];
    multiCurrencyEnabled: boolean;
  };
  invoiceTemplate: {
    primaryColor: string;
    footerText: string;
    paymentTerms: string;
  };
  notification: {
    overdueInvoiceDays: number[];
    lowStockEnabled: boolean;
    deliveryUpdatesEnabled: boolean;
    emailEnabled: boolean;
  };
  warehouses: WarehouseSummary[];
  taxRates: TaxRateRow[];
  users: UserRow[];
};
