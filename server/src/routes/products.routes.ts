import { Router } from "express";
import multer from "multer";
import path from "path";
import { put, del } from "@vercel/blob";
import fs from "fs";
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
import { ApiError } from "../utils/api-error";

export const productsRouter = Router();
const isVercel = Boolean(process.env.VERCEL);

// ── Multer setup for product images ──────────────────────────────────────────
// Vercel deployment requires memory storage, as local disk writes are ephemeral.
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    if (/image\/(jpeg|png|webp|gif)/.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, PNG, WebP and GIF images are allowed."));
  },
});

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
      sellableOnly?: boolean;
    };

    // Default: only show sellable products (company products).
    // Pass sellableOnly=false to include raw materials / procurement items.
    const sellableFilter = query.sellableOnly === false ? undefined : true;

    const where: any = {
      tenantId: request.user!.tenantId,
      isSellable: sellableFilter,
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
        tenantId: request.user!.tenantId,
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
        isSellable: body.isSellable ?? true,
        variants: {
          create: body.variants?.map((v) => ({
            ...v,
            tenantId: request.user!.tenantId,
          })),
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

    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
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
    const body = request.validated?.body as ReturnType<typeof productUpdateSchema.parse>;

    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existingProduct) throw new ApiError(404, "Product not found");

    const updated = await prisma.product.update({
      where: { id: params.id },
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
        taxRateId: body.taxRateId ?? undefined,
        // Allow admin to promote a raw material to a sellable product
        isSellable: body.isSellable,
      },
      include: { variants: true, taxRate: true },
    });

    response.json(updated);
  }),
);

productsRouter.get(
  "/:id/history",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        variants: {
          include: {
            inventoryItems: {
              include: {
                warehouse: true,
              },
            },
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

    const parentProduct = await prisma.product.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!parentProduct) throw new ApiError(404, "Product not found");

    const variant = await prisma.productVariant.create({
      data: {
        ...body,
        productId: params.id,
        tenantId: request.user!.tenantId,
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

    const variantExists = await prisma.productVariant.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!variantExists) throw new ApiError(404, "Variant not found");

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

// ── Image Upload ──────────────────────────────────────────────────────────────
productsRouter.post(
  "/:id/images",
  requireRole(["ADMIN", "WAREHOUSE", "SALES"]),
  validate(idParamSchema, "params"),
  upload.array("images", 10) as any,
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const files = (request as any).files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return response.status(400).json({ message: "No images uploaded." });
    }

    // Upload to Vercel Blob
    const uploadPromises = files.map((file) => 
      put(`products/${Date.now()}-${Math.round(Math.random() * 1e6)}${path.extname(file.originalname)}`, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
      })
    );

    const blobs = await Promise.all(uploadPromises);
    const newUrls = blobs.map((blob) => blob.url);

    const existingProduct = await prisma.product.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existingProduct) throw new ApiError(404, "Product not found");

    const product = await prisma.product.update({
      where: { id: params.id },
      data: { imageUrls: { push: newUrls } },
    });

    response.json({ imageUrls: product.imageUrls });
  }),
);

productsRouter.delete(
  "/:id/images",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const { url } = request.body as { url: string };

    const product = await prisma.product.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      select: { imageUrls: true },
    });
    if (!product) throw new ApiError(404, "Product not found");

    // Remove from Vercel Blob
    if (url.includes('public.blob.vercel-storage.com')) {
      await del(url);
    } else {
      // Fallback for local files if they still exist during transition
      const filename = path.basename(url);
      const uploadRoot = isVercel ? path.join("/tmp", "uploads") : path.join(process.cwd(), "uploads");
      const uploadDir = path.join(uploadRoot, "products");
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: { imageUrls: product.imageUrls.filter((u) => u !== url) },
    });

    response.json({ imageUrls: updated.imageUrls });
  }),
);
