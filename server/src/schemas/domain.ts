import {
  AccountType,
  CustomerType,
  DeliveryStatus,
  GoodsReceiptStatus,
  InventoryStatus,
  InvoiceStatus,
  PaymentMethod,
  ProductStatus,
  PurchaseOrderStatus,
  SalesOrderStatus,
  StockAdjustmentReason,
  SupplierInvoiceStatus,
  UserRole,
  WarehouseType,
} from "@prisma/client";
import { z } from "zod";
import { paginationSchema } from "../utils/pagination";

const decimalNumber = z.coerce.number().finite().nonnegative();
const signedDecimal = z.coerce.number().finite();
const optionalDate = z.coerce.date().optional();

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  companyName: z.string().min(2),
});

export const listQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  category: z.string().optional(),
  material: z.string().optional(),
  type: z.string().optional(),
  warehouseId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  // When true (default), only return sellable products; false returns all (raw materials included)
  sellableOnly: z.coerce.boolean().optional(),
});

export const productVariantInputSchema = z.object({
  variantName: z.string().min(2),
  skuVariant: z.string().min(2),
  additionalCost: decimalNumber.default(0),
  stockQuantity: z.coerce.number().int().min(0).default(0),
});

export const productCreateSchema = z.object({
  name: z.string().min(2),
  sku: z.string().min(2),
  category: z.string().min(2),
  description: z.string().optional(),
  costPrice: decimalNumber,
  sellingPrice: decimalNumber,
  material: z.string().optional(),
  color: z.string().optional(),
  length: decimalNumber.optional(),
  width: decimalNumber.optional(),
  height: decimalNumber.optional(),
  weight: decimalNumber.optional(),
  status: z.nativeEnum(ProductStatus).default(ProductStatus.ACTIVE),
  lowStockThreshold: z.coerce.number().int().min(0).default(5),
  taxRateId: z.string().optional(),
  // Products created via the UI form are always sellable; PO auto-creation sets this to false
  isSellable: z.boolean().optional().default(true),
  variants: z.array(productVariantInputSchema).default([]),
});

export const productUpdateSchema = productCreateSchema.partial();

export const variantUpdateSchema = productVariantInputSchema.partial();

export const warehouseSchema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  type: z.nativeEnum(WarehouseType),
  isActive: z.boolean().default(true),
});

export const inventoryCreateSchema = z.object({
  productVariantId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.coerce.number().int().min(0),
  status: z.nativeEnum(InventoryStatus).default(InventoryStatus.IN_STOCK),
  serialNumber: z.string().optional(),
});

export const stockAdjustmentSchema = z.object({
  productVariantId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantityDelta: z.coerce.number().int(),
  reason: z.nativeEnum(StockAdjustmentReason),
  source: z.string().min(2),
});

export const supplierSchema = z.object({
  name: z.string().min(2, "Supplier name must be at least 2 characters"),
  contact: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  panNo: z.string().optional().or(z.literal("")),
  vatNo: z.string().optional().or(z.literal("")),
  country: z.string().default("Nepal"),
  paymentTerms: z.string().default("Cash/Credit"),
  leadTimeDays: z.coerce.number().int().min(0).default(7),
  rating: z.coerce.number().min(0).max(5).optional(),
  notes: z.string().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const purchaseOrderLineItemSchema = z.object({
  productVariantId: z.string().optional(),
  productName: z.string().min(1).optional(),
  sku: z.string().optional(),
  quantity: z.coerce.number().int().min(1),
  unitCost: decimalNumber,
  taxAmount: decimalNumber.default(0),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  status: z.nativeEnum(PurchaseOrderStatus).default(PurchaseOrderStatus.DRAFT),
  orderDate: z.coerce.date().default(new Date()),
  expectedDelivery: optionalDate,
  shippingTerms: z.string().optional(),
  notes: z.string().optional(),
  paymentMode: z.string().optional(),
  lineItems: z.array(purchaseOrderLineItemSchema).min(1),
});

export const purchaseOrderUpdateSchema = purchaseOrderSchema.partial();

export const goodsReceiptLineSchema = z.object({
  poLineItemId: z.string().min(1),
  quantityReceived: z.coerce.number().int().min(0),
  discrepancyQty: z.coerce.number().int().min(0).default(0),
  unitCost: decimalNumber.optional(),
  taxAmount: decimalNumber.optional(),
});

export const goodsReceiptSchema = z.object({
  receivedDate: z.coerce.date().default(new Date()),
  status: z.nativeEnum(GoodsReceiptStatus).default(GoodsReceiptStatus.RECEIVED),
  notes: z.string().optional(),
  paymentMode: z.string().optional(),
  supplierInvoiceNo: z.string().optional(),
  supplierInvoiceDate: optionalDate,
  lines: z.array(goodsReceiptLineSchema).min(1),
});

export const supplierInvoiceSchema = z.object({
  supplierId: z.string().min(1),
  purchaseOrderId: z.string().optional(),
  invoiceNumber: z.string().min(2),
  issueDate: z.coerce.date().default(new Date()),
  dueDate: optionalDate,
  status: z.nativeEnum(SupplierInvoiceStatus).default(SupplierInvoiceStatus.RECEIVED),
  subtotal: decimalNumber,
  taxAmount: decimalNumber.default(0),
  totalAmount: decimalNumber,
  amountPaid: decimalNumber.default(0),
  notes: z.string().optional(),
  paymentMode: z.string().optional(),
});

export const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.nativeEnum(CustomerType),
  creditLimit: decimalNumber.default(0),
  address: z.string().min(4),
  panNo: z.string().optional(),
  vatNo: z.string().optional(),
  invoicePref: z.enum(["VAT", "PAN", "NONE"]).default("NONE"),
});

