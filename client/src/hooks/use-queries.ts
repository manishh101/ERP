import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/auth-provider";
import { API_BASE_URL, apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { formatCurrency, formatEnumLabel, formatNumber, toNumber } from "@/lib/utils";
import type {
  CustomReportPreview,
  CustomReportRequest,
  DashboardOverview,
  DeliveryRow,
  InventoryMovementRow,
  InventoryRecordRow,
  InventoryValuationRow,
  TaxInvoiceRow,
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
  SupplierInvoiceRow,
  SupplierInvoiceAttachment,
  SalesOrderRow,
  UserRole,
  UserRow,
  PaymentRow,
} from "@/types/domain";

type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
};

type RawProduct = {
  id: string;
  name: string;
  description?: string | null;
  sku: string;
  imageUrls: string[];
  category: string;
  material?: string | null;
  status: string;
  costPrice: number | string;
  sellingPrice: number | string;
  isSellable: boolean;
  hsCode?: string | null;
  woodType?: string | null;
  finishType?: string | null;
  assemblyRequired?: boolean;
  warrantyMonths?: number | string;
  leadTimeDays?: number | string;
  isCustomizable?: boolean;
  height?: number | string | null;
  width?: number | string | null;
  length?: number | string | null;
  variants: Array<{
    id: string;
    stockQuantity: number | string;
    sizeLabel?: string | null;
  }>;
};

