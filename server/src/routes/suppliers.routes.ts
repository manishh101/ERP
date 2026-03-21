import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { idParamSchema, listQuerySchema, supplierInvoiceSchema, supplierSchema } from "../schemas/domain";
import { getApAgingReport } from "../services/report.service";
import { getPagination } from "../utils/pagination";
import { toNumber } from "../utils/number";

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
    const supplier = await prisma.supplier.create({ data: body });
    response.status(201).json(supplier);
  }),
);

suppliersRouter.get(
  "/ap-aging",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  asyncHandler(async (_request, response) => {
    response.json(await getApAgingReport());
  }),
);

suppliersRouter.post(
  "/invoices",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  validate(supplierInvoiceSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof supplierInvoiceSchema.parse>;

    const invoice = await prisma.supplierInvoice.create({
      data: body,
      include: {
        supplier: true,
        purchaseOrder: true,
      },
    });

    response.status(201).json(invoice);
  }),
);

suppliersRouter.get(
  "/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const supplier = await prisma.supplier.findUnique({
      where: { id: params.id },
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

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        supplierId: params.id,
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
