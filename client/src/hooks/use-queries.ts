import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { formatCurrency, formatEnumLabel, formatNumber, toNumber } from "@/lib/utils";
import type {
  CustomReportPreview,
  CustomReportRequest,
  DashboardPayload,
  DeliveryRow,
  InventoryMovementRow,
  InventoryRecordRow,
  InventoryValuationRow,
  InvoiceRow,
  LowStockRow,
  ProductDetailPayload,
  ProductRow,
  PurchaseOrderMatchSummary,
  PurchaseOrderRow,
  ReportBuilderEntity,
  SearchResult,
  SettingsPayload,
  StockAdjustmentReason,
  SupplierRow,
  SalesOrderRow,
  UserRole,
  UserRow,
} from "@/types/domain";

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
};

type RawDashboardPayload = {
  kpis: DashboardPayload["kpis"];
  revenueVsCogs: DashboardPayload["revenueVsCogs"];
  cashFlow: DashboardPayload["cashFlow"];
  topProducts: DashboardPayload["topProducts"];
  recentSalesOrders: Array<{
    id: string;
    customer: string;
    status: string;
    deliveryDate: string;
    total: number | string;
  }>;
  lowStockItems?: Array<{
    id: string;
    product: string;
    variant: string;
    quantity: number | string;
  }>;
};

type RawProduct = {
  id: string;
  name: string;
  sku: string;
  category: string;
  material?: string | null;
  status: string;
  costPrice: number | string;
  sellingPrice: number | string;
  variants: Array<{
    stockQuantity: number | string;
  }>;
};

type RawProductHistoryResponse = {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  costPrice: number | string;
  sellingPrice: number | string;
  variants: Array<{
    id: string;
    variantName: string;
    stockQuantity: number | string;
    inventoryItems: Array<{
      id: string;
      quantity: number | string;
      warehouse: {
        name: string;
      };
    }>;
    stockMovements: Array<{
      id: string;
      type: string;
      quantity: number;
      occurredAt: string;
      source: string;
      warehouse: {
        name: string;
      };
    }>;
    soLineItems: Array<{
      id: string;
      quantity: number;
      createdAt: string;
      salesOrder: {
        id: string;
        customer: {
          name: string;
        };
      };
    }>;
  }>;
};

type RawSupplier = {
  id: string;
  name: string;
  country: string;
  leadTimeDays: number;
  purchaseOrders: Array<{
    totalAmount: number | string;
  }>;
};

type RawSupplierMetrics = {
  supplierId: string;
  averageLeadTimeDays: number | string;
  onTimeDeliveryRate: number | string;
  totalSpend: number | string;
};

type RawPurchaseOrder = {
  id: string;
  status: string;
  orderDate: string;
  expectedDelivery?: string | null;
  totalAmount: number | string;
  supplier: {
    name: string;
  };
  goodsReceipts?: Array<{
    id: string;
  }>;
  supplierInvoices?: Array<{
    id: string;
  }>;
  lineItems: Array<{
    id: string;
    quantity: number | string;
    receivedQuantity: number | string;
    productVariant: {
      variantName: string;
      product: {
        name: string;
      };
    };
  }>;
};

type RawPurchaseOrderMatchSummary = {
  purchaseOrderId: string;
  poStatus: string;
  poValue: number | string;
  receivedValue: number | string;
  invoicedValue: number | string;
  isMatched: boolean;
  receipts: number | string;
  supplierInvoices: number | string;
};

type RawSalesOrder = {
  id: string;
  status: string;
  orderDate: string;
  deliveryDate?: string | null;
  balanceDue: number | string;
  customer: {
    name: string;
  };
};

type RawInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  dueDate?: string | null;
  total: number | string;
  amountPaid: number | string;
  salesOrder: {
    customer: {
      name: string;
    };
  };
};

type RawDelivery = {
  id: string;
  status: string;
  scheduledDate: string;
  vehicle?: string | null;
  deliveryAddress: string;
  driver?: {
    name: string;
  } | null;
  salesOrder: {
    customer: {
      name: string;
    };
  };
};

type RawInventoryRecord = {
  id: string;
  productVariantId: string;
  warehouseId: string;
  quantity: number | string;
  status: string;
  warehouse: {
    name: string;
  };
  productVariant: {
    variantName: string;
    product: {
      name: string;
    };
  };
};

type RawInventoryMovement = {
  id: string;
  type: string;
  quantity: number | string;
  occurredAt: string;
  source?: string | null;
  user?: {
    name: string;
  } | null;
  warehouse: {
    name: string;
  };
  productVariant: {
    variantName: string;
    product: {
      name: string;
    };
  };
};

type RawInventoryValuationResponse = {
  items: Array<{
    id: string;
    product: string;
    variant: string;
    stockQuantity: number | string;
    unitCost: number | string;
    totalValue: number | string;
    byWarehouse: Array<{
      warehouse: string;
      quantity: number | string;
      status: string;
      value: number | string;
    }>;
  }>;
  totalValue: number | string;
};

type RawLowStockItem = {
  id: string;
  variantName: string;
  stockQuantity: number | string;
  product: {
    id: string;
    name: string;
    lowStockThreshold: number | string;
  };
  inventoryItems: Array<{
    warehouse: {
      name: string;
    };
  }>;
};

