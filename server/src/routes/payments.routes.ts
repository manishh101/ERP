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
import { verifyToken } from "../utils/jwt";
import { renderReceiptPdfBuffer } from "../lib/pdf/receipt";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";
import { getBsDate, getCurrentFiscalYear } from "../shared/fiscal-year.util";
import { recordPayment } from "../modules/payments/payment.service";
import { logAudit } from "../services/audit.service";

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
          salesOrder: { include: { customer: true } },
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

    let payment;

    if (body.salesOrderId) {
      payment = await recordPayment({
        salesOrderId: body.salesOrderId,
        amount: body.amount,
        method: body.method,
        reference: body.reference,
        note: body.note,
        paymentDate: body.paymentDate,
        bsDate: getBsDate(body.paymentDate),
        fiscalYear: getCurrentFiscalYear(body.paymentDate),
      });

      // Audit log — immutable record of payment (PRD §7)
      await logAudit({
        userId: request.user!.id,
        action: "RECORD_PAYMENT",
        entityType: "Payment",
        entityId: payment.id,
        newState: {
          salesOrderId: body.salesOrderId,
          amount: body.amount,
          method: body.method,
          reference: body.reference ?? null,
        },
        ipAddress: request.ip,
      });
    } else {
      payment = await prisma.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
        const created = await tx.payment.create({
          data: body,
        });

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
    }

    if (body.salesOrderId) {
      await postCustomerPaymentJournalEntry({
        paymentId: payment.id!,
        amount: body.amount,
        createdById: request.user!.id,
      });
    }

    if (body.purchaseOrderId || body.supplierInvoiceId) {
      await postSupplierPaymentJournalEntry({
        paymentId: payment.id!,
        amount: body.amount,
        createdById: request.user!.id,
      });
    }

    response.status(201).json(payment);
  }),
);

paymentsRouter.get("/:id/receipt", asyncHandler(async (request, response) => {
  // Check if authenticated or has a valid download token
  let userId = request.user?.id;
  const token = request.query.token as string;

  if (!userId && token) {
    try {
      const decoded = verifyToken(token);
      if (decoded.purpose === "download") {
        userId = decoded.sub;
      }
    } catch (err) {
      throw new ApiError(401, "Invalid or expired download token");
    }
  }

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const { id } = idParamSchema.parse(request.params);
    const [payment, companyProfile] = await Promise.all([
      prisma.payment.findUnique({
        where: { id },
        include: {
          salesOrder: {
            include: {
              customer: true
            }
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
  } catch (error) {
    console.error("PDF Generation Error:", error);
    response.status(500).json({ error: "Failed to generate PDF" });
  }
}));
