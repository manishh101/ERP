import { prisma } from "../../config/prisma";
import { Prisma } from "@prisma/client";
import { ApiError } from "../../utils/api-error";
import { nextInvoiceNumber } from "../../shared/invoice-seq.util";
import { postEntry } from "../vat-register/vat-register.service";

/**
 * Tax Invoice Service
 * Responsible for tax truth (VAT/PAN bills).
 * Does NOT affect AR balance or Order payment status.
 *
 * PRD GOLDEN RULE #3:
 *  - VatRegister uses invoiceAmount, NEVER orderAmount.
 *  - invoiceAmount & vatAmount MUST be user-entered, NEVER auto-computed from line items.
 *  - Line items exist for display/printing only.
 */

export interface CreateTaxInvoiceInput {
  salesOrderId: string;
  lineItems: { productVariantId: string; quantity: number; unitPrice: number; discountPct: number }[];
  invoiceType: "VAT" | "PAN" | "ESTIMATE";
  bsDate: string;
  fiscalYear: string;
  notes?: string;
  /**
   * PRD Golden Rule #3: Must be manually provided by the user.
   * For VAT invoices: the taxable amount EXCLUDING VAT.
   * For PAN invoices: the total invoice amount (no VAT).
   * If not provided (legacy/estimate path), falls back to line-item sum.
   */
  invoiceAmount?: number;
  /**
   * PRD Golden Rule #3: Must be manually provided by the user.
   * For VAT invoices: 13% of invoiceAmount.
   * For PAN/ESTIMATE: 0.
   * If not provided, falls back to computed value.
   */
  vatAmount?: number;
}

export async function createTaxInvoice(
  input: CreateTaxInvoiceInput,
  existingTx?: Prisma.TransactionClient
) {
  const execute = async (tx: Prisma.TransactionClient) => {
    // 1. Guard: one invoice of the same type per order
    const existing = await tx.taxInvoice.findFirst({
      where: { soId: input.salesOrderId, invoiceType: input.invoiceType },
    });
    if (existing) {
      throw new ApiError(400, `${input.invoiceType} invoice already exists for this order`);
    }

    const order = await tx.salesOrder.findUnique({
      where: { id: input.salesOrderId },
      include: { customer: true },
    });
    if (!order) throw new ApiError(404, "Order not found");

    // 2. PRD Golden Rule #3: Use user-provided amounts.
    //    Fall back to line-item computation ONLY for ESTIMATE type or legacy paths.
    let subtotal: number;
    let taxAmount: number;
    let totalInvoiceAmount: number;

    if (input.invoiceAmount !== undefined && input.vatAmount !== undefined) {
      // Happy path: user explicitly provided both amounts — store as-is (Golden Rule compliant)
      subtotal = input.invoiceAmount;
      taxAmount = input.vatAmount;
      totalInvoiceAmount = subtotal + taxAmount;
    } else {
      // Fallback: auto-compute from line items (acceptable ONLY for ESTIMATE)
      if (input.invoiceType !== "ESTIMATE") {
        throw new ApiError(400, `PRD Golden Rule #3: invoiceAmount and vatAmount must be explicitly provided for ${input.invoiceType} invoice on order ${input.salesOrderId}. Auto-computation from line items is forbidden.`);
      }
      subtotal = input.lineItems.reduce(
        (acc, item) => acc + item.quantity * item.unitPrice * (1 - item.discountPct / 100),
        0
      );
      taxAmount = 0; // Since input.invoiceType is guaranteed to be 'ESTIMATE' here
      totalInvoiceAmount = subtotal + taxAmount;
    }

    // 3. Generate sequential invoice number
    const invoiceNumber = await nextInvoiceNumber(tx, input.fiscalYear);

    // 4. Create TaxInvoice with line items (line items = display/print only, not the source of amounts)
    const taxInvoice = await tx.taxInvoice.create({
      data: {
        soId: input.salesOrderId,
        invoiceNumber,
        invoiceType: input.invoiceType,
        issueDate: new Date(),
        invoiceAmount: totalInvoiceAmount,
        taxAmount,
        fiscalYear: input.fiscalYear,
        bsDate: input.bsDate,
        notes: input.notes,
        status: "SENT",
        lineItems: {
          create: input.lineItems.map((item) => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPct: item.discountPct,
          })),
        },
      },
    });

    // 5. Post VatRegister entry — only for real invoices, never for ESTIMATEs
    //    VatRegister always uses the user-provided invoiceAmount (Golden Rule #3)
    if (input.invoiceType !== "ESTIMATE") {
      await postEntry(tx, {
        taxInvoiceId: taxInvoice.id,
        customerId: order.customerId,
        taxableAmount: subtotal,   // user-entered amount, NOT line-item sum
        outputVat: taxAmount,       // user-entered VAT, NOT 13% of line items
        bsDate: input.bsDate,
        fiscalYear: input.fiscalYear,
      });
    }

    // 6. TODO (Phase 2): Post GL journal entry
    // Dr Accounts Receivable (1100) | Cr VAT Payable (2100) | Cr Sales Revenue (4000)

    return taxInvoice;
  };

  return existingTx ? execute(existingTx) : prisma.$transaction(execute);
}

