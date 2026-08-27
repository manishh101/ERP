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
import { invalidateDashboardCache } from "../config/redis";
import { financialMutationLimiter } from "../middleware/rate-limit";

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
      year?: string;
      month?: string;
    };

    let bsDateFilter = undefined;
    if (query.year) {
      bsDateFilter = {
        startsWith: query.month ? `${query.year}-${query.month.padStart(2, "0")}` : `${query.year}-`,
      };
    }

    const where: any = {
      tenantId: request.user!.tenantId,
      status: query.status || undefined,
      bsDate: bsDateFilter,
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
          createdAt: "desc",
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
  financialMutationLimiter as any, // FIX #3: Rate limiting to prevent rapid order creation and DoS
  requireRole(["ADMIN", "SALES"]),
  validate(salesOrderSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof salesOrderSchema.parse>;
    const order = await createOrder({
      tenantId: request.user!.tenantId,
      customerId: body.customerId,
      status: body.status,
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

    // #19: Invalidate dashboard caches after financial mutation
    await invalidateDashboardCache(request.user!.tenantId);

    response.status(201).json(order);
  }),
);

salesOrdersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const salesOrder = await prisma.salesOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
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
      where: { salesOrderId: params.id, tenantId: request.user!.tenantId },
      _sum: { amount: true },
    });
    const syncedPaidAmount = toNumber(sumPaid._sum.amount ?? 0);

    // Compute the correct balanceDue from the new orderAmount minus actual payments
    const newOrderAmount = totals?.subtotal;
    const existing = newOrderAmount === undefined
      ? await prisma.salesOrder.findFirst({
          where: { id: params.id, tenantId: request.user!.tenantId },
          select: { orderAmount: true },
        })
      : null;
    const effectiveOrderAmount = newOrderAmount ?? toNumber(existing?.orderAmount ?? 0);
    const syncedBalanceDue = Math.max(effectiveOrderAmount - syncedPaidAmount, 0);

    const existingOrder = await prisma.salesOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existingOrder) throw new ApiError(404, "Order not found");

    const curStatus = existingOrder.status as string;
    if ((curStatus === "DISPATCHED" || curStatus === "DELIVERED" || curStatus === "CANCELLED") && body.lineItems) {
      throw new ApiError(400, `Cannot modify line items for a Sales Order in ${existingOrder.status} status.`);
    }

    // If attempting to move from QUOTE/DRAFT to CONFIRMED via PATCH, route through confirmOrder service for stock reservation & AR debit
    if (body.status === "CONFIRMED" && (existingOrder.status === "QUOTE" || (existingOrder.status as string) === "DRAFT")) {
      const confirmed = await confirmOrder(request.user!.tenantId, params.id);
      await invalidateDashboardCache(request.user!.tenantId);
      response.json(confirmed);
      return;
    }

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
                create: body.lineItems.map((item) => ({
                  ...item,
                  tenantId: request.user!.tenantId,
                })),
              },
            }
          : {}),
      },
      include: {
        customer: true,
        lineItems: true,
      },
    });

    await invalidateDashboardCache(request.user!.tenantId);
    response.json(salesOrder);
  }),
);

salesOrdersRouter.post(
  "/:id/confirm",
  requireRole(["ADMIN", "SALES", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const salesOrder = await confirmOrder(request.user!.tenantId, params.id);
    await invalidateDashboardCache(request.user!.tenantId);
    response.json(salesOrder);
  }),
);

salesOrdersRouter.post(
  "/:id/cancel",
  requireRole(["ADMIN", "SALES"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const salesOrder = await cancelOrder(request.user!.tenantId, params.id);
    await invalidateDashboardCache(request.user!.tenantId);
    response.json(salesOrder);
  }),
);

salesOrdersRouter.post(
  "/:id/deposit",
  financialMutationLimiter as any, // FIX #3: Rate limiting for deposit payments
  requireRole(["ADMIN", "SALES", "ACCOUNTANT"]),
  validate(idParamSchema, "params"),
  validate(recordDepositSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof recordDepositSchema.parse>;

    const orderExists = await prisma.salesOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!orderExists) throw new ApiError(404, "Order not found");

    await recordPayment({
      tenantId: request.user!.tenantId,
      salesOrderId: params.id,
      amount: body.amount,
      method: body.method as any,
      bsDate: getBsDate(),
      fiscalYear: getCurrentFiscalYear(),
      note: "Deposit / advance payment",
    });

    const order = await prisma.salesOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        customer: true,
        assignedWarehouse: true,
        salesperson: true,
        lineItems: true,
      }
    });

    await invalidateDashboardCache(request.user!.tenantId);
    response.json(order);
  }),
);
