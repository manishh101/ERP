import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Atomically generates the next sequence number for a given fiscal year
 */
export async function getNextInvoiceSequence(fiscalYear: string): Promise<number> {
  const counter = await prisma.invoiceCounter.upsert({
    where: { fiscalYear },
    update: { lastSeq: { increment: 1 } },
    create: { fiscalYear, lastSeq: 1 },
  });

  return counter.lastSeq;
}

/**
 * Generates the formatted invoice number (e.g., "INV-2081/82-0001")
 */
export async function generateInvoiceNumber(fiscalYear: string, prefix: string = 'INV'): Promise<string> {
  const seq = await getNextInvoiceSequence(fiscalYear);
  const paddedSeq = seq.toString().padStart(4, '0');
  return `${prefix}-${fiscalYear}-${paddedSeq}`;
}
