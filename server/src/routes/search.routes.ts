import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { globalSearchSchema } from "../schemas/domain";

export const searchRouter = Router();

searchRouter.use(requireAuth);

searchRouter.get(
  "/global",
  validate(globalSearchSchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { q: string };
    const search = query.q;

    const [products, customers, invoices, salesOrders] = await Promise.all([
      prisma.product.findMany({
        where: {
          tenantId: request.user!.tenantId,
          isSellable: true,
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              sku: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        },
        take: 5,
      }),
      prisma.customer.findMany({
        where: {
          OR: [
            {
              name: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: search,
                mode: "insensitive" as const,
              },
            },
          ],
        },
        take: 5,
      }),
      prisma.taxInvoice.findMany({
        where: {
          OR: [
            { invoiceNumber: { contains: search, mode: "insensitive" } },
            { bsDate: { contains: search, mode: "insensitive" } },
            { salesOrder: { customer: { name: { contains: search, mode: "insensitive" } } } },
          ],
        },
        include: { salesOrder: { include: { customer: true } } },
        take: 5,
      }),
      prisma.salesOrder.findMany({
        where: {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { bsDate: { contains: search, mode: "insensitive" } },
            { customer: { name: { contains: search, mode: "insensitive" } } },
            { notes: { contains: search, mode: "insensitive" } },
          ],
        },
        include: { customer: true },
        take: 5,
      }),
    ]);

    response.json({
      products,
      customers,
      invoices,
      salesOrders,
    });
  }),
);
