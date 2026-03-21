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
import { taxInvoiceService } from "../services/tax-invoice.service";
import { renderInvoicePdfBuffer } from "../lib/pdf/vat-invoice.pdf";
import { ApiError } from "../utils/api-error";
import { getPagination } from "../utils/pagination";
import { verifyToken } from "../utils/jwt";

export const taxInvoicesRouter = Router();

taxInvoicesRouter.use(requireAuth);

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
      status: query.status || undefined,
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

    const invoice = await taxInvoiceService.createInvoice({
      soId: body.soId,
      invoiceAmount: body.invoiceAmount,
      taxAmount: body.taxAmount,
      invoiceType: body.invoiceType as "VAT" | "PAN" | "NONE",
    });

    response.status(201).json(invoice);
  }),
);

taxInvoicesRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const invoice = await prisma.taxInvoice.findUnique({
      where: { id: params.id },
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
    const body = request.validated?.body as ReturnType<typeof taxInvoiceUpdateSchema.parse>;
    const invoice = await prisma.taxInvoice.update({
      where: { id: params.id },
      data: body,
    });

    response.json(invoice);
  }),
);

taxInvoicesRouter.post(
  "/:id/send",
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const invoice = await prisma.taxInvoice.update({
      where: { id: params.id },
      data: {
        status: "SENT",
      },
    });

    response.json({
      ...invoice,
      emailQueued: true,
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
        id: {
          in: body.invoiceIds,
        },
      },
      data: {
        status: "SENT",
      },
    });

    response.json({
      updatedCount: updated.count,
      emailQueued: true,
    });
  }),
);

taxInvoicesRouter.get(
  "/:id/pdf",
  asyncHandler(async (request, response) => {
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

    const { id } = request.params;
    const [invoice, companyProfile, template] = await Promise.all([
      prisma.taxInvoice.findUnique({
        where: { id: id },
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
        },
      }),
      prisma.companyProfile.findFirst(),
      prisma.invoiceTemplate.findFirst(),
    ]);

    if (!invoice) {
      throw new ApiError(404, "Tax invoice not found");
    }

    const buffer = await renderInvoicePdfBuffer({ invoice, companyProfile, template } as any);

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=tax-invoice-${invoice.invoiceNumber}.pdf`);
    response.send(buffer);
  }),
);