type RawSearchPayload = {
  products: Array<{
    id: string;
    name: string;
    sku: string;
  }>;
  customers: Array<{
    id: string;
    name: string;
    email?: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
  }>;
  salesOrders: Array<{
    id: string;
  }>;
};

type RawUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
};

type RawSettingsPayload = {
  companyProfile?: {
    name: string;
    address: string;
    taxNumber: string;
    bankDetails: string;
  } | null;
  currencySetting?: {
    baseCurrency: string;
    supportedCurrencies: unknown;
    multiCurrencyEnabled: boolean;
  } | null;
  invoiceTemplate?: {
    primaryColor: string;
    footerText: string;
    paymentTerms: string;
  } | null;
  notificationSetting?: {
    overdueInvoiceDays: unknown;
    lowStockEnabled: boolean;
    deliveryUpdatesEnabled: boolean;
    emailEnabled: boolean;
  } | null;
  warehouses: Array<{
    id: string;
    name: string;
    location: string;
    type: string;
    isActive: boolean;
  }>;
  taxRates: Array<{
    id: string;
    name: string;
    rate: number;
    category: string;
    isCompound: boolean;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  }>;
};

type RawAccount = {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number | string;
};

type RawJournalEntryList = PaginatedResponse<{
  id: string;
  date: string;
  description: string;
  reference?: string | null;
  createdBy?: {
    name: string;
  } | null;
}>;

type RawProfitAndLoss = {
  accounts: Array<{
    name: string;
    type: string;
    amount: number | string;
  }>;
  income: number | string;
  expenses: number | string;
  netProfit: number | string;
};

type RawBalanceSheet = {
  assets: RawAccount[];
  liabilities: RawAccount[];
  equity: RawAccount[];
};

type RawCashFlow = {
  operating: number | string;
  investing: number | string;
  financing: number | string;
  netChange: number | string;
};

type RawTrialBalanceRow = {
  code: string;
  name: string;
  type: string;
  debit: number | string;
  credit: number | string;
};

type RawTaxSummary = {
  outputTax: number | string;
  inputTax: number | string;
  netPayable: number | string;
};

type RawSalesReport = {
  rows: Array<{
    revenue?: number | string;
    quantity?: number | string;
  }>;
  exportFormats: string[];
  groupBy: string;
};

type RawInventoryReport = {
  currentStock: Array<{
    id: string;
    quantity: number | string;
    overstock: boolean;
    slowMoving: boolean;
  }>;
  exportFormats: string[];
};

type RawMarginReport = {
  rows: Array<{
    revenue?: number | string;
    cost?: number | string;
  }>;
  overall: number | string;
  exportFormats: string[];
};

type RawSuppliersReport = {
  rows: Array<{
    supplier: string;
    spend: number | string;
    purchaseOrders: number;
    onTimeRate: number | string;
  }>;
  exportFormats: string[];
};

type RawCustomersReport = {
  topCustomers: Array<{
    customer: string;
    revenue: number | string;
  }>;
  atRisk: Array<Record<string, unknown>>;
  lifecycle: {
    newCustomers: number;
    returningCustomers: number;
  };
  exportFormats: string[];
};

type RawFinancialSummary = {
  profitAndLoss: RawProfitAndLoss;
  balanceSheet: RawBalanceSheet;
  cashFlow: RawCashFlow;
  arAging: Array<Record<string, unknown>>;
  apAging: Array<Record<string, unknown>>;
  exportFormats: string[];
};

type RawCustomReportPreviewResponse = {
  entity: ReportBuilderEntity;
  fields: string[];
  filters: Record<string, unknown>;
  groupBy: string[];
  preview: Array<Record<string, unknown>>;
  totalRows: number;
  exportFormats: string[];
};

function mapDashboardPayload(payload: RawDashboardPayload): DashboardPayload {
  return {
    ...payload,
    recentSalesOrders: payload.recentSalesOrders.map((order) => ({
      ...order,
      status: formatEnumLabel(order.status),
      total: toNumber(order.total),
    })),
    lowStockItems: (payload.lowStockItems ?? []).map((item) => ({
      ...item,
      quantity: toNumber(item.quantity),
    })),
  };
}

function mapProduct(product: RawProduct): ProductRow {
  const stock = product.variants.reduce((sum, variant) => sum + toNumber(variant.stockQuantity), 0);
  const costPrice = toNumber(product.costPrice);
  const sellingPrice = toNumber(product.sellingPrice);
  const margin = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;

  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    category: product.category,
    material: product.material ?? "Standard finish",
    status: formatEnumLabel(product.status),
    stock,
    margin,
    valuation: stock * costPrice,
  };
}