type RawProductHistoryResponse = {
  id: string;
  name: string;
  sku: string;
  description?: string | null;
  status: string;
  costPrice: number | string;
  sellingPrice: number | string;
  category: string;
  material?: string | null;
  height?: number | string | null;
  width?: number | string | null;
  length?: number | string | null;
  imageUrls: string[];
  variants: Array<{
    id: string;
    variantName: string;
    stockQuantity: number | string;
    sizeLabel?: string | null;
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
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  panNo?: string | null;
  vatNo?: string | null;
  country: string;
  paymentTerms?: string | null;
  leadTimeDays: number;
  notes?: string | null;
  isActive?: boolean | null;
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
  supplierId: string;
  status: string;
  orderDate: string;
  expectedDelivery?: string | null;
  shippingTerms?: string | null;
  notes?: string | null;
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
    unitCost?: number | string;
    taxAmount?: number | string;
    supplierItemName?: string | null;
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
  orderAmount: number | string;
  paidAmount: number | string;
  balanceDue: number | string;
  isCustomOrder?: boolean;
  expectedReadyDate?: string | null;
  assemblyNotes?: string | null;
  deliveryFloor?: number | string | null;
  customer: {
    id: string;
    name: string;
    type: string;
  };
  lineItems?: any[];
};

type RawInvoice = {
  id: string;
  soId: string;
  invoiceNumber: string;
  status: string;
  dueDate?: string | null;
  invoiceAmount: number | string;
  taxAmount: number | string;
  amountPaid: number | string;
  invoiceType: string;
  bsDate?: string | null;
  fiscalYear?: string | null;
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
  floor?: number | null;
  assemblyNote?: string | null;
  deliveryCharge?: number | string | null;
  assemblyCharge?: number | string | null;
  floorDelivery?: boolean;
  assemblyService?: boolean;
};

type RawPayment = {
  id: string;
  amount: number | string;
  method: string;
  paymentDate: string;
  bsDate?: string | null;
  reference?: string | null;
  salesOrder?: { id: string; customer?: { name: string } } | null;
  purchaseOrder?: { id: string; supplier?: { name: string } } | null;
  supplierInvoice?: { id: string; invoiceNumber: string; supplier?: { name: string } } | null;
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
    category: string;
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
    category?: string | null;
    material?: string | null;
    sellingPrice?: number | string;
    variants?: Array<{ variantName: string; skuVariant: string }>;
  }>;
  customers: Array<{
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    type?: string | null;
    district?: string | null;
    address?: string | null;
    outstandingBalance?: number | string;
  }>;
  suppliers?: Array<{
    id: string;
    name: string;
    contact?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    country?: string | null;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status?: string | null;
    invoiceAmount?: number | string;
    bsDate?: string | null;
    salesOrder?: { id: string; customer?: { name: string } | null } | null;
  }>;
  supplierInvoices?: Array<{
    id: string;
    invoiceNumber: string;
    status?: string | null;
    totalAmount?: number | string;
    supplier?: { id: string; name: string } | null;
    purchaseOrder?: { id: string } | null;
  }>;
  salesOrders: Array<{
    id: string;
    status?: string | null;
    orderAmount?: number | string;
    balanceDue?: number | string;
    bsDate?: string | null;
    customer?: { id: string; name: string } | null;
  }>;
  purchaseOrders?: Array<{
    id: string;
    status?: string | null;
    totalAmount?: number | string;
    supplier?: { id: string; name: string } | null;
  }>;
  payments?: Array<{
    id: string;
    amount?: number | string;
    method?: string | null;
    reference?: string | null;
    bsDate?: string | null;
    salesOrder?: { id: string; customer?: { name: string } | null } | null;
    purchaseOrder?: { id: string; supplier?: { name: string } | null } | null;
    supplierInvoice?: { invoiceNumber: string; supplier?: { name: string } | null } | null;
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
    panNo?: string | null;
    vatNo?: string | null;
    bankDetails: string;
    email?: string;
    phone?: string;
    website?: string;
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
    isDefault: boolean;
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

function mapProduct(product: RawProduct): ProductRow {
  const stock = product.variants.reduce((sum, variant) => sum + toNumber(variant.stockQuantity), 0);
  const costPrice = toNumber(product.costPrice);
  const sellingPrice = toNumber(product.sellingPrice);
  const margin = sellingPrice > 0 ? Math.round(((sellingPrice - costPrice) / sellingPrice) * 100) : 0;

  return {
    id: product.id,
    name: product.name,
    description: product.description || "No product description has been added yet.",
    sku: product.sku,
    category: product.category,
    material: product.material ?? "Standard finish",
    status: formatEnumLabel(product.status),
    stock,
    margin,
    valuation: stock * costPrice,
    sellingPrice,
    costPrice,
    defaultVariantId: product.variants[0]?.id || "",
    imageUrls: product.imageUrls,
    isSellable: product.isSellable,
    hsCode: product.hsCode ?? undefined,
    woodType: product.woodType ?? undefined,
    finishType: product.finishType ?? undefined,
    assemblyRequired: product.assemblyRequired,
    warrantyMonths: toNumber(product.warrantyMonths),
    leadTimeDays: toNumber(product.leadTimeDays),
    isCustomizable: product.isCustomizable,
    height: toNumber(product.height),
    width: toNumber(product.width),
    length: toNumber(product.length),
    sizeLabel: product.variants[0]?.sizeLabel ?? undefined,
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
    const inventoryItems = variant.inventoryItems ?? [];
    if (inventoryItems.length === 0) {
      return [
        {
          id: `${variant.id}-unassigned`,
          variant: variant.variantName,
          warehouse: "Unassigned warehouse",
          quantity: toNumber(variant.stockQuantity),
        },
      ];
    }

    return inventoryItems.map((item) => ({
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
    sku: product.sku,
    description: product.description || "No product description has been added yet.",
    status: formatEnumLabel(product.status),
    category: product.category,
    material: product.material ?? "",
    costPrice,
    sellingPrice,
    margin,
    totalStock: variantRows.reduce((sum, v) => sum + v.quantity, 0),
    recentSalesQty,
    height: toNumber(product.height),
    width: toNumber(product.width),
    length: toNumber(product.length),
    sizeLabel: product.variants[0]?.sizeLabel ?? undefined,
    imageUrls: product.imageUrls ?? [],
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

function normalizeCurrencyCode(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) && normalized !== "USD"
    ? normalized
    : "NPR";
}

function normalizeSupportedCurrencies(value: unknown) {
  const currencies = normalizeStringArray(value).map(normalizeCurrencyCode);
  return Array.from(new Set(["NPR", ...currencies]));
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
    customerId: order.customer.id,
    customer: order.customer.name,
    customerType: order.customer.type,
    status: formatEnumLabel(order.status),
    rawStatus: order.status,
    orderDate: order.orderDate,
    deliveryDate: order.deliveryDate ?? order.orderDate,
    total: toNumber(order.orderAmount),
    balanceDue: toNumber(order.balanceDue),
    paidAmount: toNumber(order.paidAmount),
    cogs: order.lineItems
      ? order.lineItems.reduce((acc: number, li: any) => {
          const cost = li.productVariant
            ? (toNumber(li.productVariant.product?.costPrice) + toNumber(li.productVariant.additionalCost))
            : (toNumber(li.unitPrice) * 0.7);
          return acc + li.quantity * cost;
        }, 0)
      : 0,
    isCustomOrder: order.isCustomOrder,
    expectedReadyDate: order.expectedReadyDate ?? undefined,
    assemblyNotes: order.assemblyNotes ?? undefined,
    deliveryFloor: order.deliveryFloor ? toNumber(order.deliveryFloor) : undefined,
    items: order.lineItems
      ? order.lineItems.map((li: any) => ({
          name: li.productVariant?.product?.name || "Unknown Product",
          quantity: li.quantity,
        }))
      : [],
  };
}

function mapInvoice(invoice: RawInvoice): TaxInvoiceRow {
  const amount = toNumber(invoice.invoiceAmount);
  const paid = toNumber(invoice.amountPaid);

  return {
    id: invoice.id,
    soId: invoice.soId,
    invoiceNumber: invoice.invoiceNumber,
    customer: invoice.salesOrder.customer.name,
    status: formatEnumLabel(invoice.status),
    dueDate: invoice.dueDate ?? null,
    amount,
    balance: Math.max(amount - paid, 0),
    invoiceType: invoice.invoiceType,
    bsDate: invoice.bsDate ?? undefined,
    fiscalYear: invoice.fiscalYear ?? undefined,
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
    deliveryAddress: delivery.deliveryAddress,
    floor: delivery.floor ?? 0,
    assemblyNote: delivery.assemblyNote ?? undefined,
    deliveryCharge: toNumber(delivery.deliveryCharge),
    assemblyCharge: toNumber(delivery.assemblyCharge),
    floorDelivery: delivery.floorDelivery ?? false,
    assemblyService: delivery.assemblyService ?? false,
  };
}

function mapPayment(data: RawPayment): PaymentRow {
  let relatedEntity = "-";
  let relatedEntityId = "-";

  if (data.salesOrder) {
    relatedEntity = `Sales Order (Customer: ${data.salesOrder.customer?.name || 'Unknown'})`;
    relatedEntityId = data.salesOrder.id;
  } else if (data.supplierInvoice) {
    relatedEntity = `Supplier Invoice ${data.supplierInvoice.invoiceNumber} (Supplier: ${data.supplierInvoice.supplier?.name || 'Unknown'})`;
    relatedEntityId = data.supplierInvoice.id;
  } else if (data.purchaseOrder) {
    relatedEntity = `Purchase Order (Supplier: ${data.purchaseOrder.supplier?.name || 'Unknown'})`;
    relatedEntityId = data.purchaseOrder.id;
  }

  return {
    id: data.id,
    amount: toNumber(data.amount),
    method: data.method,
    date: String(data.paymentDate),
    bsDate: data.bsDate || "-",
    reference: data.reference || "-",
    relatedEntity,
    relatedEntityId,
  };
}

function scoreSearchResult(result: SearchResult, search: string) {
  const query = search.toLowerCase();
  const label = result.label.toLowerCase();
  const meta = result.meta?.toLowerCase() ?? "";
  const keywords = (result.keywords ?? []).join(" ").toLowerCase();
  const corpus = `${label} ${meta} ${result.description ?? ""} ${keywords}`.toLowerCase();

  if (label === query || meta === query) return 100;
  if (label.startsWith(query) || meta.startsWith(query)) return 80;
  if (label.includes(query) || meta.includes(query)) return 60;
  if (keywords.includes(query)) return 45;
  if (corpus.includes(query)) return 25;
  return 0;
}

function compactId(id: string) {
  return id.length > 12 ? id.slice(0, 8) : id;
}

// Global search fans out across ~8 tables with relation subqueries against a
// pooled/remote Postgres, so a settled query steadily takes ~3-4s. Bound the
// request generously above that so real results render, while still aborting a
// genuinely hung request (surfaced as the error state).
const SEARCH_REQUEST_TIMEOUT_MS = 8_000;

function createSearchRequestSignal(signal: AbortSignal) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SEARCH_REQUEST_TIMEOUT_MS);
  const abortRequest = () => controller.abort();

  signal.addEventListener("abort", abortRequest, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      window.clearTimeout(timeoutId);
      signal.removeEventListener("abort", abortRequest);
    },
  };
}

function mapSearchResults(payload: RawSearchPayload, search: string): SearchResult[] {
  const results: SearchResult[] = [
    ...payload.products.map((product) => {
      const variants = product.variants?.map((variant) => variant.variantName).filter(Boolean) ?? [];
      return {
        type: "Product",
        label: product.name,
        href: `/inventory/products/${product.id}`,
        meta: product.sku,
        description: [product.category, product.material, formatCurrency(toNumber(product.sellingPrice))]
          .filter(Boolean)
          .join(" · "),
        keywords: [product.id, product.name, product.sku, product.category ?? "", product.material ?? "", ...variants],
      };
    }),
    ...payload.customers.map((customer) => ({
      type: "Customer",
      label: customer.name,
      href: `/parties/${customer.id}`,
      meta: customer.phone || customer.email || formatEnumLabel(customer.type),
      description: [customer.district || customer.address, `Outstanding ${formatCurrency(toNumber(customer.outstandingBalance))}`]
        .filter(Boolean)
        .join(" · "),
      keywords: [customer.id, customer.name, customer.email ?? "", customer.phone ?? "", customer.type ?? "", customer.district ?? "", customer.address ?? ""],
    })),
    ...(payload.suppliers ?? []).map((supplier) => ({
      type: "Supplier",
      label: supplier.name,
      href: `/suppliers/${supplier.id}`,
      meta: supplier.phone || supplier.email || supplier.contact || undefined,
      description: [supplier.address || supplier.country, supplier.contact].filter(Boolean).join(" · "),
      keywords: [supplier.id, supplier.name, supplier.contact ?? "", supplier.email ?? "", supplier.phone ?? "", supplier.address ?? ""],
    })),
    ...payload.invoices.map((invoice) => ({
      type: "Invoice",
      label: invoice.invoiceNumber,
      href: "/invoicing",
      meta: formatCurrency(toNumber(invoice.invoiceAmount)),
      description: [formatEnumLabel(invoice.status), invoice.salesOrder?.customer?.name, invoice.bsDate]
        .filter(Boolean)
        .join(" · "),
      keywords: [invoice.id, invoice.invoiceNumber, invoice.status ?? "", invoice.bsDate ?? "", invoice.salesOrder?.id ?? "", invoice.salesOrder?.customer?.name ?? ""],
    })),
    ...(payload.supplierInvoices ?? []).map((invoice) => ({
      type: "Supplier Bill",
      label: invoice.invoiceNumber,
      href: "/supplier-invoices",
      meta: formatCurrency(toNumber(invoice.totalAmount)),
      description: [formatEnumLabel(invoice.status), invoice.supplier?.name, invoice.purchaseOrder?.id ? `PO-${compactId(invoice.purchaseOrder.id)}` : ""]
        .filter(Boolean)
        .join(" · "),
      keywords: [invoice.id, invoice.invoiceNumber, invoice.status ?? "", invoice.supplier?.name ?? "", invoice.purchaseOrder?.id ?? ""],
    })),
    ...payload.salesOrders.map((order) => ({
      type: "Sales Order",
      label: `SO-${compactId(order.id)}`,
      href: `/sales/${order.id}`,
      meta: formatCurrency(toNumber(order.orderAmount)),
      description: [formatEnumLabel(order.status), order.customer?.name, order.bsDate]
        .filter(Boolean)
        .join(" · "),
      keywords: [order.id, order.status ?? "", order.customer?.name ?? "", order.bsDate ?? ""],
    })),
    ...(payload.purchaseOrders ?? []).map((order) => ({
      type: "Purchase Order",
      label: `PO-${compactId(order.id)}`,
      href: `/purchasing/${order.id}`,
      meta: formatCurrency(toNumber(order.totalAmount)),
      description: [formatEnumLabel(order.status), order.supplier?.name].filter(Boolean).join(" · "),
      keywords: [order.id, order.status ?? "", order.supplier?.name ?? ""],
    })),
    ...(payload.payments ?? []).map((payment) => {
      const relatedParty =
        payment.salesOrder?.customer?.name ??
        payment.purchaseOrder?.supplier?.name ??
        payment.supplierInvoice?.supplier?.name;
      const relatedDocument =
        payment.salesOrder?.id ? `SO-${compactId(payment.salesOrder.id)}` :
        payment.purchaseOrder?.id ? `PO-${compactId(payment.purchaseOrder.id)}` :
        payment.supplierInvoice?.invoiceNumber;

      return {
        type: "Payment",
        label: payment.reference || `Payment ${compactId(payment.id)}`,
        href: "/payments",
        meta: formatCurrency(toNumber(payment.amount)),
        description: [formatEnumLabel(payment.method), relatedParty, relatedDocument, payment.bsDate]
          .filter(Boolean)
          .join(" · "),
        keywords: [payment.id, payment.reference ?? "", payment.method ?? "", payment.bsDate ?? "", relatedParty ?? "", relatedDocument ?? ""],
      };
    }),
  ];

  return results
    .map((result, index) => ({ result, score: scoreSearchResult(result, search), index }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ result }) => result)
    .slice(0, 24);
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
  const supportedCurrencies = normalizeSupportedCurrencies(
    payload.currencySetting?.supportedCurrencies,
  );

  return {
    companyProfile: {
      name: payload.companyProfile?.name ?? "",
      address: payload.companyProfile?.address ?? "",
      panNo: payload.companyProfile?.panNo ?? undefined,
      vatNo: payload.companyProfile?.vatNo ?? undefined,
      bankDetails: payload.companyProfile?.bankDetails ?? "",
      email: payload.companyProfile?.email ?? "",
      phone: payload.companyProfile?.phone ?? "",
      website: payload.companyProfile?.website ?? "",
    },
    currency: {
      baseCurrency: "NPR",
      supportedCurrencies,
      multiCurrencyEnabled:
        (payload.currencySetting?.multiCurrencyEnabled ?? false) &&
        supportedCurrencies.length > 1,
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
    unitCost: lineItem.unitCost !== undefined ? toNumber(lineItem.unitCost) : 0,
    taxAmount: lineItem.taxAmount !== undefined ? toNumber(lineItem.taxAmount) : 0,
    supplierItemName: lineItem.supplierItemName || undefined,
    product: lineItem.supplierItemName || lineItem.productVariant.product.name,
    variant: lineItem.productVariant.variantName,
  }));

  return {
    id: order.id,
    supplierId: order.supplierId,
    supplier: order.supplier.name,
    status: formatEnumLabel(order.status),
    rawStatus: order.status,
    orderDate: order.orderDate,
    expectedDelivery: order.expectedDelivery ?? null,
    shippingTerms: order.shippingTerms ?? undefined,
    notes: order.notes ?? undefined,
    totalAmount: toNumber(order.totalAmount),
    receipts: order.goodsReceipts?.length ?? 0,
    supplierInvoices: order.supplierInvoices?.length ?? 0,
    rawSupplierInvoices: (order.supplierInvoices || []).map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate,
      subtotal: toNumber(inv.subtotal),
      taxAmount: toNumber(inv.taxAmount),
      totalAmount: toNumber(inv.totalAmount),
      status: formatEnumLabel(inv.status),
      notes: inv.notes || undefined,
    })),
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
    category: item.category,
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

