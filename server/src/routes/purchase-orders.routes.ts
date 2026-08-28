import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  goodsReceiptSchema,
  idParamSchema,
  listQuerySchema,
  purchaseOrderSchema,
  purchaseOrderUpdateSchema,
} from "../schemas/domain";
import { ApiError } from "../utils/api-error";
import { getPagination } from "../utils/pagination";
import { invalidateDashboardCache } from "../config/redis";

export const purchaseOrdersRouter = Router();

purchaseOrdersRouter.use(requireAuth);

purchaseOrdersRouter.get(
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
      supplier: query.search
        ? {
            name: {
              contains: query.search,
              mode: "insensitive" as const,
            },
          }
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: true,
          lineItems: {
            include: {
              productVariant: {
                include: {
                  product: true,
                },
              },
            },
          },
          goodsReceipts: true,
        },
        orderBy: {
          orderDate: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

async function resolveLineItemVariants(
  tenantId: string,
  lineItems: Array<{
    productVariantId?: string;
    productName?: string;
    supplierItemName?: string;
    sku?: string;
    quantity: number;
    unitCost?: number;
    taxAmount?: number;
  }>
) {
  const resolved = [];
  for (const item of lineItems) {
    let variantId = item.productVariantId;

    if (!variantId && item.productName) {
      const cleanName = item.productName.trim();
      
      const existingProduct = await prisma.product.findFirst({
        where: {
          tenantId,
          name: { equals: cleanName, mode: "insensitive" },
        },
        include: { variants: true },
      });

      if (existingProduct && existingProduct.variants.length > 0) {
        variantId = existingProduct.variants[0].id;
      } else {
        const slug = cleanName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 10) || "MAT";
        const generatedSku = item.sku?.trim() || `RAW-${slug}-${Date.now().toString().slice(-4)}`;

        const newProduct = await prisma.product.create({
          data: {
            tenantId,
            name: cleanName,
            sku: generatedSku,
            category: "Raw Materials",
            costPrice: item.unitCost ?? 0,
            sellingPrice: item.unitCost ?? 0,
            status: "ACTIVE",
            // Procurement-only item — must NOT appear in sales or product catalog
            isSellable: false,
            variants: {
              create: {
                tenantId,
                variantName: "Standard",
                skuVariant: `${generatedSku}-STD`,
                additionalCost: 0,
                stockQuantity: 0,
              },
            },
          },
          include: { variants: true },
        });

        variantId = newProduct.variants[0].id;
      }
    }

    if (!variantId) {
      throw new ApiError(
        400,
        `Line item missing valid product identification: ${item.productName || "Unknown"}`
      );
    }

    resolved.push({
      productVariantId: variantId,
      supplierItemName: item.supplierItemName,
      quantity: item.quantity,
      unitCost: item.unitCost ?? 0,
      taxAmount: item.taxAmount ?? 0,
    });
  }

  return resolved;
}

purchaseOrdersRouter.post(
  "/",
  requireRole(["ADMIN", "WAREHOUSE", "ACCOUNTANT"]),
  validate(purchaseOrderSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof purchaseOrderSchema.parse>;
    const totalAmount = body.lineItems.reduce(
      (sum, item) => sum + item.quantity * (item.unitCost ?? 0) + (item.taxAmount ?? 0),
      0,
    );

    const supplier = await prisma.supplier.findFirst({
      where: { id: body.supplierId, tenantId: request.user!.tenantId }
    });
    if (!supplier) throw new ApiError(404, "Supplier not found");

    const resolvedItems = await resolveLineItemVariants(request.user!.tenantId, body.lineItems);

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        tenantId: request.user!.tenantId,
        supplierId: body.supplierId,
        createdById: request.user?.id,
        status: body.status,
        orderDate: body.orderDate,
        expectedDelivery: body.expectedDelivery,
        shippingTerms: body.shippingTerms,
        notes: body.notes,
        totalAmount,
        lineItems: {
          create: resolvedItems.map(item => ({
            ...item,
            tenantId: request.user!.tenantId,
          })),
        },
      },
      include: {
        supplier: true,
        lineItems: true,
      },
    });

    await invalidateDashboardCache(request.user!.tenantId);

    response.status(201).json(purchaseOrder);
  }),
);

purchaseOrdersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        supplier: true,
        createdBy: true,
        lineItems: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
            receiptLines: true,
          },
        },
        goodsReceipts: {
          include: {
            lines: true,
            receivedBy: true,
          },
        },
        supplierInvoices: true,
        payments: true,
      },
    });

    response.json(purchaseOrder);
  }),
);