function mapProductDetail(product: RawProductHistoryResponse): ProductDetailPayload {
  const costPrice = toNumber(product.costPrice);
  const sellingPrice = toNumber(product.sellingPrice);
  const margin = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;
  const recentSalesQty = product.variants.reduce(
    (sum, variant) => sum + variant.soLineItems.reduce((variantSum, item) => variantSum + item.quantity, 0),
    0,
  );

  const variantRows = product.variants.flatMap((variant) => {
    if (variant.inventoryItems.length === 0) {
      return [
        {
          id: `${variant.id}-unassigned`,
          variant: variant.variantName,
          warehouse: "Unassigned warehouse",
          quantity: toNumber(variant.stockQuantity),
        },
      ];
    }

    return variant.inventoryItems.map((item) => ({
      id: item.id,
      variant: variant.variantName,
      warehouse: item.warehouse.name,
      quantity: toNumber(item.quantity),
    }));
  });

  const history = [
    ...product.variants.flatMap((variant) =>
      variant.stockMovements.map((movement) => ({
        id: `movement-${movement.id}`,
        timestamp: Date.parse(movement.occurredAt),
        label: `${formatEnumLabel(movement.type)} ${Math.abs(movement.quantity)} units at ${movement.warehouse.name} (${movement.source})`,
      })),
    ),
    ...product.variants.flatMap((variant) =>
      variant.soLineItems.map((lineItem) => ({
        id: `sales-${lineItem.id}`,
        timestamp: Date.parse(lineItem.createdAt),
        label: `${lineItem.salesOrder.id} reserved ${lineItem.quantity} units for ${lineItem.salesOrder.customer.name}`,
      })),
    ),
  ]
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 8)
    .map(({ id, label }) => ({ id, label }));

  return {
    id: product.id,
    name: product.name,
    description: product.description ?? "No product description has been added yet.",
    status: formatEnumLabel(product.status),
    variantRows,
    metrics: [
      { label: "Average cost", value: formatCurrency(costPrice) },
      { label: "Selling price", value: formatCurrency(sellingPrice) },
      { label: "Gross margin", value: `${margin}%` },
      { label: "Recent sales qty", value: `${recentSalesQty} units` },
    ],
    history:
      history.length > 0
        ? history
        : [{ id: "empty-history", label: "No recent movement or sales history is available for this product yet." }],
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function normalizeNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function mapSalesOrder(order: RawSalesOrder): SalesOrderRow {
  return {
    id: order.id,
    customer: order.customer.name,
    status: formatEnumLabel(order.status),
    deliveryDate: order.deliveryDate ?? order.orderDate,
    balanceDue: toNumber(order.balanceDue),
  };
}

function mapInvoice(invoice: RawInvoice): InvoiceRow {
  const amount = toNumber(invoice.total);
  const paid = toNumber(invoice.amountPaid);

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customer: invoice.salesOrder.customer.name,
    status: formatEnumLabel(invoice.status),
    dueDate: invoice.dueDate ?? null,
    amount,
    balance: Math.max(amount - paid, 0),
  };
}

function mapDelivery(delivery: RawDelivery): DeliveryRow {
  const route = [delivery.vehicle, delivery.deliveryAddress].filter(Boolean).join(" · ");

  return {
    id: delivery.id,
    customer: delivery.salesOrder.customer.name,
    driver: delivery.driver?.name ?? "Unassigned",
    status: formatEnumLabel(delivery.status),
    scheduledDate: delivery.scheduledDate,
    route,
  };
}

function mapSearchResults(payload: RawSearchPayload): SearchResult[] {
  return [
    ...payload.products.map((product) => ({
      type: "Product",
      label: product.name,
      href: `/inventory/products/${product.id}`,
      meta: product.sku,
    })),
    ...payload.customers.map((customer) => ({
      type: "Customer",
      label: customer.name,
      href: "/sales",
      meta: customer.email ?? undefined,
    })),
    ...payload.invoices.map((invoice) => ({
      type: "Invoice",
      label: invoice.invoiceNumber,
      href: "/invoicing",
    })),
    ...payload.salesOrders.map((order) => ({
      type: "Order",
      label: order.id,
      href: "/sales",
    })),
  ].slice(0, 10);
}

function mapUsers(payload: PaginatedResponse<RawUser>) {
  return {
    ...payload,
    items: payload.items.map<UserRow>((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: formatEnumLabel(user.role),
      rawRole: user.role as UserRole,
      isActive: user.isActive,
      status: user.isActive ? "Active" : "Inactive",
    })),
  };
}

function mapSettings(payload: RawSettingsPayload): SettingsPayload {
  return {
    companyProfile: {
      name: payload.companyProfile?.name ?? "",
      address: payload.companyProfile?.address ?? "",
      taxNumber: payload.companyProfile?.taxNumber ?? "",
      bankDetails: payload.companyProfile?.bankDetails ?? "",
    },
    currency: {
      baseCurrency: payload.currencySetting?.baseCurrency ?? "USD",
      supportedCurrencies: normalizeStringArray(payload.currencySetting?.supportedCurrencies),
      multiCurrencyEnabled: payload.currencySetting?.multiCurrencyEnabled ?? false,
    },
    invoiceTemplate: {
      primaryColor: payload.invoiceTemplate?.primaryColor ?? "#7c5c45",
      footerText: payload.invoiceTemplate?.footerText ?? "Thank you for your business.",
      paymentTerms: payload.invoiceTemplate?.paymentTerms ?? "Payment due within 14 days.",
    },
    notification: {
      overdueInvoiceDays: normalizeNumberArray(payload.notificationSetting?.overdueInvoiceDays),
      lowStockEnabled: payload.notificationSetting?.lowStockEnabled ?? true,
      deliveryUpdatesEnabled: payload.notificationSetting?.deliveryUpdatesEnabled ?? true,
      emailEnabled: payload.notificationSetting?.emailEnabled ?? true,
    },
    warehouses: payload.warehouses.map((warehouse) => ({
      ...warehouse,
      type: formatEnumLabel(warehouse.type),
    })),
    taxRates: payload.taxRates || [],
    users: (payload.users || []).map((user) => ({
      ...user,
      rawRole: user.role as UserRole,
      status: user.isActive ? "Active" : "Inactive",
    })),
  };
}

