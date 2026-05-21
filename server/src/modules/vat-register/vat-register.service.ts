import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";

/**
 * VAT Register Service
 * Responsible for tax truth (IRD reporting)
 * Source of truth: taxableAmount and outputVat from TaxInvoice
 */

export async function postEntry(
  tx: any,
  input: {
    taxInvoiceId: string;
    customerId: string;
    taxableAmount: number;
    outputVat: number;
    bsDate: string;
    fiscalYear: string;
    tenantId: string;
  }
) {
  return tx.vatRegister.create({
    data: {
      tenantId: input.tenantId,
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

export async function getVatSummary(tenantId: string, fiscalYear?: string, startDate?: Date, endDate?: Date) {
  const vatEntries = await prisma.vatRegister.findMany({
    where: {
      tenantId,
      ...(fiscalYear ? { fiscalYear } : {}),
      entryDate: {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      },
    },
  });
  
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where: {
      tenantId,
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

export async function getMonthlySummary(tenantId: string, fiscalYear: string) {
  const result = await prisma.vatRegister.groupBy({
    by: ["bsDate"],
    _sum: {
      taxableAmount: true,
      outputVat: true,
    },
    where: {
      tenantId,
      fiscalYear,
    },
  });

  return result.map((r) => ({
    month: r.bsDate.substring(5, 7),
    taxableAmount: r._sum.taxableAmount,
    vatAmount: r._sum.outputVat,
  }));
}

export async function getEntries(tenantId: string, fiscalYear: string, month?: string) {
  return prisma.vatRegister.findMany({
    where: {
      tenantId,
      fiscalYear,
      ...(month ? { bsDate: { startsWith: `${fiscalYear}-${month}` } } : {}),
    },
    orderBy: {
      bsDate: "asc",
    },
  });
}
