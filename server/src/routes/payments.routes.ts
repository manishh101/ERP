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
    const query = request.validated?.query as { page: number; pageSize: number; search?: string; year?: string; month?: string };

    let bsDateFilter = undefined;
    if (query.year) {
      bsDateFilter = {
        startsWith: query.month ? `${query.year}-${String(query.month).padStart(2, "0")}` : `${query.year}-`,
      };
    }

    const baseWhere: any = {
      tenantId: request.user!.tenantId,
      bsDate: bsDateFilter,
    };

    const where: any = query.search
      ? {
          ...baseWhere,
          OR: [
            { reference: { contains: query.search, mode: "insensitive" as const } },
            {
              salesOrder: {
                customer: { name: { contains: query.search, mode: "insensitive" as const } },
              },
            },
            {
              supplierInvoice: {
                supplier: { name: { contains: query.search, mode: "insensitive" as const } },
              },
            },
            {
              purchaseOrder: {
                supplier: { name: { contains: query.search, mode: "insensitive" as const } },
              },
            },
          ],
        }
      : baseWhere;

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          salesOrder: { include: { customer: true } },
          purchaseOrder: { include: { supplier: true } },
          supplierInvoice: { include: { supplier: true } },
        },
        orderBy: {
          createdAt: "desc",
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

    let payment: any;

    if (body.salesOrderId) {
      payment = await recordPayment({
        tenantId: request.user!.tenantId,
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
        tenantId: request.user!.tenantId,
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
      payment = await prisma.$transaction(async (tx) => {
        if (body.supplierInvoiceId) {
          const existingInv = await tx.supplierInvoice.findFirst({
            where: { id: body.supplierInvoiceId, tenantId: request.user!.tenantId },
          });
          if (!existingInv) throw new ApiError(404, "Supplier invoice not found");
        }

        const created = await tx.payment.create({
          data: {
            ...body,
            tenantId: request.user!.tenantId,
          },
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
        tenantId: request.user!.tenantId,
        paymentId: payment.id!,
        amount: body.amount,
        createdById: request.user!.id,
      });
    }

    if (body.purchaseOrderId || body.supplierInvoiceId) {
      await postSupplierPaymentJournalEntry({
        tenantId: request.user!.tenantId,
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
  let tenantId = request.user?.tenantId;
  const token = request.query.token as string;

  if (!userId && token) {
    try {
      const decoded = verifyToken(token);
      if (decoded.purpose === "download") {
        userId = decoded.sub;
        const u = await prisma.user.findUnique({ where: { id: decoded.sub } });
        tenantId = u?.tenantId;
      }
    } catch (err) {
      throw new ApiError(401, "Invalid or expired download token");
    }
  }

  if (!userId || !tenantId) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const { id } = idParamSchema.parse(request.params);
    const companyProfile = await prisma.companyProfile.findFirst({
      where: { tenantId },
    });

    // 1. Fetch the requested payment
    const payment = await prisma.payment.findFirst({
      where: { id, tenantId },
      include: {
        salesOrder: {
          include: {
            customer: true,
            lineItems: {
              include: {
                productVariant: {
                  include: { product: true },
                },
              },
            },
          },
        },
        purchaseOrder: { include: { supplier: true } },
        supplierInvoice: { include: { supplier: true } },
      },
    });

    if (!payment) {
      throw new ApiError(404, "Payment not found");
    }

    // 2. Group payments if this is a sales order payment
    let groupedPayments = [payment];

    if (payment.salesOrder) {
      const timeMin = new Date(payment.createdAt.getTime() - 5000);
      const timeMax = new Date(payment.createdAt.getTime() + 5000);

      groupedPayments = await prisma.payment.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: timeMin,
            lte: timeMax,
          },
          method: payment.method,
          salesOrder: {
            customerId: payment.salesOrder.customer.id,
          },
        },
        include: {
          salesOrder: {
            include: {
              customer: true,
              lineItems: {
                include: {
                  productVariant: {
                    include: { product: true },
                  },
                },
              },
            },
          },
          purchaseOrder: { include: { supplier: true } },
          supplierInvoice: { include: { supplier: true } },
        },
        orderBy: { createdAt: "asc" },
      });
    }

    const buffer = await renderReceiptPdfBuffer({ payments: groupedPayments, companyProfile });
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=receipt-${payment.id}.pdf`);
    response.send(buffer);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    response.status(500).json({ error: "Failed to generate PDF" });
  }
}));