function mapPurchaseOrder(order: RawPurchaseOrder): PurchaseOrderRow {
  const lineItems = order.lineItems.map((lineItem) => ({
    id: lineItem.id,
    quantity: toNumber(lineItem.quantity),
    receivedQuantity: toNumber(lineItem.receivedQuantity),
    product: lineItem.productVariant.product.name,
    variant: lineItem.productVariant.variantName,
  }));

  return {
    id: order.id,
    supplier: order.supplier.name,
    status: formatEnumLabel(order.status),
    orderDate: order.orderDate,
    expectedDelivery: order.expectedDelivery ?? null,
    totalAmount: toNumber(order.totalAmount),
    receipts: order.goodsReceipts?.length ?? 0,
    supplierInvoices: order.supplierInvoices?.length ?? 0,
    pendingQuantity: lineItems.reduce(
      (sum, lineItem) => sum + Math.max(lineItem.quantity - lineItem.receivedQuantity, 0),
      0,
    ),
    lineItems,
  };
}

function mapPurchaseOrderMatchSummary(payload: RawPurchaseOrderMatchSummary): PurchaseOrderMatchSummary {
  return {
    purchaseOrderId: payload.purchaseOrderId,
    poStatus: formatEnumLabel(payload.poStatus),
    poValue: toNumber(payload.poValue),
    receivedValue: toNumber(payload.receivedValue),
    invoicedValue: toNumber(payload.invoicedValue),
    isMatched: payload.isMatched,
    receipts: toNumber(payload.receipts),
    supplierInvoices: toNumber(payload.supplierInvoices),
  };
}

function mapInventoryRecord(record: RawInventoryRecord): InventoryRecordRow {
  return {
    id: record.id,
    productVariantId: record.productVariantId,
    product: record.productVariant.product.name,
    variant: record.productVariant.variantName,
    warehouseId: record.warehouseId,
    warehouse: record.warehouse.name,
    quantity: toNumber(record.quantity),
    status: formatEnumLabel(record.status),
  };
}

function mapInventoryMovement(movement: RawInventoryMovement): InventoryMovementRow {
  return {
    id: movement.id,
    product: movement.productVariant.product.name,
    variant: movement.productVariant.variantName,
    warehouse: movement.warehouse.name,
    type: formatEnumLabel(movement.type),
    quantity: toNumber(movement.quantity),
    occurredAt: movement.occurredAt,
    source: movement.source ?? "Manual update",
    user: movement.user?.name ?? "System",
  };
}

function mapInventoryValuation(item: RawInventoryValuationResponse["items"][number]): InventoryValuationRow {
  return {
    id: item.id,
    product: item.product,
    variant: item.variant,
    stockQuantity: toNumber(item.stockQuantity),
    unitCost: toNumber(item.unitCost),
    totalValue: toNumber(item.totalValue),
    byWarehouse: item.byWarehouse.map((warehouse) => ({
      warehouse: warehouse.warehouse,
      quantity: toNumber(warehouse.quantity),
      status: formatEnumLabel(warehouse.status),
      value: toNumber(warehouse.value),
    })),
  };
}

function mapLowStockItem(item: RawLowStockItem): LowStockRow {
  return {
    id: item.id,
    productId: item.product.id,
    product: item.product.name,
    variant: item.variantName,
    quantity: toNumber(item.stockQuantity),
    threshold: toNumber(item.product.lowStockThreshold),
    warehouses: item.inventoryItems.map((inventoryItem) => inventoryItem.warehouse.name),
  };
}

function sumAccountBalances(accounts: RawAccount[]) {
  return accounts.reduce((sum, account) => sum + toNumber(account.balance), 0);
}

function toExportLabel(formats: string[]) {
  return formats.map((format) => format.toUpperCase()).join(" / ");
}

function toPercentLabel(value: number) {
  return `${Math.round(value)}%`;
}

function mapCustomReportPreview(payload: RawCustomReportPreviewResponse): CustomReportPreview {
  const previewColumns =
    payload.preview.length > 0 ? Object.keys(payload.preview[0]) : payload.fields;

  return {
    entity: payload.entity,
    fields: payload.fields,
    filters: payload.filters,
    groupBy: payload.groupBy,
    previewColumns,
    previewRows: payload.preview,
    totalRows: payload.totalRows,
    exportLabel: toExportLabel(payload.exportFormats),
  };
}

export function useDashboardQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["dashboard", token],
    enabled: Boolean(token),
    queryFn: async () =>
      mapDashboardPayload(await apiRequest<RawDashboardPayload>("/dashboard/summary", { token: token! })),
  });
}

export function useProductsQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["products", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawProduct>>("/products", {
        token: token!,
        query: { pageSize: 100 },
      });

      return {
        ...response,
        items: response.items.map(mapProduct),
      };
    },
  });
}

export type ProductCreatePayload = {
  name: string;
  sku: string;
  category: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  material?: string;
  color?: string;
  length?: number;
  width?: number;
  height?: number;
  weight?: number;
  status: string;
  lowStockThreshold?: number;
  taxRateId?: string;
  variants: Array<{
    variantName: string;
    sku: string;
    barcode?: string;
  }>;
};

