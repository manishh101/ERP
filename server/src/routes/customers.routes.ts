import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { customerSchema, idParamSchema, listQuerySchema } from "../schemas/domain";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";

export const customersRouter = Router();

customersRouter.use(requireAuth);

customersRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
      search?: string;
      type?: string;
    };

    const where: any = {
      type: query.type || undefined,
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          salesOrders: {
            include: {
              invoice: true,
            },
          },
        },
        orderBy: {
          name: "asc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.customer.count({ where }),
    ]);

    response.json({
      items: items.map((customer) => ({
        ...customer,
        outstandingBalance: customer.salesOrders.reduce((sum, order) => {
          return sum + (order.invoice ? toNumber(order.invoice.total) - toNumber(order.invoice.amountPaid) : 0);
        }, 0),
      })),
      total,
    });
  }),
);

customersRouter.post(
  "/",
  requireRole(["ADMIN", "SALES", "ACCOUNTANT"]),
  validate(customerSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof customerSchema.parse>;
    const customer = await prisma.customer.create({ data: body });
    response.status(201).json(customer);
  }),
);

customersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        salesOrders: {
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
            invoice: {
              include: {
                payments: true,
              },
            },
          },
          orderBy: {
            orderDate: "desc",
          },
        },
      },
    });

    response.json(customer);
  }),
);

customersRouter.patch(
  "/:id",
  requireRole(["ADMIN", "SALES", "ACCOUNTANT"]),
  validate(idParamSchema, "params"),
  validate(customerSchema.partial()),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as Partial<ReturnType<typeof customerSchema.parse>>;
    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: body,
    });

    response.json(customer);
  }),
);

customersRouter.get(
  "/:id/statement",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        salesOrders: {
          include: {
            invoice: {
              include: {
                payments: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      response.status(404).json({ message: "Customer not found" });
      return;
    }

    const statementLines = customer.salesOrders.flatMap((order) => {
      if (!order.invoice) {
        return [];
      }

      const invoice = order.invoice;
      return [
        {
          type: "invoice",
          date: invoice.issueDate,
          reference: invoice.invoiceNumber,
          debit: toNumber(invoice.total),
          credit: 0,
        },
        ...invoice.payments.map((payment) => ({
          type: "payment",
          date: payment.paymentDate,
          reference: payment.reference ?? payment.id,
          debit: 0,
          credit: toNumber(payment.amount),
        })),
      ];
    });

    response.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
      statementLines,
      balance: statementLines.reduce((sum, line) => sum + line.debit - line.credit, 0),
      pdfUrl: `/api/customers/${customer.id}/statement.pdf`,
    });
  }),
);