export function useDashboardOverview() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["dashboard", token],
    enabled: Boolean(token),
    queryFn: () => apiRequest<DashboardOverview>("/dashboard/overview", { token: token! }),
  });
}

export function useProductsQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["products", "sellable", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawProduct>>("/products", {
        token: token!,
        // Only fetch sellable (company) products — raw materials are excluded by default
        query: { pageSize: 500, sellableOnly: true },
      });

      return {
        ...response,
        items: response.items.map(mapProduct),
      };
    },
  });
}

/**
 * Fetches ALL products including raw materials / procurement-only items.
 * Used by the Inventory page which has a dedicated "Raw Materials" tab.
 */
export function useAllProductsQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["products", "all", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawProduct>>("/products", {
        token: token!,
        query: { pageSize: 500, sellableOnly: false },
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
  // Furniture specific
  hsCode?: string;
  woodType?: string;
  finishType?: string;
  assemblyRequired?: boolean;
  warrantyMonths?: number;
  leadTimeDays?: number;
  isCustomizable?: boolean;
  variants: Array<{
    variantName: string;
    sku: string;
    barcode?: string;
    // Variant furniture specific
    fabricColor?: string;
    woodFinish?: string;
    sizeLabel?: string;
    hsCode?: string;
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

export function useUpdateProductMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ProductCreatePayload> }) => {
      return apiRequest<RawProduct>(`/products/${id}`, {
        method: "PATCH",
        token: token!,
        body: payload,
      });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-detail", id] });
    },
  });
}

