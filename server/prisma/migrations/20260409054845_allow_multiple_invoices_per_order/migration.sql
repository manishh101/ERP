-- DropIndex
DROP INDEX "tax_invoices_so_id_key";

-- CreateIndex
CREATE INDEX "tax_invoices_so_id_idx" ON "tax_invoices"("so_id");
