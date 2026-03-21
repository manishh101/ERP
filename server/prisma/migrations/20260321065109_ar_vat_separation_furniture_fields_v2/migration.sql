/*
  Warnings:

  - You are about to drop the column `tax_number` on the `company_profiles` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "company_profiles" DROP COLUMN "tax_number",
ADD COLUMN     "pan_no" TEXT,
ADD COLUMN     "vat_no" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "district" TEXT,
ADD COLUMN     "ward" TEXT;

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "assembly_charge" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "assembly_service" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "delivery_charge" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "floor_delivery" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "fabric_color" TEXT,
ADD COLUMN     "hs_code" TEXT,
ADD COLUMN     "size_label" TEXT,
ADD COLUMN     "wood_finish" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "assembly_required" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finish_type" TEXT,
ADD COLUMN     "hs_code" TEXT,
ADD COLUMN     "is_customizable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lead_time_days" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "warranty_months" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wood_type" TEXT;

-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "assembly_notes" TEXT,
ADD COLUMN     "delivery_floor" INTEGER,
ADD COLUMN     "expected_ready_date" TIMESTAMP(3),
ADD COLUMN     "is_custom_order" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0;
