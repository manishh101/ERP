import { Router } from "express";
import { prisma } from "../config/prisma";
import { PaymentMethod } from "@prisma/client";
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
import { getBsDate, getCurrentFiscalYear } from "../shared/fiscal-year.util";
import { createOrder, confirmOrder, cancelOrder } from "../modules/sales-orders/sales-order.service";
import { recordPayment } from "../modules/payments/payment.service";

export const salesOrdersRouter = Router();

salesOrdersRouter.use(requireAuth);

function calculateSalesOrderTotals(
  lineItems: Array<{ quantity: number; unitPrice: number; discountPct: number; discountAmount?: number }>,
  depositAmount: number,
) {
  const subtotal = lineItems.reduce((sum, item) => {
    const lineGross = item.quantity * item.unitPrice;
    const lineDiscount = item.discountAmount !== undefined ? item.discountAmount : (lineGross * (item.discountPct / 100));
    return sum + (lineGross - lineDiscount);
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
          taxInvoices: true,
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
    const order = await createOrder({
      customerId: body.customerId,
      lineItems: body.lineItems,
      depositAmount: body.depositAmount,
      deliveryDate: body.deliveryDate,
      notes: body.notes,
      bsDate: getBsDate(),
      fiscalYear: getCurrentFiscalYear(),
      assignedWarehouseId: body.assignedWarehouseId,
      salespersonId: body.salespersonId ?? request.user?.id,
      isCustomOrder: body.isCustomOrder,
      expectedReadyDate: body.expectedReadyDate,
    });

    response.status(201).json(order);
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
        taxInvoices: true,
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

    // Sync paidAmount from actual Payment records to ensure Net Collection KPI accuracy
    const sumPaid = await prisma.payment.aggregate({
      where: { salesOrderId: params.id },
      _sum: { amount: true },
    });
    const syncedPaidAmount = toNumber(sumPaid._sum.amount ?? 0);

    // Compute the correct balanceDue from the new orderAmount minus actual payments
    const newOrderAmount = totals?.subtotal;
    const existing = newOrderAmount === undefined
      ? await prisma.salesOrder.findUnique({ where: { id: params.id }, select: { orderAmount: true } })
      : null;
    const effectiveOrderAmount = newOrderAmount ?? toNumber(existing?.orderAmount ?? 0);
    const syncedBalanceDue = Math.max(effectiveOrderAmount - syncedPaidAmount, 0);

    const salesOrder = await prisma.salesOrder.update({
      where: { id: params.id },
      data: {
        customerId: body.customerId,
        assignedWarehouseId: body.assignedWarehouseId,
        salespersonId: body.salespersonId,
        status: body.status,
        orderAmount: newOrderAmount,
        depositAmount: body.depositAmount,
        paidAmount: syncedPaidAmount,
        balanceDue: syncedBalanceDue,
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
    const salesOrder = await confirmOrder(params.id);
    response.json(salesOrder);
  }),
);

salesOrdersRouter.post(
  "/:id/cancel",
  requireRole(["ADMIN", "SALES"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const salesOrder = await cancelOrder(params.id);
    response.json(salesOrder);
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

    await recordPayment({
      salesOrderId: params.id,
      amount: body.amount,
      method: body.method as any,
      bsDate: getBsDate(),
      fiscalYear: getCurrentFiscalYear(),
      note: "Deposit / advance payment",
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
