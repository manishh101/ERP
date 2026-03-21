import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  idParamSchema,
  listQuerySchema,
  recordDepositSchema,
  salesOrderSchema,
  salesOrderUpdateSchema,
} from "../schemas/domain";
import { ApiError } from "../utils/api-error";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";
import { salesOrderService } from "../services/sales-order.service";
import { paymentService } from "../services/payment.service";

export const salesOrdersRouter = Router();

salesOrdersRouter.use(requireAuth);

function calculateSalesOrderTotals(
  lineItems: Array<{ quantity: number; unitPrice: number; discountPct: number }>,
  depositAmount: number,
) {
  const subtotal = lineItems.reduce((sum, item) => {
    const lineTotal = item.quantity * item.unitPrice;
    return sum + lineTotal - lineTotal * (item.discountPct / 100);
  }, 0);

  return {
    subtotal,
    balanceDue: Math.max(subtotal - depositAmount, 0),
  };
}

salesOrdersRouter.get(
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
      customer: query.search
        ? {
            name: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          }
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          customer: true,
          assignedWarehouse: true,
          salesperson: true,
          lineItems: {
            include: {
              productVariant: {
                include: {
                  product: true,
                },
              },
            },
          },
          taxInvoice: true,
          delivery: true,
        },
        orderBy: {
          orderDate: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.salesOrder.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

salesOrdersRouter.post(
  "/",
  requireRole(["ADMIN", "SALES"]),
  validate(salesOrderSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof salesOrderSchema.parse>;
    const { order, subtotal } = await salesOrderService.createOrder(body, request.user?.id);

    response.status(201).json({
      ...order,
      subtotal,
    });
  }),
);

salesOrdersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const salesOrder = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        assignedWarehouse: true,
        salesperson: true,
        lineItems: {
          include: {
            productVariant: {
              include: {
                product: true,
                inventoryItems: {
                  include: {
                    warehouse: true,
                  },
                },
              },
            },
          },
        },
        taxInvoice: true,
        payments: true,
        delivery: true,
      },
    });

    response.json(salesOrder);
  }),
);

salesOrdersRouter.patch(
  "/:id",
  requireRole(["ADMIN", "SALES"]),
  validate(idParamSchema, "params"),
  validate(salesOrderUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof salesOrderUpdateSchema.parse>;

    const totals = body.lineItems
      ? calculateSalesOrderTotals(body.lineItems, body.depositAmount ?? 0)
      : undefined;

    const salesOrder = await prisma.salesOrder.update({
      where: { id: params.id },
      data: {
        customerId: body.customerId,
        assignedWarehouseId: body.assignedWarehouseId,
        salespersonId: body.salespersonId,
        status: body.status,
        orderAmount: totals?.subtotal,
        depositAmount: body.depositAmount,
        balanceDue: totals?.balanceDue,
        deliveryDate: body.deliveryDate,
        notes: body.notes,
        ...(body.lineItems
          ? {
              lineItems: {
                deleteMany: {},
                create: body.lineItems,
              },
            }
          : {}),
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    response.json(salesOrder);
  }),
);

salesOrdersRouter.post(
  "/:id/confirm",
  requireRole(["ADMIN", "SALES", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const updated = await salesOrderService.confirmOrder(params.id, request.user?.id);

    response.json(updated);
  }),
);

salesOrdersRouter.post(
  "/:id/deposit",
  requireRole(["ADMIN", "SALES", "ACCOUNTANT"]),
  validate(idParamSchema, "params"),
  validate(recordDepositSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof recordDepositSchema.parse>;

    await paymentService.recordCustomerPayment({
      salesOrderId: params.id,
      amount: body.amount,
      method: "BANK",
      paymentDate: new Date(),
    });

    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        assignedWarehouse: true,
        salesperson: true,
        lineItems: true,
      }
    });

    response.json(order);
  }),
);
salesOrdersRouter.post(
  "/:id/cancel",
  requireRole(["ADMIN", "SALES"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
      },
    });

    if (!order) {
      throw new ApiError(404, "Sales order not found");
    }

    if (order.status === "DELIVERED" || order.status === "CANCELLED") {
      throw new ApiError(400, `Cannot cancel order in ${order.status} status`);
    }

    const updated = await salesOrderService.cancelOrder(params.id, request.user?.id);

    response.json(updated);
  }),
);