export function useCreateProductMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async (payload: ProductCreatePayload) => {
      return apiRequest<RawProduct>("/products", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

export function useProductDetailQuery(productId?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["product-detail", token, productId],
    enabled: Boolean(token) && Boolean(productId),
    queryFn: async () =>
      mapProductDetail(
        await apiRequest<RawProductHistoryResponse>(`/products/${productId}/history`, {
          token: token!,
        }),
      ),
  });
}

export type SupplierCreatePayload = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  country: string;
  taxNumber?: string;
  leadTimeDays: number;
  isActive: boolean;
  notes?: string;
};

export function useCreateSupplierMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async (payload: SupplierCreatePayload) => {
      return apiRequest<RawSupplier>("/suppliers", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useSuppliersQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["suppliers", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawSupplier>>("/suppliers", {
        token: token!,
        query: { pageSize: 100 },
      });

      const metricResults = await Promise.allSettled(
        response.items.map((supplier) =>
          apiRequest<RawSupplierMetrics>(`/suppliers/${supplier.id}/metrics`, {
            token: token!,
          }),
        ),
      );

      const metricsBySupplierId = response.items.reduce<Record<string, RawSupplierMetrics | undefined>>(
        (accumulator, supplier, index) => {
          const result = metricResults[index];

          if (result.status === "fulfilled") {
            accumulator[supplier.id] = result.value;
          }

          return accumulator;
        },
        {},
      );

      return {
        total: response.total,
        items: response.items.map<SupplierRow>((supplier) => {
          const metrics = metricsBySupplierId[supplier.id];
          const spend = metrics
            ? toNumber(metrics.totalSpend)
            : supplier.purchaseOrders.reduce((sum, po) => sum + toNumber(po.totalAmount), 0);
          const leadTimeDays = Math.round(toNumber(metrics?.averageLeadTimeDays ?? supplier.leadTimeDays));

          return {
            id: supplier.id,
            name: supplier.name,
            country: supplier.country,
            leadTime: `${leadTimeDays} days`,
            onTimeRate: metrics ? `${Math.round(toNumber(metrics.onTimeDeliveryRate))}%` : "N/A",
            spend,
          };
        }),
      };
    },
  });
}

export type PurchaseOrderCreatePayload = {
  supplierId: string;
  status: string;
  orderDate: string;
  expectedDelivery?: string;
  shippingTerms?: string;
  notes?: string;
  lineItems: Array<{
    productVariantId: string;
    quantity: number;
    unitCost: number;
    taxAmount: number;
  }>;
};

export function useCreatePurchaseOrderMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async (payload: PurchaseOrderCreatePayload) => {
      return apiRequest<RawPurchaseOrder>("/purchase-orders", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export function usePurchaseOrdersQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["purchase-orders", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawPurchaseOrder>>("/purchase-orders", {
        token: token!,
        query: { pageSize: 100 },
      });

      return {
        ...response,
        items: response.items.map(mapPurchaseOrder),
      };
    },
  });
}

export type CustomerCreatePayload = {
  name: string;
  email?: string;
  phone?: string;
  type: string;
  creditLimit: number;
  address: string;
};

export type RawCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  creditLimit: number | string;
  address: string;
};

export function useCreateCustomerMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: CustomerCreatePayload) => {
      return apiRequest<RawCustomer>("/customers", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useCustomersQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["customers", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawCustomer>>("/customers", {
        token: token!,
        query: { pageSize: 100 },
      });
      return response;
    },
  });
}

export type SalesOrderCreatePayload = {
  customerId: string;
  assignedWarehouseId?: string;
  status: string;
  depositAmount: number;
  deliveryDate?: string;
  notes?: string;
  lineItems: Array<{
    productVariantId: string;
    quantity: number;
    unitPrice: number;
    discountPct: number;
  }>;
};

export function useCreateSalesOrderMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: SalesOrderCreatePayload) => {
      return apiRequest<RawSalesOrder>("/sales-orders", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
    },
  });
}

export function useSalesOrdersQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["sales-orders", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawSalesOrder>>("/sales-orders", {
        token: token!,
        query: { pageSize: 100 },
      });

      return {
        ...response,
        items: response.items.map(mapSalesOrder),
      };
    },
  });
}

export type InvoiceCreatePayload = {
  soId: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  status: string;
  total: number;
  taxAmount: number;
  amountPaid: number;
  notes?: string;
};

export function useCreateInvoiceMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: InvoiceCreatePayload) => {
      return apiRequest<any>("/invoices", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export type PaymentCreatePayload = {
  invoiceId?: string;
  purchaseOrderId?: string;
  supplierInvoiceId?: string;
  amount: number;
  method: string;
  paymentDate?: string;
  reference?: string;
  note?: string;
};

export function useRecordPaymentMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: PaymentCreatePayload) => {
      return apiRequest<any>("/payments", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
  });
}

export function useInvoicesQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["invoices", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawInvoice>>("/invoices", {
        token: token!,
        query: { pageSize: 100 },
      });

      return {
        ...response,
        items: response.items.map(mapInvoice),
      };
    },
  });
}

export type DeliveryCreatePayload = {
  soId: string;
  driverId?: string;
  status: string;
  scheduledDate: string;
  vehicle?: string;
  deliveryAddress: string;
  notes?: string;
  proofPhotoUrl?: string;
};

