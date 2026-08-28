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
import { normalizeName } from "../utils/identity";
import { getPagination } from "../utils/pagination";
import { invalidateDashboardCache } from "../config/redis";

export const deliveriesRouter = Router();

async function resolveDriverId(
  tx: any,
  tenantId: string,
  driverId?: string,
  newDriverName?: string,
  newDriverPhone?: string,
): Promise<string | undefined> {
  if (newDriverName && newDriverName.trim() !== "") {
    const normName = normalizeName(newDriverName);
    const normPhone = newDriverPhone ? newDriverPhone.trim() : null;

    let existingDriver = await tx.user.findFirst({
      where: {
        tenantId,
        role: "DRIVER",
        OR: [
          ...(normPhone ? [{ phone: normPhone }] : []),
          { name: { equals: normName, mode: "insensitive" } },
        ],
      },
    });

    if (!existingDriver) {
      const phoneSlug = normPhone ? normPhone.replace(/\D/g, "") : Date.now().toString();
      const generatedEmail = `driver.${phoneSlug}.${Math.random().toString(36).substring(2, 6)}@erp.local`;

      existingDriver = await tx.user.create({
        data: {
          tenantId,
          name: normName,
          phone: normPhone,
          email: generatedEmail,
          role: "DRIVER",
          isActive: true,
        },
      });
    } else if (normPhone && !existingDriver.phone) {
      existingDriver = await tx.user.update({
        where: { id: existingDriver.id },
        data: { phone: normPhone },
      });
    }

    return existingDriver.id;
  }

  if (driverId && driverId.trim() !== "") {
    const driverUser = await tx.user.findFirst({
      where: { id: driverId, tenantId },
    });
    if (!driverUser) throw new ApiError(400, "Selected driver user was not found");
    return driverUser.id;
  }

  return undefined;
}

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
    const { newDriverName, newDriverPhone, ...deliveryBody } = body;

    const delivery = await prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findFirst({
        where: { id: body.soId, tenantId: request.user!.tenantId },
      });
      if (!order) throw new ApiError(404, "Sales Order not found");

      const resolvedDriverId = await resolveDriverId(
        tx,
        request.user!.tenantId,
        body.driverId,
        newDriverName,
        newDriverPhone,
      );

      const now = new Date();
      const actualDeliveryDate = body.actualDeliveryDate || (body.status === "DELIVERED" ? now : undefined);

      const created = await tx.delivery.create({
        data: {
          ...deliveryBody,
          driverId: resolvedDriverId ?? null,
          actualDeliveryDate,
          completedAt: body.status === "DELIVERED" ? now : undefined,
          tenantId: request.user!.tenantId,
          customerId: order.customerId,
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

      if (body.status === "OUT_FOR_DELIVERY" || body.status === "DELIVERED") {
        await tx.salesOrder.update({
          where: { id: body.soId },
          data: {
            status: body.status === "DELIVERED" ? "DELIVERED" : "OUT_FOR_DELIVERY",
            actualDeliveryDate: body.status === "DELIVERED" ? actualDeliveryDate : undefined,
          },
        });
      } else if (order.status === "CONFIRMED" || order.status === "DEPOSIT_PAID" || order.status === "PAID") {
        await tx.salesOrder.update({
          where: { id: body.soId },
          data: {
            status: "IN_WAREHOUSE",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: request.user!.tenantId,
          userId: request.user!.id,
          action: "CREATE_DELIVERY",
          entityType: "Delivery",
          entityId: created.id,
          customerId: order.customerId,
          newState: {
            status: created.status,
            scheduledDate: created.scheduledDate,
            driverId: created.driverId,
            soId: created.soId,
          },
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

    if (!delivery) {
      throw new ApiError(404, "Delivery not found");
    }

    if (request.user?.role === "DRIVER" && delivery.driverId !== request.user.id) {
      throw new ApiError(403, "Access denied: delivery assigned to another driver");
    }

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
    const { newDriverName, newDriverPhone, ...deliveryBody } = body;

    const delivery = await prisma.$transaction(async (tx) => {
      const existing = await tx.delivery.findFirst({
        where: { id: params.id, tenantId: request.user!.tenantId },
        include: { salesOrder: true },
      });
      if (!existing) throw new ApiError(404, "Delivery not found");

      if (request.user?.role === "DRIVER" && existing.driverId !== request.user.id) {
        throw new ApiError(403, "Access denied: cannot update delivery assigned to another driver");
      }

      let updatedDriverId: string | undefined | null = existing.driverId;
      if (newDriverName || body.driverId !== undefined) {
        updatedDriverId = (await resolveDriverId(
          tx,
          request.user!.tenantId,
          body.driverId,
          newDriverName,
          newDriverPhone,
        )) ?? null;
      }

      const now = new Date();
      const isBecomingDelivered = body.status === "DELIVERED";
      const actualDeliveryDate = body.actualDeliveryDate || (isBecomingDelivered ? now : existing.actualDeliveryDate);

      const updated = await tx.delivery.update({
        where: { id: params.id },
        data: {
          ...deliveryBody,
          driverId: updatedDriverId,
          actualDeliveryDate,
          completedAt: isBecomingDelivered ? (existing.completedAt || now) : body.status ? undefined : existing.completedAt,
        },
        include: {
          driver: true,
          salesOrder: {
            include: { customer: true },
          },
        },
      });

      if (body.status === "OUT_FOR_DELIVERY" || body.status === "DELIVERED") {
        await tx.salesOrder.update({
          where: { id: updated.soId },
          data: {
            status: body.status === "DELIVERED" ? "DELIVERED" : "OUT_FOR_DELIVERY",
            actualDeliveryDate: body.status === "DELIVERED" ? actualDeliveryDate : undefined,
          },
        });
      } else if (body.status === "SCHEDULED" && existing.status !== "SCHEDULED") {
        await tx.salesOrder.update({
          where: { id: updated.soId },
          data: {
            status: "IN_WAREHOUSE",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          tenantId: request.user!.tenantId,
          userId: request.user!.id,
          action: "UPDATE_DELIVERY_STATUS",
          entityType: "Delivery",
          entityId: updated.id,
          customerId: existing.salesOrder.customerId,
          previousState: {
            status: existing.status,
            driverId: existing.driverId,
            scheduledDate: existing.scheduledDate,
          },
          newState: {
            status: updated.status,
            driverId: updated.driverId,
            scheduledDate: updated.scheduledDate,
            actualDeliveryDate: updated.actualDeliveryDate,
            receiverName: updated.receiverName,
          },
        },
      });

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

    const updated = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: { id: params.id, tenantId: request.user!.tenantId },
        include: { salesOrder: true },
      });

      if (!delivery) {
        throw new ApiError(404, "Delivery not found");
      }

      if (request.user?.role === "DRIVER" && delivery.driverId !== request.user.id) {
        throw new ApiError(403, "Access denied: cannot mark failure on delivery assigned to another driver");
      }

      const updatedDelivery = await tx.delivery.update({
        where: { id: params.id },
        data: {
          status: "FAILED_ATTEMPT",
          failureReason: body.failureReason,
          scheduledDate: body.scheduledDate ?? delivery.scheduledDate,
        },
        include: {
          driver: true,
          salesOrder: {
            include: { customer: true },
          },
        },
      });

      await tx.salesOrder.update({
        where: { id: delivery.soId },
        data: {
          status: "IN_WAREHOUSE",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: request.user!.tenantId,
          userId: request.user!.id,
          action: "DELIVERY_FAILED_ATTEMPT",
          entityType: "Delivery",
          entityId: updatedDelivery.id,
          customerId: delivery.salesOrder.customerId,
          previousState: {
            status: delivery.status,
          },
          newState: {
            status: "FAILED_ATTEMPT",
            failureReason: body.failureReason,
            rescheduledDate: body.scheduledDate,
          },
        },
      });

      return updatedDelivery;
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
        include: { salesOrder: true },
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
        include: {
          driver: true,
          salesOrder: {
            include: { customer: true },
          },
        },
      });

      // Reset SO status to CONFIRMED so it can be re-scheduled
      await tx.salesOrder.update({
        where: { id: existing.soId },
        data: {
          status: "CONFIRMED",
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: request.user!.tenantId,
          userId: request.user!.id,
          action: "CANCEL_DELIVERY",
          entityType: "Delivery",
          entityId: updated.id,
          customerId: existing.salesOrder.customerId,
          previousState: { status: existing.status },
          newState: { status: "CANCELLED" },
        },
      });

      return updated;
    });

    await invalidateDashboardCache(request.user!.tenantId);
    response.json(delivery);
  }),
);