// ---------------------------------------------------------------------------
// IRD CBMS Readiness — §5.4
// Builds a structured JSON payload ready for submission to Nepal's Inland Revenue
// Department Computerized Billing Management System (CBMS) API.
// Actual HTTP push to IRD is deferred to a future phase.
// ---------------------------------------------------------------------------

export interface CbmsLineItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  lineTotal: number;
}

export interface CbmsPayload {
  invoiceNumber: string;
  fiscalYear: string;
  bsDate: string;
  issueDate: string;
  invoiceType: "VAT" | "PAN";
  seller: {
    name: string;
    panNo: string | null;
    vatNo: string | null;
    address: string;
  };
  buyer: {
    name: string;
    panNo: string | null;
    vatNo: string | null;
    address: string;
  };
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
  lineItems: CbmsLineItem[];
}

export async function buildCbmsPayload(invoiceId: string): Promise<CbmsPayload> {
  const [invoice, company] = await Promise.all([
    prisma.taxInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        salesOrder: {
          include: {
            customer: true,
          },
        },
        lineItems: {
          include: {
            productVariant: {
              include: { product: true },
            },
          },
        },
      },
    }),
    prisma.companyProfile.findFirst(),
  ]);

  if (!invoice) throw new ApiError(404, "Tax Invoice not found");
  if (!invoice.salesOrder) throw new ApiError(422, "Invoice has no linked sales order");
  if (invoice.invoiceType === "ESTIMATE") {
    throw new ApiError(422, "CBMS payload cannot be built for ESTIMATE type invoices");
  }

  const customer = invoice.salesOrder.customer;
  const taxableAmount = Number(invoice.invoiceAmount) - Number(invoice.taxAmount);

  const payload: CbmsPayload = {
    invoiceNumber: invoice.invoiceNumber,
    fiscalYear: invoice.fiscalYear ?? "",
    bsDate: invoice.bsDate ?? "",
    issueDate: invoice.issueDate.toISOString(),
    invoiceType: invoice.invoiceType as "VAT" | "PAN",
    seller: {
      name: company?.name ?? "",
      panNo: company?.panNo ?? null,
      vatNo: company?.vatNo ?? null,
      address: company?.address ?? "",
    },
    buyer: {
      name: customer.name,
      panNo: customer.panNo ?? null,
      vatNo: customer.vatNo ?? null,
      address: customer.address,
    },
    taxableAmount,
    vatAmount: Number(invoice.taxAmount),
    totalAmount: Number(invoice.invoiceAmount),
    lineItems: invoice.lineItems.map((li) => {
      const lineTotal =
        li.quantity * Number(li.unitPrice) * (1 - Number(li.discountPct) / 100);
      return {
        productName: `${li.productVariant.product.name} / ${li.productVariant.variantName}`,
        quantity: li.quantity,
        unitPrice: Number(li.unitPrice),
        discountPct: Number(li.discountPct),
        lineTotal,
      };
    }),
  };

  return payload;
}
