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
import { invalidateCache, CACHE_KEYS } from "../config/redis";
import { financialMutationLimiter } from "../middleware/rate-limit";

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
  financialMutationLimiter as any, // FIX #3: Rate limiting to prevent double-submissions and DoS
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  validate(paymentSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof paymentSchema.parse>;
    const tenantId = request.user!.tenantId;

    let payment: any;

    if (body.salesOrderId) {
      // #8 Fix: Record payment, journal entry, and audit inside ONE transaction
      payment = await recordPayment({
        tenantId,
        salesOrderId: body.salesOrderId,
        amount: body.amount,
        method: body.method,
        reference: body.reference,
        note: body.note,
        paymentDate: body.paymentDate,
        bsDate: getBsDate(body.paymentDate),
        fiscalYear: getCurrentFiscalYear(body.paymentDate),
        // #8/#9: Pass context so journal + audit can run inside the same tx
        createdById: request.user!.id,
        ipAddress: request.ip,
      });

      // #19: Invalidate dashboard caches after financial mutation
      await invalidateCache(
        CACHE_KEYS.AR_AGING(tenantId),
        CACHE_KEYS.TOP_ENTITIES(tenantId),
        CACHE_KEYS.FINANCIAL_SUMMARY_TODAY(tenantId),
        CACHE_KEYS.FINANCIAL_SUMMARY_MONTH(tenantId),
        CACHE_KEYS.FINANCIAL_SUMMARY_YEAR(tenantId),
      );
    } else {
      // Supplier payments: journal entry inside the transaction
      payment = await prisma.$transaction(async (tx) => {
        if (body.supplierInvoiceId) {
          const existingInv = await tx.supplierInvoice.findFirst({
            where: { id: body.supplierInvoiceId, tenantId },
          });
          if (!existingInv) throw new ApiError(404, "Supplier invoice not found");
        }

        const created = await tx.payment.create({
          data: {
            ...body,
            tenantId,
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

        // #8 Fix: Post GL journal entry INSIDE the transaction
        if (body.purchaseOrderId || body.supplierInvoiceId) {
          await postSupplierPaymentJournalEntry({
            tenantId,
            paymentId: created.id,
            amount: body.amount,
            createdById: request.user!.id,
          }, tx);
        }

        return created;
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
    const decoded = verifyToken(token);
    if (decoded.purpose !== "download") {
      throw new ApiError(401, "Invalid download token purpose");
    }
    // #3 Fix: Use tenantId from the token payload directly instead of a DB lookup.
    // This ensures the token's tenant context is honoured and prevents cross-tenant leaks.
    userId = decoded.sub;
    tenantId = decoded.tenantId;

    if (!tenantId) {
      throw new ApiError(401, "Download token missing tenant context");
    }
  }

  if (!userId || !tenantId) {
    throw new ApiError(401, "Unauthorized");
  }

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
}));
