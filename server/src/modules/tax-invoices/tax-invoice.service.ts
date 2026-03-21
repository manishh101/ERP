import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { nextInvoiceNumber } from "../../shared/invoice-seq.util";
import { postEntry } from "../vat-register/vat-register.service";

/**
 * Tax Invoice Service
 * Responsible for tax truth (VAT/PAN bills).
 * Does NOT affect AR balance or Order payment status.
 */

export async function createTaxInvoice(input: {
  salesOrderId: string;
  invoiceAmount: number;    // User-entered taxable amount
  vatAmount: number;        // User-entered tax amount
  invoiceType: "VAT" | "PAN";
  bsDate: string;
  fiscalYear: string;
  notes?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // 1. Check if invoice already exists
    const existing = await tx.taxInvoice.findUnique({
      where: { soId: input.salesOrderId }
    });
    if (existing) throw new ApiError(400, "Tax invoice already exists for this order");

    const order = await tx.salesOrder.findUnique({
      where: { id: input.salesOrderId }
    });
    if (!order) throw new ApiError(440, "Order not found");

    // 2. Generate invoice number
    const invoiceNumber = await nextInvoiceNumber(tx, input.fiscalYear);

    // 3. Create TaxInvoice
    const taxInvoice = await tx.taxInvoice.create({
      data: {
        soId: input.salesOrderId,
        invoiceNumber,
        invoiceType: input.invoiceType,
        issueDate: new Date(),
        invoiceAmount: input.invoiceAmount,
        taxAmount: input.vatAmount,
        fiscalYear: input.fiscalYear,
        bsDate: input.bsDate,
        notes: input.notes,
        status: "SENT"
      }
    });

    // 4. Post VatRegister entry
    await postEntry(tx, {
      taxInvoiceId: taxInvoice.id,
      customerId: order.customerId,
      taxableAmount: input.invoiceAmount,
      outputVat: input.vatAmount,
      bsDate: input.bsDate,
      fiscalYear: input.fiscalYear
    });

    // 5. Post GL (Placeholder)
    // Dr Accounts Receivable (1100) / Cr VAT Payable (2100) / Cr Sales Revenue (4000)

    return taxInvoice;
  });
}
