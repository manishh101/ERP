CREATE TABLE "supplier_invoice_attachments" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "supplier_invoice_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_invoice_attachments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_invoice_attachments_tenant_id_supplier_invoice_id_idx"
ON "supplier_invoice_attachments"("tenant_id", "supplier_invoice_id");

ALTER TABLE "supplier_invoice_attachments"
ADD CONSTRAINT "supplier_invoice_attachments_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_invoice_attachments"
ADD CONSTRAINT "supplier_invoice_attachments_supplier_invoice_id_fkey"
FOREIGN KEY ("supplier_invoice_id") REFERENCES "supplier_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
