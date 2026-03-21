import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  bulkInvoiceSendSchema,
  idParamSchema,
  invoiceUpdateSchema,
  listQuerySchema,
} from "../schemas/domain";
import { postSalesInvoiceJournalEntry } from "../services/accounting.service";
import { renderInvoicePdfBuffer } from "../lib/pdf/invoice";
import { ApiError } from "../utils/api-error";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";

export const invoicesRouter = Router();

invoicesRouter.use(requireAuth);

async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const count = await prisma.invoice.count({
    where: {
      issueDate: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      },
    },
  });

  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

invoicesRouter.get(
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
      prisma.invoice.findMany({
        where,
        include: {
          salesOrder: {
            include: {
              customer: true,
            },
          },
          payments: true,
        },
        orderBy: {
          issueDate: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.invoice.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

invoicesRouter.post(
  "/from-sales-order/:id",
  requireRole(["ADMIN", "SALES", "ACCOUNTANT"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        lineItems: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
        invoice: true,
      },
    });

    if (!salesOrder) {
      throw new ApiError(404, "Sales order not found");
    }

    if (salesOrder.invoice) {
      throw new ApiError(400, "Invoice already exists for this sales order");
    }

    const subtotal = salesOrder.lineItems.reduce((sum, item) => {
      const lineTotal = item.quantity * toNumber(item.unitPrice);
      return sum + lineTotal - lineTotal * (toNumber(item.discountPct) / 100);
    }, 0);
    const taxAmount = subtotal * 0.13;
    const total = subtotal + taxAmount;

    const invoice = await prisma.invoice.create({
      data: {
        soId: salesOrder.id,
        invoiceNumber: await generateInvoiceNumber(),
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "SENT",
        total,
        taxAmount,
      },
      include: {
        salesOrder: {
          include: {
            customer: true,
          },
        },
      },
    });

    await postSalesInvoiceJournalEntry({
      invoiceId: invoice.id,
      total,
      taxAmount,
      createdById: request.user?.id,
    });

    response.status(201).json(invoice);
  }),
);

invoicesRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const invoice = await prisma.invoice.findUnique({
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
        payments: true,
      },
    });

    response.json(invoice);
  }),
);

invoicesRouter.patch(
  "/:id",
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  validate(idParamSchema, "params"),
  validate(invoiceUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof invoiceUpdateSchema.parse>;
    const invoice = await prisma.invoice.update({
      where: { id: params.id },
      data: body,
    });

    response.json(invoice);
  }),
);

invoicesRouter.post(
  "/:id/send",
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const invoice = await prisma.invoice.update({
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

invoicesRouter.post(
  "/bulk-send",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  validate(bulkInvoiceSendSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof bulkInvoiceSendSchema.parse>;

    const updated = await prisma.invoice.updateMany({
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

invoicesRouter.get(
  "/:id/pdf",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const [invoice, companyProfile, template] = await Promise.all([
      prisma.invoice.findUnique({
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
      }),
      prisma.companyProfile.findFirst(),
      prisma.invoiceTemplate.findFirst(),
    ]);

    if (!invoice) {
      throw new ApiError(404, "Invoice not found");
    }

    const buffer = await renderInvoicePdfBuffer({ invoice, companyProfile, template });

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `inline; filename=invoice-${invoice.invoiceNumber}.pdf`);
    response.send(buffer);
  }),
);