export function useUploadProductImagesMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({ id, files }: { id: string; files: FileList | File[] }) => {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("images", f));
      const baseUrl = (await import("@/lib/api")).API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/products/${id}/images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error("Image upload failed");
      return response.json() as Promise<{ imageUrls: string[] }>;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["product-detail", id] });
    },
  });
}

export function useDeleteProductImageMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      return apiRequest<{ imageUrls: string[] }>(`/products/${id}/images`, {
        method: "DELETE",
        token: token!,
        body: { url },
      });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["product-detail", id] });
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
  contact?: string;
  email?: string;
  phone?: string;
  address?: string;
  panNo?: string;
  vatNo?: string;
  country: string;
  paymentTerms?: string;
  leadTimeDays: number;
  isActive?: boolean;
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

export function useDeleteSupplierMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<{ message: string }>(`/suppliers/${id}`, {
        method: "DELETE",
        token: token!,
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
            contact: supplier.contact ?? undefined,
            phone: supplier.phone ?? undefined,
            email: supplier.email ?? undefined,
            address: supplier.address ?? undefined,
            panNo: supplier.panNo ?? undefined,
            vatNo: supplier.vatNo ?? undefined,
            country: supplier.country,
            paymentTerms: supplier.paymentTerms ?? undefined,
            leadTime: `${leadTimeDays} days`,
            leadTimeDays,
            onTimeRate: metrics ? `${Math.round(toNumber(metrics.onTimeDeliveryRate))}%` : "N/A",
            spend,
            notes: supplier.notes ?? undefined,
            isActive: supplier.isActive ?? true,
          };
        }),
      };
    },
  });
}

