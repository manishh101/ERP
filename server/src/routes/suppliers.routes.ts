import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { idParamSchema, listQuerySchema, supplierInvoiceSchema, supplierSchema } from "../schemas/domain";
import { getApAgingReport } from "../services/report.service";
import { postSupplierInvoiceJournalEntry } from "../services/accounting.service";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";
import { ApiError } from "../utils/api-error";

export const suppliersRouter = Router();

suppliersRouter.use(requireAuth);

suppliersRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      page: number;
      pageSize: number;
      search?: string;
    };

    const where: any = {
      tenantId: request.user!.tenantId,
      name: query.search
        ? {
            contains: query.search,
            mode: "insensitive" as const,
          }
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where,
        include: {
          purchaseOrders: true,
          supplierInvoices: true,
        },
        orderBy: {
          name: "asc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.supplier.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

suppliersRouter.post(
  "/",
  requireRole(["ADMIN", "ACCOUNTANT", "WAREHOUSE"]),
  validate(supplierSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof supplierSchema.parse>;
    const supplier = await prisma.supplier.create({
      data: {
        ...body,
        contact: body.contact || body.name,
        tenantId: request.user!.tenantId,
      },
    });
    response.status(201).json(supplier);
  }),
);

suppliersRouter.get(
  "/ap-aging",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  asyncHandler(async (request, response) => {
    response.json(await getApAgingReport(request.user!.tenantId));
  }),
);

suppliersRouter.get(
  "/invoices",
  requireRole(["ADMIN", "ACCOUNTANT", "WAREHOUSE"]),
  asyncHandler(async (request, response) => {
    const tenantId = request.user!.tenantId;
    const invoices = await prisma.supplierInvoice.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        purchaseOrder: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    response.json({ items: invoices, total: invoices.length });
  }),
);

suppliersRouter.post(
  "/invoices",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  validate(supplierInvoiceSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof supplierInvoiceSchema.parse>;
    const tenantId = request.user!.tenantId;

    // Verify supplier ownership
    const supplierExists = await prisma.supplier.findFirst({
      where: { id: body.supplierId, tenantId },
    });
    if (!supplierExists) throw new ApiError(404, "Supplier not found");

    if (body.purchaseOrderId) {
      const poExists = await prisma.purchaseOrder.findFirst({
        where: { id: body.purchaseOrderId, tenantId },
      });
      if (!poExists) throw new ApiError(404, "Purchase Order not found");
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const created = await tx.supplierInvoice.create({
        data: {
          ...body,
          tenantId,
        },
        include: {
          supplier: true,
          purchaseOrder: true,
        },
      });

      await postSupplierInvoiceJournalEntry({
        tenantId,
        supplierInvoiceId: created.id,
        totalAmount: toNumber(created.totalAmount),
        taxAmount: toNumber(created.taxAmount),
        createdById: request.user!.id,
      }, tx);

      return created;
    });

    response.status(201).json(invoice);
  }),
);

suppliersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const supplier = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: {
        purchaseOrders: {
          include: {
            lineItems: true,
          },
          orderBy: {
            orderDate: "desc",
          },
        },
        supplierInvoices: {
          orderBy: {
            issueDate: "desc",
          },
        },
      },
    });

    if (!supplier) throw new ApiError(404, "Supplier not found");
    response.json(supplier);
  }),
);

suppliersRouter.patch(
  "/:id",
  requireRole(["ADMIN", "ACCOUNTANT", "WAREHOUSE"]),
  validate(idParamSchema, "params"),
  validate(supplierSchema.partial()),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as Partial<ReturnType<typeof supplierSchema.parse>>;
    
    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existing) throw new ApiError(404, "Supplier not found");

    const supplier = await prisma.supplier.update({
      where: { id: params.id },
      data: body,
    });

    response.json(supplier);
  }),
);

suppliersRouter.get(
  "/:id/metrics",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const supplierExists = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!supplierExists) throw new ApiError(404, "Supplier not found");

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId: params.id,
        tenantId: request.user!.tenantId,
      },
      include: {
        goodsReceipts: {
          orderBy: {
            receivedDate: "asc",
          },
        },
      },
    });

    const receivedOrders = purchaseOrders.filter((po) => po.goodsReceipts.length > 0);
    const onTimeOrders = receivedOrders.filter((po) => {
      const receipt = po.goodsReceipts[0];
      return po.expectedDelivery ? receipt.receivedDate <= po.expectedDelivery : true;
    });

    const averageLeadTimeDays =
      receivedOrders.reduce((sum, po) => {
        const receipt = po.goodsReceipts[0];
        return (
          sum +
          Math.max(
            0,
            Math.round(
              (receipt.receivedDate.getTime() - po.orderDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
          )
        );
      }, 0) / Math.max(receivedOrders.length, 1);

    const totalSpend = purchaseOrders.reduce((sum, po) => sum + toNumber(po.totalAmount), 0);

    response.json({
      supplierId: params.id,
      purchaseOrderCount: purchaseOrders.length,
      onTimeDeliveryRate:
        receivedOrders.length === 0 ? 0 : (onTimeOrders.length / receivedOrders.length) * 100,
      averageLeadTimeDays,
      totalSpend,
    });
  }),
);

suppliersRouter.delete(
  "/:id",
  requireRole(["ADMIN"]),
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };

    const existing = await prisma.supplier.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existing) throw new ApiError(404, "Supplier not found");

    // Check for existing purchase orders
    const poCount = await prisma.purchaseOrder.count({
      where: { supplierId: params.id, tenantId: request.user!.tenantId },
    });

    if (poCount > 0) {
      throw new ApiError(400, "Cannot delete supplier with existing purchase orders.");
    }

    await prisma.supplier.delete({
      where: { id: params.id },
    });

    response.json({ message: "Supplier deleted successfully" });
  }),
);

export default suppliersRouter;