export function useCreateDeliveryMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: DeliveryCreatePayload) => {
      return apiRequest<any>("/deliveries", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export type DeliveryUpdatePayload = {
  id: string;
  status?: string;
  proofPhotoUrl?: string;
  driverId?: string;
  vehicle?: string;
};

export function useUpdateDeliveryMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...payload }: DeliveryUpdatePayload) => {
      return apiRequest<any>(`/deliveries/${id}`, {
        method: "PATCH",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
}

export function useDeliveriesQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["deliveries", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawDelivery>>("/deliveries", {
        token: token!,
        query: { pageSize: 100 },
      });

      return {
        ...response,
        items: response.items.map(mapDelivery),
      };
    },
  });
}

export function usePurchaseOrderMatchMutation() {
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const canMatch = user?.role === "ADMIN" || user?.role === "ACCOUNTANT" || user?.role === "WAREHOUSE";

      if (!token || !canMatch) {
        throw new Error("Admin, accountant, or warehouse access is required to run a 3-way match.");
      }

      return mapPurchaseOrderMatchSummary(
        await apiRequest<RawPurchaseOrderMatchSummary>(`/purchase-orders/${id}/match`, {
          method: "POST",
          token,
        }),
      );
    },
  });
}

export function useReceivePurchaseOrderMutation() {
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      notes?: string;
      lines: Array<{
        poLineItemId: string;
        quantityReceived: number;
        discrepancyQty?: number;
      }>;
    }) => {
      const canReceive = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

      if (!token || !canReceive) {
        throw new Error("Admin or warehouse access is required to receive goods.");
      }

      return apiRequest(`/purchase-orders/${input.id}/receive`, {
        method: "POST",
        token,
        body: {
          notes: input.notes,
          lines: input.lines,
        },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-records"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["low-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
}

export function useInventoryRecordsQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["inventory-records", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawInventoryRecord>>("/inventory", {
        token: token!,
        query: { pageSize: 200 },
      });

      return {
        ...response,
        items: response.items.map(mapInventoryRecord),
      };
    },
  });
}

export function useInventoryMovementsQuery(pageSize = 8) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["inventory-movements", token, pageSize],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawInventoryMovement>>("/inventory/movements", {
        token: token!,
        query: { pageSize },
      });

      return {
        ...response,
        items: response.items.map(mapInventoryMovement),
      };
    },
  });
}

export function useInventoryValuationQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["inventory-valuation", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<RawInventoryValuationResponse>("/inventory/valuation", {
        token: token!,
      });

      return {
        items: response.items.map(mapInventoryValuation),
        totalValue: toNumber(response.totalValue),
      };
    },
  });
}

export function useLowStockQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["low-stock", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<RawLowStockItem[]>("/inventory/low-stock", {
        token: token!,
      });

      return response.map(mapLowStockItem);
    },
  });
}

