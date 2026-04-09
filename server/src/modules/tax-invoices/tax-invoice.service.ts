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
  lineItems: { productVariantId: string; quantity: number; unitPrice: number; discountPct: number }[];
  invoiceType: "VAT" | "PAN" | "ESTIMATE";
  bsDate: string;
  fiscalYear: string;
  notes?: string;
}, existingTx?: Prisma.TransactionClient) {
  const execute = async (tx: Prisma.TransactionClient) => {
    // 1. Check if invoice already exists
    const existing = await tx.taxInvoice.findUnique({
      where: { soId: input.salesOrderId }
    });
    if (existing) throw new ApiError(400, "Tax invoice already exists for this order");

    const order = await tx.salesOrder.findUnique({
      where: { id: input.salesOrderId }
    });
    if (!order) throw new ApiError(440, "Order not found");

    // 2. Auto-compute amounts from line items
    const subtotal = input.lineItems.reduce((acc, item) => {
      return acc + (item.quantity * item.unitPrice * (1 - item.discountPct / 100));
    }, 0);
    const taxAmount = input.invoiceType === "VAT" ? (subtotal * 0.13) : 0;
    const invoiceAmount = subtotal + taxAmount;

    // 3. Generate invoice number
    const invoiceNumber = await nextInvoiceNumber(tx, input.fiscalYear);

    // 4. Create TaxInvoice with LineItems mapping
    const taxInvoice = await tx.taxInvoice.create({
      data: {
        soId: input.salesOrderId,
        invoiceNumber,
        invoiceType: input.invoiceType,
        issueDate: new Date(),
        invoiceAmount,
        taxAmount,
        fiscalYear: input.fiscalYear,
        bsDate: input.bsDate,
        notes: input.notes,
        status: "SENT",
        lineItems: {
          create: input.lineItems.map(item => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
          }))
        }
      }
    });

    // 4. Post VatRegister entry - ONLY if NOT an estimate
    if (input.invoiceType !== "ESTIMATE") {
      await postEntry(tx, {
        taxInvoiceId: taxInvoice.id,
        customerId: order.customerId,
        taxableAmount: subtotal,
        outputVat: taxAmount,
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear
      });
    }

    // 5. Post GL (Placeholder)
    // Dr Accounts Receivable (1100) / Cr VAT Payable (2100) / Cr Sales Revenue (4000)

    return taxInvoice;
  };

  if (existingTx) {
    return execute(existingTx);
  } else {
    return prisma.$transaction(execute);
  }
}
