-- AlterTable
ALTER TABLE "so_line_items" ADD COLUMN     "custom_product_name" TEXT,
ADD COLUMN     "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ALTER COLUMN "product_variant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tax_invoice_line_items" ADD COLUMN     "custom_product_name" TEXT,
ADD COLUMN     "discount_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
ALTER COLUMN "product_variant_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "tax_invoices" ADD COLUMN     "payment_mode" TEXT;

-- CreateTable
CREATE TABLE "estimate_counters" (
    "id" TEXT NOT NULL,
    "fiscal_year" TEXT NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "estimate_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estimate_counters_fiscal_year_key" ON "estimate_counters"("fiscal_year");
