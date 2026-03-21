-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('SHOWROOM', 'STORAGE', 'TRANSIT');

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('IN_STOCK', 'RESERVED', 'ON_DISPLAY', 'IN_TRANSIT', 'DAMAGED');

-- CreateEnum
CREATE TYPE "SupplierInvoiceStatus" AS ENUM ('DRAFT', 'RECEIVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'INVOICED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoodsReceiptStatus" AS ENUM ('PENDING', 'PARTIAL', 'RECEIVED');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'TRADE', 'CONTRACTOR');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('QUOTE', 'CONFIRMED', 'DEPOSIT_PAID', 'PAID', 'IN_WAREHOUSE', 'DISPATCHED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('SCHEDULED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_ATTEMPT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ACCOUNTANT', 'SALES', 'WAREHOUSE', 'DRIVER');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('INBOUND', 'OUTBOUND', 'TRANSFER', 'ADJUSTMENT', 'RESERVATION', 'RELEASE');

-- CreateEnum
CREATE TYPE "StockAdjustmentReason" AS ENUM ('CORRECTION', 'DAMAGE', 'RETURNED', 'FOUND');

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "cost_price" DECIMAL(14,2) NOT NULL,
    "selling_price" DECIMAL(14,2) NOT NULL,
    "material" TEXT,
    "color" TEXT,
    "length" DECIMAL(10,2),
    "width" DECIMAL(10,2),
    "height" DECIMAL(10,2),
    "weight" DECIMAL(10,2),
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "tax_rate_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_name" TEXT NOT NULL,
    "sku_variant" TEXT NOT NULL,
    "additional_cost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "stock_quantity" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "type" "WarehouseType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryStatus" NOT NULL DEFAULT 'IN_STOCK',
    "serial_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "payment_terms" TEXT NOT NULL,
    "lead_time_days" INTEGER NOT NULL,
    "rating" DECIMAL(3,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expected_delivery" TIMESTAMP(3),
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "shipping_terms" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "po_line_items" (
    "id" TEXT NOT NULL,
    "po_id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(14,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "po_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "received_by_id" TEXT,
    "received_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "GoodsReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" TEXT NOT NULL,
    "goods_receipt_id" TEXT NOT NULL,
    "po_line_item_id" TEXT NOT NULL,
    "quantity_received" INTEGER NOT NULL,
    "discrepancy_qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_invoices" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "purchase_order_id" TEXT,
    "invoice_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "status" "SupplierInvoiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" "CustomerType" NOT NULL,
    "credit_limit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "address" TEXT NOT NULL,
    "outstanding_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "assigned_warehouse_id" TEXT,
    "salesperson_id" TEXT,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'QUOTE',
    "deposit_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "balance_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivery_date" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "so_line_items" (
    "id" TEXT NOT NULL,
    "so_id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "discount_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "so_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "so_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "amount_paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "purchase_order_id" TEXT,
    "supplier_invoice_id" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reference" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "supplier_id" TEXT,
    "description" TEXT NOT NULL,
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "source_type" TEXT,
    "source_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entry_lines" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "journal_entry_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "so_id" TEXT NOT NULL,
    "driver_id" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "vehicle" TEXT,
    "delivery_address" TEXT NOT NULL,
    "notes" TEXT,
    "proof_photo_url" TEXT,
    "failure_reason" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "product_variant_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "StockMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "reason" "StockAdjustmentReason",
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "product_category" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "address" TEXT NOT NULL,
    "tax_number" TEXT NOT NULL,
    "bank_details" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currency_settings" (
    "id" TEXT NOT NULL,
    "base_currency" TEXT NOT NULL,
    "supported_currencies" JSONB NOT NULL,
    "multi_currency_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currency_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "overdue_invoice_days" JSONB NOT NULL,
    "low_stock_enabled" BOOLEAN NOT NULL DEFAULT true,
    "delivery_updates_enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_templates" (
    "id" TEXT NOT NULL,
    "primary_color" TEXT NOT NULL DEFAULT '#7c5c45',
    "footer_text" TEXT NOT NULL DEFAULT 'Thank you for your business.',
    "payment_terms" TEXT NOT NULL DEFAULT 'Payment due within 14 days.',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_imports" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_lines" INTEGER NOT NULL DEFAULT 0,
    "unmatched_lines" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bank_statement_imports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_lines" (
    "id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "matched_payment_id" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "is_matched" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bank_statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_variant_key" ON "product_variants"("sku_variant");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_serial_number_key" ON "inventory"("serial_number");

-- CreateIndex
CREATE INDEX "inventory_product_variant_id_warehouse_id_idx" ON "inventory"("product_variant_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_status_idx" ON "purchase_orders"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "po_line_items_po_id_idx" ON "po_line_items"("po_id");

-- CreateIndex
CREATE INDEX "goods_receipts_purchase_order_id_idx" ON "goods_receipts"("purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_invoices_invoice_number_key" ON "supplier_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "supplier_invoices_supplier_id_status_idx" ON "supplier_invoices"("supplier_id", "status");

-- CreateIndex
CREATE INDEX "customers_type_idx" ON "customers"("type");

-- CreateIndex
CREATE INDEX "sales_orders_customer_id_status_idx" ON "sales_orders"("customer_id", "status");

-- CreateIndex
CREATE INDEX "so_line_items_so_id_idx" ON "so_line_items"("so_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_so_id_key" ON "invoices"("so_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_status_due_date_idx" ON "invoices"("status", "due_date");

-- CreateIndex
CREATE INDEX "payments_invoice_id_purchase_order_id_supplier_invoice_id_idx" ON "payments"("invoice_id", "purchase_order_id", "supplier_invoice_id");

-- CreateIndex
CREATE INDEX "expenses_date_category_idx" ON "expenses"("date", "category");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_code_key" ON "accounts"("code");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entry_lines_journal_entry_id_account_id_idx" ON "journal_entry_lines"("journal_entry_id", "account_id");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_so_id_key" ON "deliveries"("so_id");

-- CreateIndex
CREATE INDEX "deliveries_driver_id_status_idx" ON "deliveries"("driver_id", "status");

-- CreateIndex
CREATE INDEX "stock_movements_product_variant_id_warehouse_id_occurred_at_idx" ON "stock_movements"("product_variant_id", "warehouse_id", "occurred_at");

-- CreateIndex
CREATE INDEX "bank_statement_lines_import_id_is_matched_idx" ON "bank_statement_lines"("import_id", "is_matched");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_tax_rate_id_fkey" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "po_line_items" ADD CONSTRAINT "po_line_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_po_line_item_id_fkey" FOREIGN KEY ("po_line_item_id") REFERENCES "po_line_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_assigned_warehouse_id_fkey" FOREIGN KEY ("assigned_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_salesperson_id_fkey" FOREIGN KEY ("salesperson_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "so_line_items" ADD CONSTRAINT "so_line_items_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "so_line_items" ADD CONSTRAINT "so_line_items_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_supplier_invoice_id_fkey" FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entry_lines" ADD CONSTRAINT "journal_entry_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_variant_id_fkey" FOREIGN KEY ("product_variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "bank_statement_imports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_matched_payment_id_fkey" FOREIGN KEY ("matched_payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