export const salesOrderLineItemSchema = z.object({
  productVariantId: z.string().min(1).optional(),
  customProductName: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: decimalNumber,
  discountPct: z.coerce.number().min(0).max(100).default(0),
  discountAmount: decimalNumber.default(0),
  isCustom: z.boolean().default(false),
  fabricColor: z.string().optional(),
  woodFinish: z.string().optional(),
  customizationNotes: z.string().optional(),
}).refine(data => data.productVariantId || data.customProductName, {
  message: "Either productVariantId or customProductName must be provided",
  path: ["productVariantId"]
});

export const salesOrderSchema = z.object({
  customerId: z.string().min(1),
  assignedWarehouseId: z.string().optional(),
  salespersonId: z.string().optional(),
  status: z.nativeEnum(SalesOrderStatus).default(SalesOrderStatus.QUOTE),
  depositAmount: decimalNumber.default(0),
  deliveryDate: optionalDate,
  notes: z.string().optional(),
  paymentMode: z.string().optional(),
  isCustomOrder: z.boolean().default(false),
  expectedReadyDate: optionalDate,
  lineItems: z.array(salesOrderLineItemSchema).min(1),
});

export const salesOrderUpdateSchema = salesOrderSchema.partial();

export const recordDepositSchema = z.object({
  amount: decimalNumber,
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  reference: z.string().optional(),
});

export const taxInvoiceLineItemSchema = z.object({
  productVariantId: z.string().min(1).optional(),
  customProductName: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1),
  unitPrice: decimalNumber,
  discountPct: z.coerce.number().min(0).max(100).default(0),
  discountAmount: decimalNumber.default(0),
}).refine(data => data.productVariantId || data.customProductName, {
  message: "Either productVariantId or customProductName must be provided",
  path: ["productVariantId"]
});

export const taxInvoiceSchema = z.object({
  soId: z.string().min(1),
  invoiceNumber: z.string().min(2).optional(),
  issueDate: z.coerce.date().default(new Date()),
  dueDate: optionalDate,
  status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.DRAFT),
  invoiceType: z.enum(["VAT", "PAN", "NONE", "ESTIMATE"]).default("NONE"),
  fiscalYear: z.string().optional(),
  bsDate: z.string().optional(),
  printed: z.boolean().default(false),
  notes: z.string().optional(),
  paymentMode: z.string().optional(),
  // PRD Golden Rule #3: invoiceAmount and vatAmount MUST be manually entered by the user.
  // They must NEVER be auto-computed from line items. Line items are for display/print only.
  invoiceAmount: decimalNumber.optional(), // user-entered taxable amount (excl. VAT)
  vatAmount: decimalNumber.optional(),     // user-entered VAT amount (13% for VAT invoices)
  lineItems: z.array(taxInvoiceLineItemSchema).min(1),
});

export const taxInvoiceUpdateSchema = taxInvoiceSchema.partial().omit({ soId: true });

