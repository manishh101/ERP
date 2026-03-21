/*
  Warnings:

  - You are about to drop the column `invoice_id` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the `invoices` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_so_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_invoice_id_fkey";

-- DropIndex
DROP INDEX "payments_invoice_id_purchase_order_id_supplier_invoice_id_idx";

-- AlterTable
ALTER TABLE "company_profiles" ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "invoice_pref" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "pan_no" TEXT,
ADD COLUMN     "vat_no" TEXT;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "invoice_id",
ADD COLUMN     "bs_date" TEXT,
ADD COLUMN     "sales_order_id" TEXT;

-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "bs_date" TEXT,
ADD COLUMN     "fiscal_year" TEXT,
ADD COLUMN     "order_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "invoices";

-- CreateTable
CREATE TABLE "tax_invoices" (
    "id" TEXT NOT NULL,
    "so_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "invoice_type" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "invoice_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fiscal_year" TEXT,
    "bs_date" TEXT,
    "printed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_ledger" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "payment_id" TEXT,
    "entryType" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "running_balance" DECIMAL(14,2) NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "bs_date" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "narration" TEXT,

    CONSTRAINT "ar_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_register" (
    "id" TEXT NOT NULL,
    "tax_invoice_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "taxable_amount" DECIMAL(14,2) NOT NULL,
    "output_vat" DECIMAL(14,2) NOT NULL,
    "total_with_vat" DECIMAL(14,2) NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "bs_date" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_counters" (
    "id" TEXT NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "invoice_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tax_invoices_so_id_key" ON "tax_invoices"("so_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_invoices_invoice_number_key" ON "tax_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "tax_invoices_status_due_date_idx" ON "tax_invoices"("status", "due_date");

-- CreateIndex
CREATE INDEX "ar_ledger_customer_id_fiscal_year_entry_date_idx" ON "ar_ledger"("customer_id", "fiscal_year", "entry_date");

-- CreateIndex
CREATE UNIQUE INDEX "vat_register_tax_invoice_id_key" ON "vat_register"("tax_invoice_id");

-- CreateIndex
CREATE INDEX "vat_register_fiscal_year_bs_date_idx" ON "vat_register"("fiscal_year", "bs_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_counters_fiscal_year_key" ON "invoice_counters"("fiscal_year");

-- CreateIndex
CREATE INDEX "payments_sales_order_id_purchase_order_id_supplier_invoice__idx" ON "payments"("sales_order_id", "purchase_order_id", "supplier_invoice_id");

-- AddForeignKey
ALTER TABLE "tax_invoices" ADD CONSTRAINT "tax_invoices_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_ledger" ADD CONSTRAINT "ar_ledger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_ledger" ADD CONSTRAINT "ar_ledger_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_ledger" ADD CONSTRAINT "ar_ledger_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_register" ADD CONSTRAINT "vat_register_tax_invoice_id_fkey" FOREIGN KEY ("tax_invoice_id") REFERENCES "tax_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_register" ADD CONSTRAINT "vat_register_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