purchaseOrdersRouter.patch(
  "/:id",
  requireRole(["ADMIN", "WAREHOUSE", "ACCOUNTANT"]),
  validate(idParamSchema, "params"),
  validate(purchaseOrderUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof purchaseOrderUpdateSchema.parse>;

    const totalAmount = body.lineItems
      ? body.lineItems.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0) + (item.taxAmount ?? 0), 0)
      : undefined;

    const existingPo = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId }
    });
    if (!existingPo) throw new ApiError(404, "Purchase order not found");

    if (((existingPo.status as string) === "RECEIVED" || (existingPo.status as string) === "CLOSED") && body.lineItems) {
      throw new ApiError(400, `Cannot modify line items for a Purchase Order in ${existingPo.status} status.`);
    }

    const resolvedItems = body.lineItems
      ? await resolveLineItemVariants(request.user!.tenantId, body.lineItems)
      : undefined;

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        supplierId: body.supplierId,
        status: body.status,
        orderDate: body.orderDate,
        expectedDelivery: body.expectedDelivery,
        shippingTerms: body.shippingTerms,
        notes: body.notes,
        totalAmount,
        ...(resolvedItems
          ? {
              lineItems: {
                deleteMany: {},
                create: resolvedItems.map(item => ({
                  ...item,
                  tenantId: request.user!.tenantId,
                })),
              },
            }
          : {}),
      },
      include: {
        supplier: true,
        lineItems: true,
      },
    });

    await invalidateDashboardCache(request.user!.tenantId);

    response.json(purchaseOrder);
  }),
);

purchaseOrdersRouter.post(
  "/:id/receive",
  requireRole(["ADMIN", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  validate(goodsReceiptSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof goodsReceiptSchema.parse>;

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        lineItems: true,
      },
    });

    if (!purchaseOrder) {
      throw new ApiError(404, "Purchase order not found");
    }

    const currentStatus = purchaseOrder.status as string;
    if (currentStatus === "DRAFT" || currentStatus === "CANCELLED" || currentStatus === "CLOSED") {
      throw new ApiError(
        400,
        `Cannot receive goods for a Purchase Order in ${purchaseOrder.status} status. Please approve and send the purchase order first.`
      );
    }

    const targetWarehouse =
      (await prisma.warehouse.findFirst({
        where: {
          tenantId: request.user!.tenantId,
          type: "STORAGE",
          isActive: true,
        },
      })) ??
      (await prisma.warehouse.findFirst({
        where: {
          tenantId: request.user!.tenantId,
          isActive: true,
        },
      }));

    if (!targetWarehouse) {
      throw new ApiError(400, "No active warehouse is configured for receipts");
    }

    const result = await prisma.$transaction(async (tx) => {
      const receipt = await tx.goodsReceipt.create({
        data: {
          tenantId: request.user!.tenantId,
          purchaseOrderId: params.id,
          receivedById: request.user?.id,
          receivedDate: body.receivedDate,
          status: body.status,
          notes: body.notes,
          lines: {
            create: body.lines.map((line) => ({
              tenantId: request.user!.tenantId,
              poLineItemId: line.poLineItemId,
              quantityReceived: line.quantityReceived,
              discrepancyQty: line.discrepancyQty ?? 0,
            })),
          },
        },
        include: {
          lines: true,
        },
      });

      for (const line of body.lines) {
        const poLineItem = purchaseOrder.lineItems.find((item) => item.id === line.poLineItemId);

        if (!poLineItem) {
          throw new ApiError(404, "Purchase order line item not found");
        }

        // 1. Update received quantity and unit cost / tax amount if provided
        await tx.purchaseOrderLineItem.update({
          where: { id: poLineItem.id },
          data: {
            receivedQuantity: {
              increment: line.quantityReceived,
            },
            ...(line.unitCost !== undefined ? { unitCost: line.unitCost } : {}),
            ...(line.taxAmount !== undefined ? { taxAmount: line.taxAmount } : {}),
            ...(line.supplierItemName !== undefined && line.supplierItemName.trim() !== "" ? { supplierItemName: line.supplierItemName.trim() } : {}),
          },
        });

        // 2. Update catalog product cost price if unit cost was filled
        if (line.unitCost !== undefined && line.unitCost > 0) {
          const variant = await tx.productVariant.findUnique({
            where: { id: poLineItem.productVariantId },
          });
          if (variant) {
            await tx.product.update({
              where: { id: variant.productId },
              data: { costPrice: line.unitCost },
            });
          }
        }

        // 3. Update inventory stock
        const inventoryRecord = await tx.inventory.findFirst({
          where: {
            tenantId: request.user!.tenantId,
            productVariantId: poLineItem.productVariantId,
            warehouseId: targetWarehouse.id,
            status: "IN_STOCK",
          },
        });

        if (inventoryRecord) {
          await tx.inventory.update({
            where: { id: inventoryRecord.id },
            data: {
              quantity: {
                increment: line.quantityReceived,
              },
            },
          });
        } else {
          await tx.inventory.create({
            data: {
              tenantId: request.user!.tenantId,
              productVariantId: poLineItem.productVariantId,
              warehouseId: targetWarehouse.id,
              quantity: line.quantityReceived,
              status: "IN_STOCK",
            },
          });
        }

        const variant = await tx.productVariant.update({
          where: { id: poLineItem.productVariantId },
          data: {
            stockQuantity: {
              increment: line.quantityReceived,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            tenantId: request.user!.tenantId,
            productVariantId: poLineItem.productVariantId,
            warehouseId: targetWarehouse.id,
            userId: request.user?.id,
            type: "INBOUND",
            quantity: line.quantityReceived,
            balanceAfter: variant.stockQuantity,
            source: `PO:${purchaseOrder.id}`,
          },
        });
      }

      const refreshedItems = await tx.purchaseOrderLineItem.findMany({
        where: {
          poId: purchaseOrder.id,
        },
      });

      const allReceived = refreshedItems.every((item) => item.receivedQuantity >= item.quantity);
      const someReceived = refreshedItems.some((item) => item.receivedQuantity > 0);

      const recalculatedTotal = refreshedItems.reduce(
        (sum, item) => sum + item.quantity * Number(item.unitCost) + Number(item.taxAmount),
        0
      );

      await tx.purchaseOrder.update({
        where: {
          id: purchaseOrder.id,
        },
        data: {
          totalAmount: recalculatedTotal,
          status: allReceived ? "RECEIVED" : someReceived ? "PARTIALLY_RECEIVED" : purchaseOrder.status,
        },
      });

      // 4. Optionally record Supplier VAT Bill / Supplier Invoice if provided
      if (body.supplierInvoiceNo?.trim()) {
        const invoiceSubtotal = refreshedItems.reduce(
          (sum, item) => sum + item.receivedQuantity * Number(item.unitCost),
          0
        );
        const invoiceTax = refreshedItems.reduce(
          (sum, item) => sum + Number(item.taxAmount),
          0
        );
        const invoiceTotal = invoiceSubtotal + invoiceTax;

        const parseDate = (d: any) => {
          if (!d) return new Date();
          const parsed = new Date(d);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        };

        const invoiceNum = body.supplierInvoiceNo.trim();
        const existingInvoice = await tx.supplierInvoice.findFirst({
          where: {
            tenantId: request.user!.tenantId,
            OR: [
              { invoiceNumber: invoiceNum },
              { purchaseOrderId: purchaseOrder.id },
            ],
          },
        });

        if (existingInvoice) {
          await tx.supplierInvoice.update({
            where: { id: existingInvoice.id },
            data: {
              invoiceNumber: invoiceNum,
              issueDate: parseDate(body.supplierInvoiceDate || body.receivedDate),
              subtotal: invoiceSubtotal,
              taxAmount: invoiceTax,
              totalAmount: invoiceTotal,
              notes: body.notes || `Supplier VAT Bill for PO #${purchaseOrder.id.slice(0, 8)}`,
            },
          });
        } else {
          await tx.supplierInvoice.create({
            data: {
              tenantId: request.user!.tenantId,
              supplierId: purchaseOrder.supplierId,
              purchaseOrderId: purchaseOrder.id,
              invoiceNumber: invoiceNum,
              issueDate: parseDate(body.supplierInvoiceDate || body.receivedDate),
              status: "RECEIVED",
              subtotal: invoiceSubtotal,
              taxAmount: invoiceTax,
              totalAmount: invoiceTotal,
              notes: body.notes || `Supplier VAT Bill for PO #${purchaseOrder.id.slice(0, 8)}`,
            },
          });
        }
      }

      return receipt;
    });

    await invalidateDashboardCache(request.user!.tenantId);

    response.status(201).json(result);
  }),
);

