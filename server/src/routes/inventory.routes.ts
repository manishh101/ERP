import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { listQuerySchema, stockAdjustmentSchema } from "../schemas/domain";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";
import { logAudit } from "../services/audit.service";
export const inventoryRouter = Router();

inventoryRouter.use(requireAuth);

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
  asyncHandler(async (_request, response) => {
    const items = await prisma.productVariant.findMany({
      where: {
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
  asyncHandler(async (_request, response) => {
    const variants = await prisma.productVariant.findMany({
      include: {
        product: true,
        inventoryItems: {
          include: {
            warehouse: true,
          },
        },
      },
    });

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

    response.json({
      items,
      totalValue: items.reduce((sum, item) => sum + item.totalValue, 0),
    });
  }),
);

inventoryRouter.post(
  "/adjustments",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(stockAdjustmentSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof stockAdjustmentSchema.parse>;

    const existingInventory = await prisma.inventory.findFirst({
      where: {
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

    response.status(201).json(updated);
  }),
);
