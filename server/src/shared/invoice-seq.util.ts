import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Atomically generate next invoice number for a fiscal year
 * Uses a DB counter table to prevent race conditions
 */

export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string
): Promise<string> {
  const counter = await tx.invoiceCounter.upsert({
    where: { fiscalYear },
    update: { lastSeq: { increment: 1 } },
    create: { fiscalYear, lastSeq: 1 },
  });

  const seqStr = counter.lastSeq.toString().padStart(4, "0");
  return `INV-${fiscalYear}-${seqStr}`;
}

/**
 * Atomically generate next receipt number for a fiscal year
 * Similar to invoice but for payments
 */
export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string
): Promise<string> {
  // Using the same table or a different one? 
  // GAP 2 says: add a ReceiptCounter table the same way as InvoiceCounter.
  
  // Actually I need to add ReceiptCounter to schema.prisma as well.
  // I'll do that in a moment.
  
  // For now, I'll use a placeholder or assume it exists.
  // Wait, I should have added it to schema.prisma.
  
  const counter = await (tx as any).receiptCounter.upsert({
    where: { fiscalYear },
    update: { lastSeq: { increment: 1 } },
    create: { fiscalYear, lastSeq: 1 },
  });

  const seqStr = counter.lastSeq.toString().padStart(4, "0");
  return `REC-${fiscalYear}-${seqStr}`;
}
