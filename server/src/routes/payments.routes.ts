import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { idParamSchema, listQuerySchema, paymentSchema } from "../schemas/domain";
import {
  postCustomerPaymentJournalEntry,
  postSupplierPaymentJournalEntry,
} from "../services/accounting.service";
import { ApiError } from "../utils/api-error";
import { renderReceiptPdfBuffer } from "../lib/pdf/receipt";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth);

paymentsRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { page: number; pageSize: number; search?: string };

    const where: any = {
      reference: query.search
        ? {
            contains: query.search,
            mode: "insensitive" as const,
          }
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: true,
          purchaseOrder: true,
          supplierInvoice: true,
        },
        orderBy: {
          paymentDate: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.payment.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

paymentsRouter.post(
  "/",
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  validate(paymentSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof paymentSchema.parse>;

    const payment = await prisma.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
      const created = await tx.payment.create({
        data: body,
      });

      if (body.invoiceId) {
        const invoice = await tx.invoice.update({
          where: { id: body.invoiceId },
          data: {
            amountPaid: {
              increment: body.amount,
            },
          },
        });

        const invoiceBalance = toNumber(invoice.total) - toNumber(invoice.amountPaid);

        await tx.invoice.update({
          where: { id: body.invoiceId },
          data: {
            status: invoiceBalance <= 0 ? "PAID" : "PARTIALLY_PAID",
          },
        });
      }

      if (body.supplierInvoiceId) {
        const supplierInvoice = await tx.supplierInvoice.update({
          where: { id: body.supplierInvoiceId },
          data: {
            amountPaid: {
              increment: body.amount,
            },
          },
        });

        const invoiceBalance = toNumber(supplierInvoice.totalAmount) - toNumber(supplierInvoice.amountPaid);

        await tx.supplierInvoice.update({
          where: { id: body.supplierInvoiceId },
          data: {
            status: invoiceBalance <= 0 ? "PAID" : "PARTIALLY_PAID",
          },
        });
      }

      return created;
    });

    if (body.invoiceId) {
      await postCustomerPaymentJournalEntry({
        paymentId: payment.id,
        amount: body.amount,
        createdById: request.user?.id,
      });
    }

    if (body.purchaseOrderId || body.supplierInvoiceId) {
      await postSupplierPaymentJournalEntry({
        paymentId: payment.id,
        amount: body.amount,
        createdById: request.user?.id,
      });
    }

    response.status(201).json(payment);
  }),
);

paymentsRouter.get(
  "/:id/receipt",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const [payment, companyProfile] = await Promise.all([
      prisma.payment.findUnique({
        where: { id: params.id },
        include: {
          invoice: {
            include: {
              salesOrder: {
                include: {
                  customer: true,
                },
              },
            },
          },
          supplierInvoice: {
            include: {
              supplier: true,
            },
          },
        },
      }),
      prisma.companyProfile.findFirst(),
    ]);

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    const buffer = await renderReceiptPdfBuffer({ payment, companyProfile });
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=receipt-${payment.id}.pdf`);
    response.send(buffer);
  }),
);
