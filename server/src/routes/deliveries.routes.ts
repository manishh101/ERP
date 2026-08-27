import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  deliverySchema,
  deliveryUpdateSchema,
  failedDeliverySchema,
  idParamSchema,
  listQuerySchema,
  manifestQuerySchema,
} from "../schemas/domain";
import { ApiError } from "../utils/api-error";
import { getPagination } from "../utils/pagination";
import { invalidateDashboardCache } from "../config/redis";

export const deliveriesRouter = Router();

deliveriesRouter.use(requireAuth);

deliveriesRouter.get(
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
      OR: query.search
        ? [
            {
              vehicle: {
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
      ...(request.user?.role === "DRIVER" ? { driverId: request.user.id } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          driver: true,
          salesOrder: {
            include: {
              customer: true,
            },
          },
        },
        orderBy: {
          scheduledDate: "asc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.delivery.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

deliveriesRouter.post(
  "/",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(deliverySchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof deliverySchema.parse>;

    const delivery = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id: body.soId, tenantId: request.user!.tenantId },
      });
      if (!order) throw new ApiError(404, "Sales Order not found");

      const created = await tx.delivery.create({
        data: {
          ...body,
          tenantId: request.user!.tenantId,
        },
        include: {
          driver: true,
          salesOrder: {
            include: {
              customer: true,
            },
          },
        },
      });

      await tx.salesOrder.update({
        where: { id: body.soId },
        data: {
          status: "DISPATCHED",
        },
      });

      return created;
    });

    await invalidateDashboardCache(request.user!.tenantId);
    response.status(201).json(delivery);
  }),
);

deliveriesRouter.get(
  "/manifest/daily",
  validate(manifestQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { date?: Date };
    const targetDate = query.date ?? new Date();
    const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);

    const deliveries = await prisma.delivery.findMany({
      where: {
        tenantId: request.user!.tenantId,
        scheduledDate: {
          gte: start,
          lt: end,
        },
      },
      include: {
        driver: true,
        salesOrder: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: [{ driver: { name: "asc" } }, { scheduledDate: "asc" }],
    });

    const grouped = deliveries.reduce<Record<string, typeof deliveries>>((accumulator, delivery) => {
      const key = delivery.driver?.name ?? "Unassigned";
      accumulator[key] = [...(accumulator[key] ?? []), delivery];
      return accumulator;
    }, {});

    response.json({
      date: start,
      groups: grouped,
      renderEngine: "react-pdf",
    });
  }),
);

deliveriesRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const delivery = await prisma.delivery.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        driver: true,
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

    response.json(delivery);
  }),
);

deliveriesRouter.patch(
  "/:id",
  requireRole(["ADMIN", "WAREHOUSE", "DRIVER"]),
  validate(idParamSchema, "params"),
  validate(deliveryUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof deliveryUpdateSchema.parse>;

    const delivery = await prisma.$transaction(async (tx) => {
      const existing = await tx.delivery.findFirst({
        where: { id: params.id, tenantId: request.user!.tenantId },
      });
      if (!existing) throw new ApiError(404, "Delivery not found");

      const updated = await tx.delivery.update({
        where: { id: params.id },
        data: {
          ...body,
          completedAt: body.status === "DELIVERED" ? new Date() : undefined,
        },
      });

      if (body.status === "OUT_FOR_DELIVERY" || body.status === "DELIVERED") {
        await tx.salesOrder.update({
          where: { id: updated.soId },
          data: {
            status: body.status === "DELIVERED" ? "DELIVERED" : "OUT_FOR_DELIVERY",
          },
        });
      }

      return updated;
    });

    await invalidateDashboardCache(request.user!.tenantId);
    response.json(delivery);
  }),
);

deliveriesRouter.post(
  "/:id/fail",
  requireRole(["ADMIN", "WAREHOUSE", "DRIVER"]),
  validate(idParamSchema, "params"),
  validate(failedDeliverySchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof failedDeliverySchema.parse>;

    const delivery = await prisma.delivery.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });

    if (!delivery) {
      throw new ApiError(404, "Delivery not found");
    }

    const updated = await prisma.delivery.update({
      where: { id: params.id },
      data: {
        status: "FAILED_ATTEMPT",
        failureReason: body.failureReason,
        scheduledDate: body.scheduledDate ?? delivery.scheduledDate,
      },
    });

    await invalidateDashboardCache(request.user!.tenantId);
    response.json(updated);
  }),
);

deliveriesRouter.post(
  "/:id/cancel",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const delivery = await prisma.$transaction(async (tx) => {
      const existing = await tx.delivery.findFirst({
        where: { id: params.id, tenantId: request.user!.tenantId },
      });

      if (!existing) {
        throw new ApiError(404, "Delivery not found");
      }

      if (existing.status === "DELIVERED" || existing.status === "CANCELLED") {
        throw new ApiError(400, `Cannot cancel delivery in ${existing.status} status`);
      }

      const updated = await tx.delivery.update({
        where: { id: params.id },
        data: {
          status: "CANCELLED",
        },
      });

      // Reset SO status to CONFIRMED so it can be re-scheduled
      await tx.salesOrder.update({
        where: { id: existing.soId },
        data: {
          status: "CONFIRMED",
        },
      });

      return updated;
    });

    await invalidateDashboardCache(request.user!.tenantId);
    response.json(delivery);
  }),
);
