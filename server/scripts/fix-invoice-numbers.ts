/**
 * One-time migration script: Re-sequence tax invoice numbers to fill gaps.
 * 
 * After the estimate numbers were migrated to EST- prefix, the INV- sequence
 * has gaps (e.g. 0001, 0011, 0013...). This script renumbers all VAT/PAN
 * invoices sequentially per fiscal year and updates the InvoiceCounter.
 * 
 * Usage: npx tsx scripts/fix-invoice-numbers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍  Finding tax invoices (VAT/PAN) with gaps in numbering...\n");

  // Get all non-estimate invoices grouped by fiscal year, ordered by issue date
  const invoices = await prisma.taxInvoice.findMany({
    where: {
      invoiceType: { not: "ESTIMATE" },
    },
    orderBy: [
      { fiscalYear: "asc" },
      { issueDate: "asc" },
    ],
  });

  if (invoices.length === 0) {
    console.log("✅  No tax invoices found. Nothing to fix.");
    return;
  }

  // Group by fiscal year
  const byFiscalYear = new Map<string, typeof invoices>();
  for (const inv of invoices) {
    const fy = inv.fiscalYear ?? "unknown";
    if (!byFiscalYear.has(fy)) byFiscalYear.set(fy, []);
    byFiscalYear.get(fy)!.push(inv);
  }

  console.log(`Found ${invoices.length} tax invoice(s) across ${byFiscalYear.size} fiscal year(s).\n`);

  // Check if there are actual gaps
  let hasGaps = false;
  for (const [fy, fInvoices] of byFiscalYear) {
    for (let i = 0; i < fInvoices.length; i++) {
      const expected = `INV-${fy}-${(i + 1).toString().padStart(4, "0")}`;
      if (fInvoices[i].invoiceNumber !== expected) {
        hasGaps = true;
        break;
      }
    }
    if (hasGaps) break;
  }

  if (!hasGaps) {
    console.log("✅  Invoice numbers are already sequential. Nothing to fix.");
    return;
  }

  console.log("🔧  Re-sequencing invoice numbers...\n");

  await prisma.$transaction(async (tx) => {
    for (const [fiscalYear, fInvoices] of byFiscalYear) {
      console.log(`  Fiscal Year: ${fiscalYear} (${fInvoices.length} invoices)`);

      // First pass: assign temporary numbers to avoid unique constraint conflicts
      for (let i = 0; i < fInvoices.length; i++) {
        const tempNumber = `_TEMP_INV_${fiscalYear}_${i}`;
        await tx.taxInvoice.update({
          where: { id: fInvoices[i].id },
          data: { invoiceNumber: tempNumber },
        });
      }

      // Second pass: assign final sequential numbers
      for (let i = 0; i < fInvoices.length; i++) {
        const seq = i + 1;
        const newNumber = `INV-${fiscalYear}-${seq.toString().padStart(4, "0")}`;
        const tempNumber = `_TEMP_INV_${fiscalYear}_${i}`;
        const oldNumber = fInvoices[i].invoiceNumber;

        if (oldNumber !== newNumber) {
          console.log(`    ${oldNumber}  →  ${newNumber}`);
        }

        await tx.taxInvoice.update({
          where: { id: fInvoices[i].id },
          data: { invoiceNumber: newNumber },
        });
      }

      // Update the InvoiceCounter
      const lastSeq = fInvoices.length;
      await tx.$queryRaw`
        INSERT INTO invoice_counters (id, fiscal_year, last_seq)
        VALUES (gen_random_uuid()::text, ${fiscalYear}, ${lastSeq})
        ON CONFLICT (fiscal_year)
        DO UPDATE SET last_seq = ${lastSeq}
      `;
      console.log(`    📊  InvoiceCounter for ${fiscalYear} updated to seq ${lastSeq}\n`);
    }
  });

  console.log("✅  Done! All tax invoices now have sequential numbers.");
}

main()
  .catch((e) => {
    console.error("❌  Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
