import { PrismaClient } from '@prisma/client';
import { generateInvoiceNumber } from '../shared/invoice-seq.util';
import { getCurrentFiscalYear, getBsDate } from '../shared/fiscal-year.util';
import { ApiError } from '../utils/api-error';

const prisma = new PrismaClient();

export const taxInvoiceService = {
  createInvoice: async (data: { soId: string, invoiceAmount: number, taxAmount: number, invoiceType: "VAT" | "PAN" | "NONE" }) => {
    const order = await prisma.salesOrder.findUnique({ where: { id: data.soId } });
    if (!order) throw new ApiError(404, "Sales order not found");

    const issueDate = new Date();
    const fiscalYear = getCurrentFiscalYear(issueDate);
    const bsDate = getBsDate(issueDate);
    const invoiceNumber = await generateInvoiceNumber(fiscalYear, 'INV');

    // Rule: DO NOT AUTO-COMPUTE INVOICE AMOUNTS from line items. 
    // They are fully manual and user-entered.

    return prisma.$transaction(async (tx) => {
      const invoice = await tx.taxInvoice.create({
        data: {
          soId: data.soId,
          invoiceNumber,
          issueDate,
          dueDate: new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days default
          status: "SENT",
          invoiceAmount: data.invoiceAmount,
          taxAmount: data.taxAmount,
          invoiceType: data.invoiceType,
          fiscalYear,
          bsDate,
          printed: false,
        }
      });

      // Post to VAT Register immediately if it contains tax
      if (data.invoiceType === "VAT") {
        await tx.vatRegister.create({
          data: {
            taxInvoiceId: invoice.id,
            customerId: order.customerId,
            taxableAmount: data.invoiceAmount - data.taxAmount,
            outputVat: data.taxAmount,
            totalWithVat: data.invoiceAmount,
            fiscalYear,
            bsDate,
            entryDate: issueDate,
          }
        });
      }

      return invoice;
    });
  }
};