purchaseOrdersRouter.post(
  "/:id/match",
  requireRole(["ADMIN", "ACCOUNTANT", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        lineItems: true,
        goodsReceipts: {
          include: {
            lines: true,
          },
        },
        supplierInvoices: true,
      },
    });

    if (!purchaseOrder) {
      throw new ApiError(404, "Purchase order not found");
    }

    const poValue = Number(purchaseOrder.totalAmount);
    const receivedValue = purchaseOrder.goodsReceipts.reduce((sum, receipt) => {
      return (
        sum +
        receipt.lines.reduce((lineSum, line) => {
          const poLine = purchaseOrder.lineItems.find((item) => item.id === line.poLineItemId);
          return lineSum + (poLine ? Number(poLine.unitCost) * line.quantityReceived : 0);
        }, 0)
      );
    }, 0);
    const invoicedValue = purchaseOrder.supplierInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.totalAmount),
      0,
    );

    response.json({
      purchaseOrderId: purchaseOrder.id,
      poStatus: purchaseOrder.status,
      poValue,
      receivedValue,
      invoicedValue,
      isMatched:
        Math.abs(poValue - receivedValue) < 0.01 && Math.abs(poValue - invoicedValue) < 0.01,
      receipts: purchaseOrder.goodsReceipts.length,
      supplierInvoices: purchaseOrder.supplierInvoices.length,
    });
  }),
);