export type RawSupplierProfile = {
  id: string;
  name: string;
  contact?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  panNo?: string | null;
  vatNo?: string | null;
  country: string;
  paymentTerms?: string | null;
  leadTimeDays: number;
  notes?: string | null;
  isActive?: boolean | null;
  creditLimit?: number | string;
  outstandingBalance?: number | string;
  purchaseOrders: Array<any>;
  supplierInvoices: Array<any>;
};

export function useSupplierQuery(id?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["supplier", id, token],
    enabled: Boolean(token) && Boolean(id),
    queryFn: async () => {
      return apiRequest<RawSupplierProfile>(`/suppliers/${id}`, {
        token: token!,
      });
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
    productVariantId?: string;
    productName?: string;
    sku?: string;
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
      queryClient.invalidateQueries({ queryKey: ["products"] });
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

export function usePurchaseOrderQuery(id?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["purchase-order", id, token],
    enabled: Boolean(token) && Boolean(id),
    queryFn: async () => {
      const response = await apiRequest<RawPurchaseOrder>(`/purchase-orders/${id}`, {
        token: token!,
      });
      return mapPurchaseOrder(response);
    },
  });
}

export function useUpdatePurchaseOrderStatusMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest<RawPurchaseOrder>(`/purchase-orders/${id}`, {
        method: "PATCH",
        token: token!,
        body: { status },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
  panNo?: string;
  vatNo?: string;
  invoicePref: string;
  district?: string;
  ward?: string;
};

export type RawCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  creditLimit: number | string;
  outstandingBalance: number | string;
  address: string;
  district?: string | null;
  ward?: string | null;
  panNo: string | null;
  vatNo: string | null;
  invoicePref: string;
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

export function useUpdateCustomerMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CustomerCreatePayload> }) => {
      return apiRequest<RawCustomer>(`/customers/${id}`, {
        method: "PATCH",
        token: token!,
        body: payload,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", variables.id] });
    },
  });
}

