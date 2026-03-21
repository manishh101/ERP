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
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
};

export type DashboardRecentSalesOrder = {
  id: string;
  customer: string;
  status: string;
  deliveryDate: string;
  total: number;
};

export type DashboardLowStockItem = {
  id: string;
  product: string;
  variant: string;
  quantity: number;
};

export type DashboardPayload = {
  kpis: Kpi[];
  revenueVsCogs: Array<{ month: string; revenue: number; cogs: number }>;
  cashFlow: Array<{ month: string; inflow: number; outflow: number }>;
  topProducts: Array<{ name: string; quantity: number }>;
  recentSalesOrders: DashboardRecentSalesOrder[];
  lowStockItems: DashboardLowStockItem[];
};

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  className?: string;
  render?: (row: T) => ReactNode;
};

export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  material: string;
  status: string;
  stock: number;
  margin: number;
  valuation: number;
  sellingPrice: number;
  defaultVariantId: string;
};

export type PurchaseOrderLineRow = {
  id: string;
  quantity: number;
  receivedQuantity: number;
  product: string;
  variant: string;
};

export type PurchaseOrderRow = {
  id: string;
  supplier: string;
  status: string;
  orderDate: string;
  expectedDelivery: string | null;
  totalAmount: number;
  receipts: number;
  supplierInvoices: number;
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
  description: string;
  status: string;
  variantRows: ProductDetailVariantRow[];
  metrics: ProductDetailMetric[];
  history: ProductDetailHistoryItem[];
};

export type SupplierRow = {
  id: string;
  name: string;
  country: string;
  leadTime: string;
  onTimeRate: string;
  spend: number;
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
  customer: string;
  status: string;
  rawStatus: string;
  deliveryDate: string;
  total: number;
  balanceDue: number;
};

export type TaxInvoiceRow = {
  id: string;
  soId: string;
  invoiceNumber: string;
  customer: string;
  status: string;
  dueDate: string | null;
  amount: number; // Will map to invoiceAmount
  balance: number;
  invoiceType: string;
  printed?: boolean;
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
  customer: string;
  driver: string;
  status: string;
  scheduledDate: string;
  route: string;
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
    taxNumber: string;
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
