import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  bulkInvoiceSendSchema,
  idParamSchema,
  taxInvoiceSchema,
  taxInvoiceUpdateSchema,
  listQuerySchema,
} from "../schemas/domain";
import { buildCbmsPayload, createTaxInvoice } from "../modules/tax-invoices/tax-invoice.service";
import { renderInvoicePdfBuffer } from "../lib/pdf/vat-invoice.pdf";
import { ApiError } from "../utils/api-error";
import { getPagination } from "../utils/pagination";
import { verifyToken } from "../utils/jwt";
import { getBsDate, getCurrentFiscalYear } from "../shared/fiscal-year.util";
import { logAudit } from "../services/audit.service";

export const taxInvoicesRouter = Router();

taxInvoicesRouter.use(requireAuth);

taxInvoicesRouter.get(
  "/estimates",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
      status?: string;
      search?: string;
    };

    const where: any = {
      tenantId: request.user!.tenantId,
      status: query.status || undefined,
      invoiceType: "ESTIMATE",
      OR: query.search
        ? [
            {
              invoiceNumber: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              salesOrder: {
                customer: {
                  name: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.taxInvoice.findMany({
        where,
        include: {
          salesOrder: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: {
          issueDate: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.taxInvoice.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

taxInvoicesRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
      status?: string;
      search?: string;
    };

    const where: any = {
      tenantId: request.user!.tenantId,
      status: query.status || undefined,
      invoiceType: { not: "ESTIMATE" },
      OR: query.search
        ? [
            {
              invoiceNumber: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              salesOrder: {
                customer: {
                  name: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.taxInvoice.findMany({
        where,
        include: {
          salesOrder: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: {
          issueDate: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.taxInvoice.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

taxInvoicesRouter.post(
  "/",
  requireRole(["ADMIN", "SALES", "ACCOUNTANT"]),
  validate(taxInvoiceSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof taxInvoiceSchema.parse>;

    // Verify sales order belongs to the tenant
    const soExists = await prisma.salesOrder.findFirst({
      where: { id: body.soId, tenantId: request.user!.tenantId },
    });
    if (!soExists) throw new ApiError(404, "Sales Order not found");

    const invoice = (await createTaxInvoice({
      tenantId: request.user!.tenantId,
      salesOrderId: body.soId,
      lineItems: body.lineItems,
      invoiceType: body.invoiceType as "VAT" | "PAN" | "ESTIMATE",
      bsDate: body.bsDate || getBsDate(),
      fiscalYear: body.fiscalYear || getCurrentFiscalYear(),
      notes: body.notes,
      paymentMode: body.paymentMode,
      // PRD Golden Rule #3: pass user-entered amounts through directly
      invoiceAmount: body.invoiceAmount,
      vatAmount: body.vatAmount,
    })) as any;

    // Audit log — immutable record of who generated this invoice
    await logAudit({
      tenantId: request.user!.tenantId,
      userId: request.user!.id,
      action: "CREATE_INVOICE",
      entityType: "TaxInvoice",
      entityId: invoice.id,
      newState: { invoiceNumber: invoice.invoiceNumber, invoiceType: invoice.invoiceType, invoiceAmount: invoice.invoiceAmount },
    });

    response.status(201).json(invoice);
  }),
);

taxInvoicesRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const invoice = await prisma.taxInvoice.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        salesOrder: {
          include: {
            customer: true,
            lineItems: {
              include: {
                productVariant: {
                  include: {
                    product: true,
                  },
                },
              },
            },
          },
        },
        lineItems: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    response.json(invoice);
  }),
);

taxInvoicesRouter.patch(
  "/:id",
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  validate(idParamSchema, "params"),
  validate(taxInvoiceUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const { lineItems, ...rest } = request.validated?.body as any;
    
    const existing = await prisma.taxInvoice.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existing) throw new ApiError(404, "Tax Invoice not found");

    const invoice = await prisma.taxInvoice.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(lineItems ? {
          lineItems: {
            deleteMany: {},
            create: lineItems
          }
        } : {})
      },
    });

    response.json(invoice);
  }),
);

// #38 Fix: Email delivery is simulated — no actual SMTP integration yet.
// Marking status as SENT optimistically. Integrate a mail service (e.g. Resend, SendGrid)
// by replacing this handler when email infrastructure is available.
taxInvoicesRouter.post(
  "/:id/send",
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const existing = await prisma.taxInvoice.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existing) throw new ApiError(404, "Tax Invoice not found");

    const invoice = await prisma.taxInvoice.update({
      where: { id: params.id },
      data: { status: "SENT" },
    });

    response.json({
      ...invoice,
      // simulated: true — no real email is sent until SMTP is configured
      simulated: true,
      emailQueued: false,
      message: "Invoice marked as sent. Email delivery requires SMTP configuration.",
    });
  }),
);

taxInvoicesRouter.post(
  "/bulk-send",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  validate(bulkInvoiceSendSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof bulkInvoiceSendSchema.parse>;

    const updated = await prisma.taxInvoice.updateMany({
      where: {
        id: { in: body.invoiceIds },
        tenantId: request.user!.tenantId,
      },
      data: { status: "SENT" },
    });

    response.json({
      updatedCount: updated.count,
      // simulated: true — no real email is sent until SMTP is configured
      simulated: true,
      emailQueued: false,
      message: "Invoices marked as sent. Email delivery requires SMTP configuration.",
    });
  }),
);

taxInvoicesRouter.get(
  "/:id/pdf",
  asyncHandler(async (request, response) => {
    // Check if authenticated or has a valid download token
    let userId = request.user?.id;
    let tenantId = request.user?.tenantId;
    const token = request.query.token as string;

    if (!userId && token) {
      // #3 Fix: Read tenantId from token payload — no DB lookup needed
      const decoded = verifyToken(token);
      if (decoded.purpose !== "download") {
        throw new ApiError(401, "Invalid download token purpose");
      }
      userId = decoded.sub;
      tenantId = decoded.tenantId;
      if (!tenantId) {
        throw new ApiError(401, "Download token missing tenant context");
      }
    }

    if (!userId || !tenantId) {
      throw new ApiError(401, "Unauthorized");
    }

    const { id } = request.params;
    const [invoice, companyProfile, template] = await Promise.all([
      prisma.taxInvoice.findFirst({
        where: { id: id, tenantId },
        include: {
          salesOrder: {
            include: {
              customer: true,
              lineItems: {
                include: {
                  productVariant: {
                    include: {
                      product: true,
                    },
                  },
                },
              },
            },
          },
          lineItems: {
            include: {
              productVariant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      }),
      prisma.companyProfile.findFirst({ where: { tenantId } }),
      prisma.invoiceTemplate.findFirst({ where: { tenantId } }),
    ]);

    if (!invoice) {
      throw new ApiError(404, "Tax invoice not found");
    }

    const isEstimate = request.query.type === "estimate" || invoice.invoiceType === "ESTIMATE";
    const buffer = await renderInvoicePdfBuffer({ 
      invoice, 
      companyProfile, 
      template,
      isEstimate 
    } as any);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=${isEstimate ? 'estimate' : 'tax-invoice'}-${invoice.invoiceNumber}.pdf`);
    response.send(buffer);
  }),
);

// ---------------------------------------------------------------------------
// CBMS Readiness — §5.4 (IRD Nepal — future phase HTTP push)
// ---------------------------------------------------------------------------
taxInvoicesRouter.get(
  "/:id/cbms-payload",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const payload = await buildCbmsPayload(request.user!.tenantId, params.id);
    // In future phase: POST payload to IRD CBMS API endpoint
    response.json({
      status: "ready",
      message: "CBMS payload built. HTTP push to IRD is deferred to a future phase.",
      payload,
    });
  }),
);