export function useDeleteCustomerMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<{ message: string }>(`/customers/${id}`, {
        method: "DELETE",
        token: token!,
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

export type RawCustomerProfile = RawCustomer & {
  salesOrders: Array<{
    id: string;
    status: string;
    orderDate: string;
    grandTotal: number | string;
    balanceDue: number | string;
    taxInvoices: Array<{ id: string; invoiceNo: string; totalInvoiceAmount: number; status: string }>;
    payments: Array<{ id: string; amount: number; paymentDate: string; method: string }>;
  }>;
};

export function useCustomerQuery(id: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["customer", id, token],
    enabled: Boolean(token) && Boolean(id),
    queryFn: async () => {
      return apiRequest<RawCustomerProfile>(`/customers/${id}`, {
        token: token!,
      });
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
  // Furniture fields
  isCustomOrder?: boolean;
  expectedReadyDate?: string;
  assemblyNotes?: string;
  deliveryFloor?: number;
  lineItems: Array<{
    productVariantId?: string;
    customProductName?: string;
    quantity: number;
    unitPrice: number;
    discountPct: number;
    discountAmount: number;
    // Furniture line fields
    isCustom?: boolean;
    fabricColor?: string;
    woodFinish?: string;
    customizationNotes?: string;
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (variables.customerId) {
        queryClient.invalidateQueries({ queryKey: ["customer", variables.customerId] });
      }
    },
  });
}

export function useSalesOrdersQuery(pageSize: number = 100, year?: string, month?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["sales-orders", token, pageSize, year, month],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawSalesOrder>>("/sales-orders", {
        token: token!,
        query: { pageSize, ...(year ? { year } : {}), ...(month ? { month } : {}) },
      });

      return {
        ...response,
        items: response.items.map(mapSalesOrder),
      };
    },
  });
}

export function useSalesOrderQuery(id?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["sales-order", id, token],
    enabled: Boolean(token && id),
    queryFn: async () => {
      return apiRequest<any>(`/sales-orders/${id}`, {
        token: token!,
      });
    },
  });
}

export function useCancelSalesOrderMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<any>(`/sales-orders/${id}/cancel`, {
        method: "POST",
        token: token!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
    },
  });
}

export function useConfirmSalesOrderMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<any>(`/sales-orders/${id}/confirm`, {
        method: "POST",
        token: token!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
    },
  });
}

export function useRecordSalesOrderDepositMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async ({ id, amount, method, reference }: { id: string; amount: number; method: string; reference?: string }) => {
      return apiRequest<any>(`/sales-orders/${id}/deposit`, {
        method: "POST",
        token: token!,
        body: { amount, method, reference },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
    },
  });
}

export function useUpdateSalesOrderStatusMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, deliveryDate }: { id: string; status: string; deliveryDate?: string }) => {
      return apiRequest<any>(`/sales-orders/${id}`, {
        method: "PATCH",
        token: token!,
        body: {
          status,
          ...(deliveryDate ? { deliveryDate } : {}),
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}


export type InvoiceCreatePayload = {
  soId: string;
  invoiceNumber?: string;
  issueDate?: string;
  dueDate?: string;
  status: string;
  lineItems: Array<{
    productVariantId?: string;
    customProductName?: string;
    quantity: number;
    unitPrice: number;
    discountPct: number;
    discountAmount?: number;
  }>;
  invoiceType?: string;
  paymentMode?: string;
  notes?: string;
  // Nepal specifics
  bsDate?: string;
  fiscalYear?: string;
  invoiceAmount?: number;
  vatAmount?: number;
};

export function useCreateInvoiceMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (payload: InvoiceCreatePayload) => {
      return apiRequest<any>("/tax-invoices", {
        method: "POST",
        token: token!,
        body: payload,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tax-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["estimate-bills"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
    },
  });
}

export type PaymentCreatePayload = {
  salesOrderId?: string;
  purchaseOrderId?: string;
  supplierInvoiceId?: string;
  amount: number;
  method: string;
  paymentDate?: string;
  reference?: string;
  note?: string;
  bsDate?: string;
  fiscalYear?: string;
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
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer"] });
    },
  });
}

export function usePaymentsQuery(page = 1, pageSize = 50, search = "", year = "", month = "") {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["payments", token, page, pageSize, search, year, month],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawPayment>>("/payments", {
        token: token!,
        query: { page, pageSize, search, ...(year ? { year } : {}), ...(month ? { month } : {}) },
      });

      return {
        ...response,
        items: response.items.map(mapPayment),
      };
    },
  });
}

export function useTaxInvoicesQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["tax-invoices", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawInvoice>>("/tax-invoices", {
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

export function useSupplierInvoicesQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["supplier-invoices", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<{ items: Array<any>; total: number }>("/suppliers/invoices", {
        token: token!,
      });

      return {
        total: response.total,
        items: response.items.map<SupplierInvoiceRow>((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.issueDate,
          dueDate: inv.dueDate,
          supplier: inv.supplier?.name || "Supplier",
          supplierId: inv.supplierId,
          purchaseOrderId: inv.purchaseOrderId,
          status: formatEnumLabel(inv.status),
          subtotal: toNumber(inv.subtotal),
          taxAmount: toNumber(inv.taxAmount),
          totalAmount: toNumber(inv.totalAmount),
          amountPaid: toNumber(inv.amountPaid),
          balance: toNumber(inv.totalAmount) - toNumber(inv.amountPaid),
          notes: inv.notes,
          attachments: (inv.attachments ?? []).map((attachment: any): SupplierInvoiceAttachment => ({
            id: attachment.id,
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            sizeBytes: attachment.sizeBytes,
            createdAt: attachment.createdAt,
          })),
        })),
      };
    },
  });
}

export type SupplierInvoiceCreatePayload = {
  supplierId: string;
  purchaseOrderId?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
};

export function useCreateSupplierInvoiceMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async (payload: SupplierInvoiceCreatePayload) =>
      apiRequest<any>("/suppliers/invoices", {
        method: "POST",
        token: token!,
        body: {
          ...payload,
          status: "RECEIVED",
          amountPaid: 0,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUploadSupplierInvoiceAttachmentMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({ invoiceId, file }: { invoiceId: string; file: File }) => {
      const formData = new FormData();
      formData.append("document", file);
      const baseUrl = API_BASE_URL.replace(/\/$/, "");
      const response = await fetch(`${baseUrl}/suppliers/invoices/${invoiceId}/attachments`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message ?? "Invoice document upload failed");
      return payload as SupplierInvoiceAttachment;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] }),
  });
}

export function useDeleteSupplierInvoiceAttachmentMutation() {
  const { token } = useAuth();

  return useMutation({
    mutationFn: async ({ invoiceId, attachmentId }: { invoiceId: string; attachmentId: string }) =>
      apiRequest<void>(`/suppliers/invoices/${invoiceId}/attachments/${attachmentId}`, {
        method: "DELETE",
        token: token!,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] }),
  });
}

export function useEstimateBillsQuery() {
  const { token } = useAuth();

  return useQuery({
    queryKey: ["estimate-bills", token],
    enabled: Boolean(token),
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawInvoice>>("/tax-invoices/estimates", {
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
  floor?: number;
  assemblyNote?: string;
  deliveryCharge?: number;
  assemblyCharge?: number;
  floorDelivery?: boolean;
  assemblyService?: boolean;
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
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["ar-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useCancelDeliveryMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      return apiRequest<any>(`/deliveries/${id}/cancel`, {
        method: "POST",
        token: token!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["sales-orders"] });
      queryClient.invalidateQueries({ queryKey: ["sales-order"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
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
      supplierInvoiceNo?: string;
      supplierInvoiceDate?: string;
      lines: Array<{
        poLineItemId: string;
        quantityReceived: number;
        discrepancyQty?: number;
        unitCost?: number;
        taxAmount?: number;
        supplierItemName?: string;
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
          supplierInvoiceNo: input.supplierInvoiceNo,
          supplierInvoiceDate: input.supplierInvoiceDate,
          lines: input.lines,
        },
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["purchase-order"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-records"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] }),
        queryClient.invalidateQueries({ queryKey: ["inventory-movements"] }),
        queryClient.invalidateQueries({ queryKey: ["low-stock"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["supplier-invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
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
    queryKey: ["users", token],
    enabled,
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<RawUser>>("/users", {
        token: token!,
        query: { pageSize: 100 },
      });
      return mapUsers(response);
    },
  });
}

export function useArLedgerQuery(customerId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["ar-ledger", token, customerId],
    enabled: Boolean(token) && Boolean(customerId),
    queryFn: async () => {
      return apiRequest<any>(`/accounting/customers/${customerId}/ledger`, {
        token: token!,
      });
    },
  });
}

export function useVatRegisterQuery(month?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["vat-register", token, month],
    enabled: Boolean(token),
    queryFn: async () => {
      return apiRequest<any>("/accounting/vat-register", {
        token: token!,
        query: month ? { month } : undefined,
      });
    },
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

      const cashAtBank = accounts.find((a) => a.name === "Cash at Bank")?.balance || 0;
      const accountsReceivable = accounts.find((a) => a.name === "Accounts Receivable")?.balance || 0;
      const accountsPayable = accounts.find((a) => a.name === "Accounts Payable")?.balance || 0;
      
      const liquidityAccounts = accounts
        .filter((a) => a.name.includes("Cash") || a.name.includes("Bank"))
        .sort((a, b) => toNumber(b.balance) - toNumber(a.balance))
        .slice(0, 5)
        .map(a => ({ name: a.name, balance: toNumber(a.balance) }));

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
        metrics: {
          cashAndBank: toNumber(cashAtBank),
          accountsReceivable: toNumber(accountsReceivable),
          accountsPayable: toNumber(accountsPayable),
          netTaxPayable: toNumber(taxSummary.netPayable),
        },
        liquidityAccounts,
      };
    },
  });
}

export function useSearchQuery(search: string) {
  const { token } = useAuth();
  const normalizedSearch = search.trim();

  return useQuery({
    queryKey: ["search", token, normalizedSearch],
    enabled: Boolean(token) && normalizedSearch.length >= 3,
    retry: false,
    refetchOnWindowFocus: false,
    // Search surfaces sensitive financial data (payments, invoices, balances).
    // Always revalidate on use and keep it in memory only briefly rather than
    // caching aggressively — freshness/correctness over latency (CLAUDE.md).
    staleTime: 0,
    gcTime: 60_000,
    queryFn: async ({ signal }) => {
      const requestSignal = createSearchRequestSignal(signal);

      try {
        return mapSearchResults(
          await apiRequest<RawSearchPayload>("/search/global", {
            token: token!,
            query: { q: normalizedSearch },
            signal: requestSignal.signal,
          }),
          normalizedSearch,
        );
      } finally {
        requestSignal.cleanup();
      }
    },
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
        profitAndLoss: financialSummary.profitAndLoss,
        balanceSheet: financialSummary.balanceSheet,
        cashFlow: financialSummary.cashFlow,
        arAging: financialSummary.arAging,
        apAging: financialSummary.apAging,
        sales,
        inventory,
        margin,
        suppliers,
        customers,
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

      const data = await apiRequest<{ entries: any[] }>(`/accounting/customers/${customerId}/ledger`, {
        token: token!,
        query,
      });

      return data.entries.map((tx: any) => ({
        id: tx.id,
        date: String(tx.entryDate),
        type: tx.entryType,
        reference: tx.referenceId,
        narration: tx.narration,
        debit: tx.debit,
        credit: tx.credit,
        balance: tx.runningBalance,
      }));
    },
    enabled: !!customerId && !!token,
  });
}

// ===== NEW REPORT QUERY HOOKS (synced with backend services) =====

export function useTrialBalanceQuery() {
  const { token, user } = useAuth();
  const enabled = Boolean(token) && (user?.role === "ADMIN" || user?.role === "ACCOUNTANT");

  return useQuery({
    queryKey: ["trial-balance", token, user?.role],
    enabled,
    queryFn: async () => {
      return apiRequest<any[]>("/reports/trial-balance", { token: token! });
    },
  });
}

export function useTaxSummaryQuery(startDate?: Date, endDate?: Date) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["tax-summary", token, startDate?.toISOString(), endDate?.toISOString()],
    enabled: Boolean(token),
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (startDate) query.startDate = startDate.toISOString();
      if (endDate) query.endDate = endDate.toISOString();
      return apiRequest<any>("/reports/tax-summary", { token: token!, query });
    },
  });
}

