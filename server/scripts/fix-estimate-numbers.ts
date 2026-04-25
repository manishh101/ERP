/**
 * One-time migration script: Fix old estimate records that have INV- prefixed numbers.
 * 
 * Before the EstimateCounter was introduced, estimates used the shared InvoiceCounter
 * and got INV- prefixed numbers. This script renames them to EST- and updates the
 * EstimateCounter to reflect the correct sequence.
 * 
 * Usage: npx tsx scripts/fix-estimate-numbers.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍  Finding estimate records with INV- prefix...\n");

  const badEstimates = await prisma.taxInvoice.findMany({
    where: {
      invoiceType: "ESTIMATE",
      invoiceNumber: { startsWith: "INV-" },
    },
    orderBy: { issueDate: "asc" },
  });

  if (badEstimates.length === 0) {
    console.log("✅  No estimates with INV- prefix found. Nothing to fix.");
    return;
  }

  console.log(`Found ${badEstimates.length} estimate(s) with INV- prefix:\n`);
  for (const est of badEstimates) {
    console.log(`  ${est.invoiceNumber}  (id: ${est.id}, fiscal: ${est.fiscalYear})`);
  }

  // Group by fiscal year
  const byFiscalYear = new Map<string, typeof badEstimates>();
  for (const est of badEstimates) {
    const fy = est.fiscalYear ?? "unknown";
    if (!byFiscalYear.has(fy)) byFiscalYear.set(fy, []);
    byFiscalYear.get(fy)!.push(est);
  }

  console.log("\n🔧  Reassigning EST- numbers...\n");

  await prisma.$transaction(async (tx) => {
    for (const [fiscalYear, estimates] of byFiscalYear) {
      // Find the current max EST- sequence for this fiscal year
      const existingEst = await tx.taxInvoice.findMany({
        where: {
          invoiceType: "ESTIMATE",
          invoiceNumber: { startsWith: `EST-${fiscalYear}-` },
        },
        orderBy: { invoiceNumber: "desc" },
        take: 1,
      });

      let nextSeq = 1;
      if (existingEst.length > 0) {
        const lastNum = existingEst[0].invoiceNumber;
        const seqPart = lastNum.split("-").pop();
        nextSeq = (parseInt(seqPart ?? "0", 10) || 0) + 1;
      }

      for (const est of estimates) {
        const newNumber = `EST-${fiscalYear}-${nextSeq.toString().padStart(4, "0")}`;
        console.log(`  ${est.invoiceNumber}  →  ${newNumber}`);

        await tx.taxInvoice.update({
          where: { id: est.id },
          data: { invoiceNumber: newNumber },
        });

        nextSeq++;
      }

      // Update the EstimateCounter so future estimates continue from the right sequence
      const totalEstimates = nextSeq - 1;
      await tx.$queryRaw`
        INSERT INTO estimate_counters (id, fiscal_year, last_seq)
        VALUES (gen_random_uuid()::text, ${fiscalYear}, ${totalEstimates})
        ON CONFLICT (fiscal_year)
        DO UPDATE SET last_seq = GREATEST(estimate_counters.last_seq, ${totalEstimates})
      `;
      console.log(`  📊  EstimateCounter for ${fiscalYear} updated to seq ${totalEstimates}`);
    }
  });

  console.log("\n✅  Done! All old estimates now have EST- prefixed numbers.");
}

main()
  .catch((e) => {
    console.error("❌  Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
