import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  idParamSchema,
  listQuerySchema,
  productCreateSchema,
  productUpdateSchema,
  productVariantInputSchema,
  variantUpdateSchema,
} from "../schemas/domain";
import { getPagination } from "../utils/pagination";

export const productsRouter = Router();

productsRouter.use(requireAuth);

productsRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
      search?: string;
      category?: string;
      material?: string;
      status?: string;
    };

    const where: any = {
      name: query.search
        ? {
            contains: query.search,
            mode: "insensitive" as const,
          }
        : undefined,
      category: query.category || undefined,
      material: query.material || undefined,
      status: query.status || undefined,
    };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          variants: {
            include: {
              inventoryItems: {
                include: {
                  warehouse: true,
                },
              },
            },
          },
          taxRate: true,
        },
        orderBy: {
          name: "asc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.product.count({ where }),
    ]);

    response.json({
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
    });
  }),
);

productsRouter.post(
  "/",
  requireRole(["ADMIN", "WAREHOUSE", "SALES"]),
  validate(productCreateSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof productCreateSchema.parse>;

    const created = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku,
        category: body.category,
        description: body.description,
        costPrice: body.costPrice,
        sellingPrice: body.sellingPrice,
        material: body.material,
        color: body.color,
        length: body.length,
        width: body.width,
        height: body.height,
        weight: body.weight,
        status: body.status,
        lowStockThreshold: body.lowStockThreshold,
        taxRateId: body.taxRateId,
        variants: {
          create: body.variants,
        },
      },
      include: {
        variants: true,
        taxRate: true,
      },
    });

    response.status(201).json(created);
  }),
);

productsRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        taxRate: true,
        variants: {
          include: {
            inventoryItems: {
              include: {
                warehouse: true,
              },
            },
            soLineItems: {
              include: {
                salesOrder: {
                  include: {
                    customer: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 10,
            },
          },
        },
      },
    });

    response.json(product);
  }),
);

productsRouter.patch(
  "/:id",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  validate(productUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as any;
    const { variants, ...productData } = body;
    const updated = await prisma.product.update({
      where: { id: params.id },
      data: productData,
      include: {
        variants: true,
        taxRate: true,
      },
    });

    response.json(updated);
  }),
);

productsRouter.get(
  "/:id/history",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        variants: {
          include: {
            stockMovements: {
              include: {
                warehouse: true,
                user: true,
              },
              orderBy: {
                occurredAt: "desc",
              },
              take: 50,
            },
            soLineItems: {
              include: {
                salesOrder: {
                  include: {
                    customer: true,
                  },
                },
              },
              orderBy: {
                createdAt: "desc",
              },
              take: 25,
            },
          },
        },
      },
    });

    response.json(product);
  }),
);

productsRouter.post(
  "/:id/variants",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  validate(productVariantInputSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof productVariantInputSchema.parse>;

    const variant = await prisma.productVariant.create({
      data: {
        ...body,
        productId: params.id,
      },
    });

    response.status(201).json(variant);
  }),
);

productsRouter.patch(
  "/variants/:id",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  validate(variantUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof variantUpdateSchema.parse>;

    const variant = await prisma.productVariant.update({
      where: { id: params.id },
      data: body,
      include: {
        product: true,
        inventoryItems: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    response.json(variant);
  }),
);
