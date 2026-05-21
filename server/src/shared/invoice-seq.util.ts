import { Prisma } from "@prisma/client";
import { tenantStorage } from "../config/prisma";

export async function nextInvoiceNumber(
  tx: any,
  fiscalYear: string,
): Promise<string> {
  const store = tenantStorage.getStore();
  const tenantId = store?.tenantId;
  if (!tenantId) {
    throw new Error("No active tenant context found for invoice sequence generation");
  }

  // Single atomic SQL statement scoped per tenant
  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO invoice_counters (id, fiscal_year, tenant_id, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, ${tenantId}, 1)
    ON CONFLICT (fiscal_year, tenant_id)
    DO UPDATE SET last_seq = invoice_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `INV-${fiscalYear}-${seqStr}`;
}

export async function nextReceiptNumber(
  tx: any,
  fiscalYear: string,
): Promise<string> {
  const store = tenantStorage.getStore();
  const tenantId = store?.tenantId;
  if (!tenantId) {
    throw new Error("No active tenant context found for receipt sequence generation");
  }

  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO receipt_counters (id, fiscal_year, tenant_id, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, ${tenantId}, 1)
    ON CONFLICT (fiscal_year, tenant_id)
    DO UPDATE SET last_seq = receipt_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `REC-${fiscalYear}-${seqStr}`;
}

export async function nextEstimateNumber(
  tx: any,
  fiscalYear: string,
): Promise<string> {
  const store = tenantStorage.getStore();
  const tenantId = store?.tenantId;
  if (!tenantId) {
    throw new Error("No active tenant context found for estimate sequence generation");
  }

  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO estimate_counters (id, fiscal_year, tenant_id, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, ${tenantId}, 1)
    ON CONFLICT (fiscal_year, tenant_id)
    DO UPDATE SET last_seq = estimate_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `EST-${fiscalYear}-${seqStr}`;
}
