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
    const search = query.q.trim();
    const tenantId = request.user!.tenantId;
    const contains = (value: string) => ({
      contains: value,
      mode: "insensitive" as const,
    });

    const [
      products,
      customers,
      suppliers,
      invoices,
      supplierInvoices,
      salesOrders,
      purchaseOrders,
      payments,
    ] = await Promise.all([
      prisma.product.findMany({
        where: {
          tenantId,
          isSellable: true,
          OR: [
            { name: contains(search) },
            { sku: contains(search) },
            { category: contains(search) },
            { material: contains(search) },
            { variants: { some: { skuVariant: contains(search) } } },
            { variants: { some: { variantName: contains(search) } } },
          ],
        },
        include: { variants: { take: 2 } },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.customer.findMany({
        where: {
          tenantId,
          OR: [
            { name: contains(search) },
            { email: contains(search) },
            { phone: contains(search) },
            { panNo: contains(search) },
            { vatNo: contains(search) },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.supplier.findMany({
        where: {
          tenantId,
          OR: [
            { name: contains(search) },
            { contact: contains(search) },
            { email: contains(search) },
            { phone: contains(search) },
            { panNo: contains(search) },
            { vatNo: contains(search) },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.taxInvoice.findMany({
        where: {
          tenantId,
          OR: [
            { id: contains(search) },
            { invoiceNumber: contains(search) },
            { bsDate: contains(search) },
            { salesOrder: { id: contains(search) } },
            { salesOrder: { customer: { name: contains(search) } } },
          ],
        },
        include: { salesOrder: { include: { customer: true } } },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.supplierInvoice.findMany({
        where: {
          tenantId,
          OR: [
            { id: contains(search) },
            { invoiceNumber: contains(search) },
            { supplier: { name: contains(search) } },
            { purchaseOrder: { id: contains(search) } },
            { notes: contains(search) },
          ],
        },
        include: { supplier: true, purchaseOrder: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.salesOrder.findMany({
        where: {
          tenantId,
          OR: [
            { id: contains(search) },
            { bsDate: contains(search) },
            { customer: { name: contains(search) } },
            { notes: contains(search) },
            { lineItems: { some: { customProductName: contains(search) } } },
            { lineItems: { some: { productVariant: { variantName: contains(search) } } } },
            { lineItems: { some: { productVariant: { skuVariant: contains(search) } } } },
            { lineItems: { some: { productVariant: { product: { name: contains(search) } } } } },
          ],
        },
        include: { customer: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          OR: [
            { id: contains(search) },
            { supplier: { name: contains(search) } },
            { supplier: { phone: contains(search) } },
            { supplier: { email: contains(search) } },
            { shippingTerms: contains(search) },
            { notes: contains(search) },
            { lineItems: { some: { supplierItemName: contains(search) } } },
            { lineItems: { some: { productVariant: { variantName: contains(search) } } } },
            { lineItems: { some: { productVariant: { skuVariant: contains(search) } } } },
            { lineItems: { some: { productVariant: { product: { name: contains(search) } } } } },
          ],
        },
        include: { supplier: true },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.payment.findMany({
        where: {
          tenantId,
          OR: [
            { id: contains(search) },
            { reference: contains(search) },
            { note: contains(search) },
            { bsDate: contains(search) },
            { salesOrder: { id: contains(search) } },
            { salesOrder: { customer: { name: contains(search) } } },
            { purchaseOrder: { id: contains(search) } },
            { purchaseOrder: { supplier: { name: contains(search) } } },
            { supplierInvoice: { invoiceNumber: contains(search) } },
          ],
        },
        include: {
          salesOrder: { include: { customer: true } },
          purchaseOrder: { include: { supplier: true } },
          supplierInvoice: { include: { supplier: true } },
        },
        orderBy: { paymentDate: "desc" },
        take: 6,
      }),
    ]);

    response.json({
      products,
      customers,
      suppliers,
      invoices,
      supplierInvoices,
      salesOrders,
      purchaseOrders,
      payments,
    });
  }),
);