export function useArAgingReportQuery(startDate?: Date, endDate?: Date) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["ar-aging-report", token, startDate?.toISOString(), endDate?.toISOString()],
    enabled: Boolean(token),
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (startDate) query.startDate = startDate.toISOString();
      if (endDate) query.endDate = endDate.toISOString();
      return apiRequest<{ rows: any[] }>("/reports/ar-aging", { token: token!, query });
    },
  });
}

export function useApAgingReportQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["ap-aging-report", token],
    enabled: Boolean(token),
    queryFn: async () => {
      return apiRequest<{ rows: any[] }>("/reports/ap-aging", { token: token! });
    },
  });
}

export function useOutstandingReceivablesQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["outstanding-receivables", token],
    enabled: Boolean(token),
    queryFn: async () => {
      return apiRequest<{ rows: any[] }>("/reports/outstanding-receivables", { token: token! });
    },
  });
}

export function useSalesTrendQuery(startDate?: Date, endDate?: Date, groupBy: 'month' | 'salesperson' | 'category' = 'month') {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["sales-trend", token, startDate?.toISOString(), endDate?.toISOString(), groupBy],
    enabled: Boolean(token),
    queryFn: async () => {
      const query: Record<string, string> = { groupBy };
      if (startDate) query.startDate = startDate.toISOString();
      if (endDate) query.endDate = endDate.toISOString();
      return apiRequest<{ rows: any[] }>("/reports/sales-trend", { token: token!, query });
    },
  });
}

export function usePurchaseOrdersReportQuery(startDate?: Date, endDate?: Date) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["purchase-orders-report", token, startDate?.toISOString(), endDate?.toISOString()],
    enabled: Boolean(token),
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (startDate) query.startDate = startDate.toISOString();
      if (endDate) query.endDate = endDate.toISOString();
      return apiRequest<any>("/reports/purchase-orders", { token: token!, query });
    },
  });
}

// Note: useInventoryValuationQuery already exists at line 2388 using /inventory/valuation endpoint
// We use that existing one instead of duplicating

export function useAuditLogQuery(params?: {
  startDate?: Date;
  endDate?: Date;
  action?: string;
  entityType?: string;
  page?: number;
  pageSize?: number;
}) {
  const { token, user } = useAuth();
  const enabled = Boolean(token) && (user?.role === "ADMIN" || user?.role === "ACCOUNTANT");

  return useQuery({
    queryKey: ["audit-log", token, params],
    enabled,
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params?.startDate) query.startDate = params.startDate.toISOString();
      if (params?.endDate) query.endDate = params.endDate.toISOString();
      if (params?.action) query.action = params.action;
      if (params?.entityType) query.entityType = params.entityType;
      if (params?.page) query.page = String(params.page);
      if (params?.pageSize) query.pageSize = String(params.pageSize);
      return apiRequest<any>("/reports/audit-log", { token: token!, query });
    },
  });
}

export function useStockMovementsQuery(params?: {
  startDate?: Date;
  endDate?: Date;
  productVariantId?: string;
  warehouseId?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["stock-movements", token, params],
    enabled: Boolean(token),
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (params?.startDate) query.startDate = params.startDate.toISOString();
      if (params?.endDate) query.endDate = params.endDate.toISOString();
      if (params?.productVariantId) query.productVariantId = params.productVariantId;
      if (params?.warehouseId) query.warehouseId = params.warehouseId;
      if (params?.type) query.type = params.type;
      if (params?.page) query.page = String(params.page);
      if (params?.pageSize) query.pageSize = String(params.pageSize);
      return apiRequest<any>("/reports/stock-movements", { token: token!, query });
    },
  });
}
