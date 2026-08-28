import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { listQuerySchema, stockAdjustmentSchema } from "../schemas/domain";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";
import { logAudit } from "../services/audit.service";
import { ApiError } from "../utils/api-error";
import { invalidateDashboardCache } from "../config/redis";
export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

inventoryRouter.get(
  "/warehouses",
  asyncHandler(async (request, response) => {
    const warehouses = await prisma.warehouse.findMany({
      where: { tenantId: request.user!.tenantId, isActive: true },
      orderBy: { name: "asc" },
    });
    response.json(warehouses);
  }),
);

inventoryRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
      warehouseId?: string;
      status?: string;
      search?: string;
    };

    const where: any = {
      tenantId: request.user!.tenantId,
      warehouseId: query.warehouseId || undefined,
      status: query.status || undefined,
      productVariant: query.search
        ? {
            OR: [
              {
                variantName: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
              {
                product: {
                  name: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        include: {
          warehouse: true,
          productVariant: {
            include: {
              product: true,
            },
          },
        },
        orderBy: [{ warehouse: { name: "asc" } }, { updatedAt: "desc" }],
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.inventory.count({ where }),
    ]);

    response.json({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }),
);

inventoryRouter.get(
  "/movements",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
      warehouseId?: string;
      search?: string;
    };

    const where: any = {
      tenantId: request.user!.tenantId,
      warehouseId: query.warehouseId || undefined,
      productVariant: query.search
        ? {
            OR: [
              {
                variantName: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
              {
                product: {
                  name: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              },
            ],
          }
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          warehouse: true,
          user: true,
          productVariant: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          occurredAt: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.stockMovement.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

inventoryRouter.get(
  "/low-stock",
  asyncHandler(async (request, response) => {
    const items = await prisma.productVariant.findMany({
      where: {
        tenantId: request.user!.tenantId,
        product: {
          lowStockThreshold: {
            gt: 0,
          },
        },
      },
      include: {
        product: true,
        inventoryItems: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    response.json(
      items.filter((item) => item.stockQuantity <= item.product.lowStockThreshold),
    );
  }),
);

inventoryRouter.get(
  "/valuation",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    // #17 Fix: Paginate valuation instead of loading everything into memory
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
    };

    const where = {
      tenantId: request.user!.tenantId,
    };

    const [variants, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        include: {
          product: true,
          inventoryItems: {
            include: {
              warehouse: true,
            },
          },
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.productVariant.count({ where }),
    ]);

    const items = variants.map((variant) => {
      const unitCost = toNumber(variant.product.costPrice) + toNumber(variant.additionalCost);
      const totalValue = unitCost * variant.stockQuantity;

      return {
        id: variant.id,
        product: variant.product.name,
        variant: variant.variantName,
        category: variant.product.category,
        stockQuantity: variant.stockQuantity,
        unitCost,
        method: "weighted_average",
        totalValue,
        byWarehouse: variant.inventoryItems.map((inventory) => ({
          warehouse: inventory.warehouse.name,
          quantity: inventory.quantity,
          status: inventory.status,
          value: unitCost * inventory.quantity,
        })),
      };
    });

    // Calculate total valuation across all variants (not just this page)
    const allVariants = await prisma.productVariant.findMany({
      where,
      select: {
        stockQuantity: true,
        additionalCost: true,
        product: { select: { costPrice: true } },
      },
    });

    const totalValue = allVariants.reduce((sum, v) => {
      const uc = toNumber(v.product.costPrice) + toNumber(v.additionalCost);
      return sum + uc * v.stockQuantity;
    }, 0);

    response.json({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalValue,
    });
  }),
);

inventoryRouter.post(
  "/adjustments",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(stockAdjustmentSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof stockAdjustmentSchema.parse>;

    const [variantExists, warehouseExists] = await Promise.all([
      prisma.productVariant.findFirst({ where: { id: body.productVariantId, tenantId: request.user!.tenantId } }),
      prisma.warehouse.findFirst({ where: { id: body.warehouseId, tenantId: request.user!.tenantId } }),
    ]);
    if (!variantExists || !warehouseExists) throw new ApiError(404, "Product variant or warehouse not found");

    const existingInventory = await prisma.inventory.findFirst({
      where: {
        tenantId: request.user!.tenantId,
        productVariantId: body.productVariantId,
        warehouseId: body.warehouseId,
        status: "IN_STOCK",
      },
    });

    const updated = await prisma.$transaction(async (tx) => {
      const inventoryRecord = existingInventory
        ? await tx.inventory.update({
            where: {
              id: existingInventory.id,
            },
            data: {
              quantity: {
                increment: body.quantityDelta,
              },
            },
          })
        : await tx.inventory.create({
            data: {
              tenantId: request.user!.tenantId,
              productVariantId: body.productVariantId,
              warehouseId: body.warehouseId,
              quantity: Math.max(body.quantityDelta, 0),
              status: "IN_STOCK",
            },
          });

      const variant = await tx.productVariant.update({
        where: {
          id: body.productVariantId,
        },
        data: {
          stockQuantity: {
            increment: body.quantityDelta,
          },
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          tenantId: request.user!.tenantId,
          productVariantId: body.productVariantId,
          warehouseId: body.warehouseId,
          userId: request.user?.id,
          type: "ADJUSTMENT",
          quantity: body.quantityDelta,
          balanceAfter: variant.stockQuantity,
          reason: body.reason,
          source: body.source,
        },
      });

      return {
        inventoryRecord,
        variant,
        movement,
      };
    });

    if (request.user) {
      await logAudit({
        tenantId: request.user.tenantId,
        userId: request.user.id,
        action: "STOCK_ADJUSTMENT",
        entityType: "STOCK_MOVEMENT",
        entityId: updated.movement.id,
        previousState: {
          stockQuantity: Math.max(0, updated.variant.stockQuantity - body.quantityDelta),
        },
        newState: {
          stockQuantity: updated.variant.stockQuantity,
          delta: body.quantityDelta,
          reason: body.reason,
        },
      });
    }

    // Stock changed — bust dashboard caches (WAREHOUSE stock/low/out-of-stock tiles).
    await invalidateDashboardCache(request.user!.tenantId);

    response.status(201).json(updated);
  }),
);
