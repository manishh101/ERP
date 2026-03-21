import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const vatRegisterService = {
  /**
   * Post an entry to VAT register
   */
  postEntry: async (taxInvoiceId: string, customerId: string, taxableAmount: number, outputVat: number, totalWithVat: number, fiscalYear: string, bsDate: string) => {
    return prisma.vatRegister.create({
      data: {
        taxInvoiceId,
        customerId,
        taxableAmount,
        outputVat,
        totalWithVat,
        fiscalYear,
        bsDate,
        entryDate: new Date()
      }
    });
  },

  /**
   * Fetch VAT register entries
   */
  getEntries: async (fiscalYear: string, startDate?: string, endDate?: string) => {
    const where: any = { fiscalYear };
    
    if (startDate || endDate) {
      where.bsDate = {};
      if (startDate) where.bsDate.gte = startDate;
      if (endDate) where.bsDate.lte = endDate;
    }

    return prisma.vatRegister.findMany({
      where,
      include: {
        customer: {
          select: { name: true, panNo: true, vatNo: true }
        },
        taxInvoice: {
          select: { invoiceNumber: true, invoiceType: true }
        }
      },
      orderBy: { entryDate: 'asc' }
    });
  },

  /**
   * Get VAT summary grouped by BS month
   */
  getMonthlySummary: async (fiscalYear: string) => {
    const entries = await prisma.vatRegister.findMany({
      where: { fiscalYear },
      select: {
        bsDate: true,
        taxableAmount: true,
        outputVat: true,
        totalWithVat: true,
      }
    });

    // Group by month YYYY-MM
    const summaryMap = new Map<string, { taxableAmount: number, outputVat: number, totalWithVat: number }>();

    entries.forEach(entry => {
      const month = entry.bsDate.substring(0, 7); // "YYYY-MM"
      const current = summaryMap.get(month) || { taxableAmount: 0, outputVat: 0, totalWithVat: 0 };
      
      current.taxableAmount += Number(entry.taxableAmount);
      current.outputVat += Number(entry.outputVat);
      current.totalWithVat += Number(entry.totalWithVat);
      
      summaryMap.set(month, current);
    });

    return Array.from(summaryMap.entries()).map(([month, totals]) => ({
      month,
      ...totals
    })).sort((a, b) => a.month.localeCompare(b.month));
  }
};
