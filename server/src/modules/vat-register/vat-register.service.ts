import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

/**
 * VAT Register Service
 * Responsible for tax truth (IRD reporting)
 * Source of truth: taxableAmount and outputVat from TaxInvoice
 */

export async function postEntry(
  tx: Prisma.TransactionClient,
  input: {
    taxInvoiceId: string;
    customerId: string;
    taxableAmount: number;
    outputVat: number;
    bsDate: string;
    fiscalYear: string;
  }
) {
  return tx.vatRegister.create({
    data: {
      taxInvoiceId: input.taxInvoiceId,
      customerId: input.customerId,
      taxableAmount: input.taxableAmount,
      outputVat: input.outputVat,
      totalWithVat: input.taxableAmount + input.outputVat,
      bsDate: input.bsDate,
      fiscalYear: input.fiscalYear,
      entryDate: new Date(),
    },
  });
}

export async function getVatSummary(startDate?: Date, endDate?: Date) {
  const vatEntries = await prisma.vatRegister.findMany({
    where: {
      entryDate: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    },
  });
  
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where: {
      issueDate: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    },
  });

  const outputTax = vatEntries.reduce((sum, e) => sum + Number(e.outputVat), 0);
  const inputTax = supplierInvoices.reduce((sum, inv) => sum + Number(inv.taxAmount), 0);

  return { outputTax, inputTax, netPayable: outputTax - inputTax };
}
