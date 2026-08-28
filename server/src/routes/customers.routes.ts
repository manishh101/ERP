import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { customerSchema, idParamSchema, listQuerySchema } from "../schemas/domain";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";
import { getCustomerLedger } from "../modules/ar-ledger/ar-ledger.service";
import { ApiError } from "../utils/api-error";

import { signToken, verifyToken } from "../utils/jwt";

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
      tenantId: request.user!.tenantId,
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
          salesOrders: true,
        },
        orderBy: {
          name: "asc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.customer.count({ where }),
    ]);

    response.json({
      items,
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
    const customer = await prisma.customer.create({
      data: {
        ...body,
        tenantId: request.user!.tenantId,
      },
    });
    response.status(201).json(customer);
  }),
);

customersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const customer = await prisma.customer.findUnique({
      where: { id: params.id, tenantId: request.user!.tenantId },
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
            taxInvoices: true,
            payments: true,
          },
          orderBy: {
            orderDate: "desc",
          },
        },
        taxInvoices: {
          orderBy: { issueDate: "desc" },
        },
        deliveries: {
          include: {
            driver: true,
          },
          orderBy: { scheduledDate: "desc" },
        },
        activityLog: {
          include: {
            user: true,
          },
          orderBy: { timestamp: "desc" },
          take: 100,
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
      where: { id: params.id, tenantId: request.user!.tenantId },
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
    const startDate = request.query.startDate
      ? new Date(String(request.query.startDate))
      : undefined;
    const endDate = request.query.endDate
      ? new Date(String(request.query.endDate))
      : undefined;

    const customer = await prisma.customer.findUnique({
      where: { id: params.id, tenantId: request.user!.tenantId },
      select: {
        id: true,
        name: true,
        phone: true,
        panNo: true,
        vatNo: true,
        outstandingBalance: true,
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const entries = await getCustomerLedger(request.user!.tenantId, params.id, startDate, endDate);

    response.json({
      customer,
      entries: entries.entries,
      closingBalance: entries.closingBalance,
    });
  }),
);

customersRouter.delete(
  "/:id",
  requireRole(["ADMIN"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const existingCustomer = await prisma.customer.findUnique({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existingCustomer) throw new ApiError(404, "Customer not found");

    // Check for existing sales orders
    const salesOrderCount = await prisma.salesOrder.count({
      where: { customerId: params.id, tenantId: request.user!.tenantId },
    });

    if (salesOrderCount > 0) {
      throw new ApiError(400, "Cannot delete party with existing sales orders. Please archive or void orders first.");
    }

    await prisma.customer.delete({
      where: { id: params.id },
    });

    response.json({ message: "Party deleted successfully" });
  }),
);

export default customersRouter;
