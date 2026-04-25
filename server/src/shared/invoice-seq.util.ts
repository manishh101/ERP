import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string,
): Promise<string> {
  // Single atomic SQL statement — no race condition possible
  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO invoice_counters (id, fiscal_year, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, 1)
    ON CONFLICT (fiscal_year)
    DO UPDATE SET last_seq = invoice_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `INV-${fiscalYear}-${seqStr}`;
}

export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string,
): Promise<string> {
  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO receipt_counters (id, fiscal_year, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, 1)
    ON CONFLICT (fiscal_year)
    DO UPDATE SET last_seq = receipt_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `REC-${fiscalYear}-${seqStr}`;
}

export async function nextEstimateNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string,
): Promise<string> {
  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO estimate_counters (id, fiscal_year, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, 1)
    ON CONFLICT (fiscal_year)
    DO UPDATE SET last_seq = estimate_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `EST-${fiscalYear}-${seqStr}`;
}