export function useInventoryAdjustmentMutation() {
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      productVariantId: string;
      warehouseId: string;
      quantityDelta: number;
      reason: StockAdjustmentReason;
      source: string;
    }) => {
      const canAdjust = user?.role === "ADMIN" || user?.role === "WAREHOUSE";

      if (!token || !canAdjust) {
        throw new Error("Admin or warehouse access is required to create stock adjustments.");
      }

      return apiRequest("/inventory/adjustments", {
        method: "POST",
        token,
        body: input,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-records"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["low-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["product-detail"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
  });
}

export function useUsersQuery() {
  const { token, user } = useAuth();
  const enabled = Boolean(token) && user?.role === "ADMIN";

  return useQuery({
    queryKey: ["users", token, user?.role],
    enabled,
    queryFn: async () =>
      mapUsers(
        await apiRequest<PaginatedResponse<RawUser>>("/users", {
          token: token!,
          query: { pageSize: 100 },
        }),
      ),
  });
}

export function useInviteUserMutation() {
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      email: string;
      password: string;
      role: UserRole;
      isActive: boolean;
    }) => {
      if (!token || user?.role !== "ADMIN") {
        throw new Error("Admin access is required to invite users.");
      }

      return apiRequest<RawUser>("/users/invite", {
        method: "POST",
        token,
        body: input,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUserMutation() {
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      role: UserRole;
      isActive: boolean;
      name?: string;
      email?: string;
    }) => {
      if (!token || user?.role !== "ADMIN") {
        throw new Error("Admin access is required to update users.");
      }

      return apiRequest<RawUser>(`/users/${input.id}`, {
        method: "PATCH",
        token,
        body: {
          role: input.role,
          isActive: input.isActive,
          ...(input.name ? { name: input.name } : {}),
          ...(input.email ? { email: input.email } : {}),
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export type WarehouseCreatePayload = {
  name: string;
  location: string;
  type: string;
  isActive?: boolean;
};

export function useCreateWarehouseMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: WarehouseCreatePayload) => {
      return apiRequest<any>("/settings/warehouses", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useCreateTaxRateMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: any) => {
      return apiRequest<any>("/settings/tax-rates", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useUpdateTaxRateMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (input: { id: string; data: any }) => {
      return apiRequest<any>(`/settings/tax-rates/${input.id}`, {
        method: "PATCH",
        token: token!,
        body: input.data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

export function useSettingsQuery() {
  const { token, user } = useAuth();
  const enabled = Boolean(token) && user?.role === "ADMIN";

  return useQuery({
    queryKey: ["settings", token, user?.role],
    enabled,
    queryFn: async () =>
      mapSettings(
        await apiRequest<RawSettingsPayload>("/settings", {
          token: token!,
        }),
      ),
  });
}

export function useAccountsQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["accounts", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<RawAccount[]>("/accounting/accounts", {
        token: token!,
      });
      return response;
    },
  });
}

export type JournalEntryCreatePayload = {
  date: string;
  description: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  lines: Array<{
    accountId: string;
    debit: number;
    credit: number;
  }>;
};

export function useCreateJournalEntryMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: JournalEntryCreatePayload) => {
      return apiRequest<any>("/accounting/journal-entries", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounting-summary"] });
    },
  });
}

export function useAccountingSummaryQuery() {
  const { token, user } = useAuth();
  const enabled = Boolean(token) && (user?.role === "ADMIN" || user?.role === "ACCOUNTANT");

  return useQuery({
    queryKey: ["accounting-summary", token, user?.role],
    enabled,
    queryFn: async () => {
      const [journalEntries, accounts, profitLoss, balanceSheet, cashFlow, trialBalance, taxSummary] =
        await Promise.all([
          apiRequest<RawJournalEntryList>("/accounting/journal-entries", {
            token: token!,
            query: { pageSize: 4 },
          }),
          apiRequest<RawAccount[]>("/accounting/accounts", { token: token! }),
          apiRequest<RawProfitAndLoss>("/accounting/reports/profit-loss", { token: token! }),
          apiRequest<RawBalanceSheet>("/accounting/reports/balance-sheet", { token: token! }),
          apiRequest<RawCashFlow>("/accounting/reports/cash-flow", { token: token! }),
          apiRequest<RawTrialBalanceRow[]>("/accounting/reports/trial-balance", { token: token! }),
          apiRequest<RawTaxSummary>("/accounting/reports/tax-summary", { token: token! }),
        ]);

      const assets = sumAccountBalances(balanceSheet.assets);
      const liabilities = sumAccountBalances(balanceSheet.liabilities);
      const equity = sumAccountBalances(balanceSheet.equity);

      return {
        recentEntries: journalEntries.items.map((entry) => ({
          id: entry.id,
          description: entry.description,
          date: entry.date,
          reference: entry.reference ?? null,
          createdBy: entry.createdBy?.name ?? "System",
        })),
        statementCards: [
          {
            label: "Profit & Loss",
            value: formatCurrency(toNumber(profitLoss.netProfit)),
            detail: `Income ${formatCurrency(toNumber(profitLoss.income))} · Expenses ${formatCurrency(toNumber(profitLoss.expenses))}`,
          },
          {
            label: "Balance Sheet",
            value: formatCurrency(assets),
            detail: `Liabilities ${formatCurrency(liabilities)} · Equity ${formatCurrency(equity)}`,
          },
          {
            label: "Cash Flow",
            value: formatCurrency(toNumber(cashFlow.netChange)),
            detail: `Operating ${formatCurrency(toNumber(cashFlow.operating))} · Financing ${formatCurrency(toNumber(cashFlow.financing))}`,
          },
          {
            label: "Tax Summary",
            value: formatCurrency(toNumber(taxSummary.netPayable)),
            detail: `Output ${formatCurrency(toNumber(taxSummary.outputTax))} · Input ${formatCurrency(toNumber(taxSummary.inputTax))}`,
          },
        ],
        snapshotCards: [
          { label: "Accounts", value: String(accounts.length) },
          { label: "Journal Entries", value: String(journalEntries.total) },
          { label: "Trial Balance Lines", value: String(trialBalance.length) },
        ],
      };
    },
  });
}

export function useSearchQuery(search: string) {
  const { token } = useAuth();
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: ["search", token, normalizedSearch],
    enabled: Boolean(token) && normalizedSearch.length >= 2,
    queryFn: async () =>
      mapSearchResults(
        await apiRequest<RawSearchPayload>("/search/global", {
          token: token!,
          query: { q: normalizedSearch },
        }),
      ),
  });
}

export function useReportsQuery() {
  const { token, user } = useAuth();
  const enabled =
    Boolean(token) &&
    (user?.role === "ADMIN" || user?.role === "ACCOUNTANT" || user?.role === "SALES");

  return useQuery({
    queryKey: ["reports", token, user?.role],
    enabled,
    queryFn: async () => {
      const [sales, inventory, margin, suppliers, customers, financialSummary] = await Promise.all([
        apiRequest<RawSalesReport>("/reports/sales", { token: token! }),
        apiRequest<RawInventoryReport>("/reports/inventory", { token: token! }),
        apiRequest<RawMarginReport>("/reports/margin", { token: token! }),
        apiRequest<RawSuppliersReport>("/reports/suppliers", { token: token! }),
        apiRequest<RawCustomersReport>("/reports/customers", { token: token! }),
        apiRequest<RawFinancialSummary>("/reports/financial-summary", { token: token! }),
      ]);

      const salesRevenue = sales.rows.reduce((sum, row) => sum + toNumber(row.revenue), 0);
      const salesQuantity = sales.rows.reduce((sum, row) => sum + toNumber(row.quantity), 0);
      const inventoryQuantity = inventory.currentStock.reduce(
        (sum, item) => sum + toNumber(item.quantity),
        0,
      );
      const overstockCount = inventory.currentStock.filter((item) => item.overstock).length;
      const slowMovingCount = inventory.currentStock.filter((item) => item.slowMoving).length;
      const marginRevenue = margin.rows.reduce((sum, row) => sum + toNumber(row.revenue), 0);
      const marginCost = margin.rows.reduce((sum, row) => sum + toNumber(row.cost), 0);
      const grossMarginPercent = marginRevenue > 0 ? ((marginRevenue - marginCost) / marginRevenue) * 100 : 0;
      const supplierSpend = suppliers.rows.reduce((sum, row) => sum + toNumber(row.spend), 0);
      const averageSupplierOnTime =
        suppliers.rows.length > 0
          ? suppliers.rows.reduce((sum, row) => sum + toNumber(row.onTimeRate), 0) /
            suppliers.rows.length
          : 0;
      const customerRevenue = customers.topCustomers.reduce((sum, row) => sum + toNumber(row.revenue), 0);
      const arBalance = financialSummary.arAging.reduce(
        (sum, row) => sum + toNumber((row as { balance?: number | string }).balance),
        0,
      );
      const apBalance = financialSummary.apAging.reduce(
        (sum, row) => sum + toNumber((row as { balance?: number | string }).balance),
        0,
      );

      return {
        reportCards: [
          {
            id: "sales",
            title: "Sales Report",
            description:
              "Slice performance by product, category, salesperson, date range, and customer type.",
            exportLabel: toExportLabel(sales.exportFormats),
            summary: `${formatCurrency(salesRevenue)} from ${formatNumber(salesQuantity)} units`,
            detail: `${formatNumber(sales.rows.length)} rows grouped by ${formatEnumLabel(sales.groupBy)}`,
          },
          {
            id: "inventory",
            title: "Inventory Report",
            description:
              "Monitor current stock, slow movers, overstock, and warehouse availability.",
            exportLabel: toExportLabel(inventory.exportFormats),
            summary: `${formatNumber(inventory.currentStock.length)} variants holding ${formatNumber(inventoryQuantity)} units`,
            detail: `${formatNumber(slowMovingCount)} slow-moving · ${formatNumber(overstockCount)} overstock`,
          },
          {
            id: "margin",
            title: "Gross Margin Report",
            description:
              "Track profitability per SKU, category, and across the whole business.",
            exportLabel: toExportLabel(margin.exportFormats),
            summary: `${formatCurrency(toNumber(margin.overall))} gross margin`,
            detail: `${toPercentLabel(grossMarginPercent)} blended margin across ${formatNumber(margin.rows.length)} line items`,
          },
          {
            id: "suppliers",
            title: "Supplier Report",
            description:
              "Monitor supplier spend, purchase order volume, and delivery reliability.",
            exportLabel: toExportLabel(suppliers.exportFormats),
            summary: `${formatCurrency(supplierSpend)} supplier spend`,
            detail: `Average on-time ${toPercentLabel(averageSupplierOnTime)} across ${formatNumber(suppliers.rows.length)} suppliers`,
          },
          {
            id: "customers",
            title: "Customer Report",
            description:
              "Surface top customers, new customer acquisition, and at-risk receivables.",
            exportLabel: toExportLabel(customers.exportFormats),
            summary: `${formatCurrency(customerRevenue)} across top ${formatNumber(customers.topCustomers.length)} customers`,
            detail: `${formatNumber(customers.lifecycle.newCustomers)} new · ${formatNumber(customers.atRisk.length)} at risk`,
          },
          {
            id: "financial-summary",
            title: "Financial Summary",
            description:
              "Consolidated P&L, Balance Sheet, Cash Flow, AR aging, and AP aging.",
            exportLabel: toExportLabel(financialSummary.exportFormats),
            summary: `${formatCurrency(toNumber(financialSummary.profitAndLoss.netProfit))} net profit`,
            detail: `${formatCurrency(toNumber(financialSummary.cashFlow.netChange))} cash change · AR ${formatCurrency(arBalance)} · AP ${formatCurrency(apBalance)}`,
          },
        ],
        highlights: [
          {
            label: "Net Profit",
            value: formatCurrency(toNumber(financialSummary.profitAndLoss.netProfit)),
          },
          {
            label: "Operating Cash",
            value: formatCurrency(toNumber(financialSummary.cashFlow.operating)),
          },
          {
            label: "At-Risk AR",
            value: String(financialSummary.arAging.length),
          },
          {
            label: "Open AP",
            value: String(financialSummary.apAging.length),
          },
        ],
      };
    },
  });
}

export function useCustomReportPreviewMutation() {
  const { token, user } = useAuth();

  return useMutation({
    mutationFn: async (input: CustomReportRequest) => {
      const hasReportingAccess =
        user?.role === "ADMIN" || user?.role === "ACCOUNTANT" || user?.role === "SALES";

      if (!token || !hasReportingAccess) {
        throw new Error("Reporting access is required to preview custom reports.");
      }

      return mapCustomReportPreview(
        await apiRequest<RawCustomReportPreviewResponse>("/reports/custom-builder", {
          method: "POST",
          token,
          body: input,
        }),
      );
    },
  });
}

export function useCustomerLedgerQuery(customerId: string, options?: { startDate?: Date; endDate?: Date }) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["customer-ledger", customerId, options, token],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (options?.startDate) query.startDate = options.startDate.toISOString();
      if (options?.endDate) query.endDate = options.endDate.toISOString();

      const data = await apiRequest<any[]>("/reports/customer-ledger/" + customerId, {
        token: token!,
        query,
      });

      return data.map((tx: any) => ({
        ...tx,
        date: new Date(tx.date),
      }));
    },
    enabled: !!customerId && !!token,
  });
}