export const arLedgerQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const vatRegisterQuerySchema = z.object({
  fiscalYear: z.string().min(7),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const bulkInvoiceSendSchema = z.object({
  invoiceIds: z.array(z.string().min(1)).min(1),
});

export const paymentSchema = z
  .object({
    salesOrderId: z.string().optional(),
    purchaseOrderId: z.string().optional(),
    supplierInvoiceId: z.string().optional(),
    amount: decimalNumber,
    method: z.nativeEnum(PaymentMethod),
    paymentDate: z.coerce.date().default(new Date()),
    reference: z.string().optional(),
    note: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.salesOrderId || value.purchaseOrderId || value.supplierInvoiceId),
    "A payment must be linked to a sales order, purchase order, or supplier invoice",
  );

export const expenseSchema = z.object({
  category: z.string().min(2),
  amount: decimalNumber,
  date: z.coerce.date(),
  supplierId: z.string().optional(),
  description: z.string().min(2),
  receiptUrl: z.string().url().optional(),
});

export const accountSchema = z.object({
  code: z.string().min(3),
  name: z.string().min(2),
  type: z.nativeEnum(AccountType),
  balance: signedDecimal.default(0),
});

export const journalEntryLineSchema = z.object({
  accountId: z.string().min(1),
  debit: decimalNumber.default(0),
  credit: decimalNumber.default(0),
});

export const journalEntrySchema = z
  .object({
    date: z.coerce.date(),
    description: z.string().min(3),
    reference: z.string().optional(),
    sourceType: z.string().optional(),
    sourceId: z.string().optional(),
    createdById: z.string().optional(),
    lines: z.array(journalEntryLineSchema).min(2),
  })
  .refine(
    (value) => {
      const totalDebit = value.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredit = value.lines.reduce((sum, line) => sum + line.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.0001;
    },
    "Journal entry must be balanced",
  );

export const deliverySchema = z.object({
  soId: z.string().min(1),
  driverId: z.string().optional(),
  status: z.nativeEnum(DeliveryStatus).default(DeliveryStatus.SCHEDULED),
  scheduledDate: z.coerce.date(),
  vehicle: z.string().optional(),
  deliveryAddress: z.string().min(4),
  notes: z.string().optional(),
  paymentMode: z.string().optional(),
  proofPhotoUrl: z.string().url().optional(),
});

export const deliveryUpdateSchema = deliverySchema.partial().omit({ soId: true });

export const failedDeliverySchema = z.object({
  failureReason: z.string().min(3),
  scheduledDate: z.coerce.date().optional(),
});

export const companyProfileSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url().optional(),
  address: z.string().min(4),
  panNo: z.string().optional(),
  vatNo: z.string().optional(),
  bankDetails: z.string().optional().default(""),
  email: z.string().email().or(z.literal("")).optional(),
  phone: z.string().optional(),
  website: z.string().url().or(z.literal("")).optional(),
});

export const taxRateSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  rate: decimalNumber,
  productCategory: z.string().optional(),
  isDefault: z.boolean().default(false),
});

export const currencySettingSchema = z.object({
  baseCurrency: z.string().length(3),
  supportedCurrencies: z.array(z.string().length(3)).min(1),
  multiCurrencyEnabled: z.boolean().default(false),
});

export const notificationSettingSchema = z.object({
  overdueInvoiceDays: z.array(z.coerce.number().int().min(1)).min(1),
  lowStockEnabled: z.boolean().default(true),
  deliveryUpdatesEnabled: z.boolean().default(true),
  emailEnabled: z.boolean().default(true),
});

export const invoiceTemplateSchema = z.object({
  primaryColor: z.string().min(4),
  footerText: z.string().min(2),
  paymentTerms: z.string().min(2),
});

export const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = userSchema.partial().omit({ password: true });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

export const reportQuerySchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  groupBy: z.string().optional(),
  customerType: z.nativeEnum(CustomerType).optional(),
  salespersonId: z.string().optional(),
  category: z.string().optional(),
  productId: z.string().optional(),
});

export const customReportSchema = z.object({
  entity: z.enum(["sales", "inventory", "customers", "suppliers", "finance"]),
  fields: z.array(z.string().min(1)).min(1),
  filters: z.record(z.any()).default({}),
  groupBy: z.array(z.string()).default([]),
});

export const manifestQuerySchema = z.object({
  date: z.coerce.date().optional(),
});

export const globalSearchSchema = z.object({
  q: z.string().min(2),
});

export const bankImportSchema = z.object({
  fileName: z.string().min(2),
  csvContent: z.string().min(10),
});
