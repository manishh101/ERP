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
  const entries = await prisma.vatRegister.findMany({
    where: {
      tenantId,
      fiscalYear,
    },
  });

  const monthlyMap = new Map<string, { taxableAmount: number; vatAmount: number }>();

  for (const entry of entries) {
    // bsDate is in format "YYYY-MM-DD" e.g., "2081-05-15"
    const month = entry.bsDate ? entry.bsDate.substring(5, 7) : "00";
    const current = monthlyMap.get(month) || { taxableAmount: 0, vatAmount: 0 };
    current.taxableAmount += Number(entry.taxableAmount);
    current.vatAmount += Number(entry.outputVat);
    monthlyMap.set(month, current);
  }

  return Array.from(monthlyMap.entries())
    .map(([month, data]) => ({
      month,
      taxableAmount: data.taxableAmount,
      vatAmount: data.vatAmount,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export async function getEntries(tenantId: string, fiscalYear: string, month?: string) {
  const entries = await prisma.vatRegister.findMany({
    where: {
      tenantId,
      fiscalYear,
      ...(month ? { bsDate: { startsWith: `${fiscalYear.split("/")[0]}-${month.padStart(2, "0")}` } } : {}),
    },
    include: {
      taxInvoice: {
        select: {
          id: true,
          invoiceNumber: true,
          invoiceType: true,
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          panNo: true,
          vatNo: true,
        },
      },
    },
    orderBy: {
      bsDate: "asc",
    },
  });

  return entries.map((entry) => ({
    id: entry.id,
    bsDate: entry.bsDate,
    invoiceNumber: entry.taxInvoice?.invoiceNumber ?? "-",
    invoiceType: entry.taxInvoice?.invoiceType ?? "TAX",
    customerName: entry.customer?.name ?? "-",
    panNo: entry.customer?.panNo ?? entry.customer?.vatNo ?? "-",
    taxableAmount: Number(entry.taxableAmount),
    outputVat: Number(entry.outputVat),
    totalWithVat: Number(entry.totalWithVat),
    fiscalYear: entry.fiscalYear,
  }));
}
