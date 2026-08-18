import {
  InvoiceStatus,
  PaymentMethod,
  PurchaseOrderStatus,
  SalesOrderStatus,
  SupplierInvoiceStatus,
} from "@prisma/client";
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
    const documentSearch = search.replace(/^(po|so|payment|pay)[-\s#:]+/i, "").trim();
    const idSearches = Array.from(new Set([search, documentSearch].filter(Boolean)));
    const normalizedEnumSearch = search.toUpperCase().replace(/[\s-]+/g, "_");
    const contains = (value: string) => ({
      contains: value,
      mode: "insensitive" as const,
    });
    const enumMatch = <T extends Record<string, string>>(source: T): T[keyof T] | undefined =>
      Object.values(source).find((value) => value === normalizedEnumSearch) as T[keyof T] | undefined;
    const invoiceStatus = enumMatch(InvoiceStatus) as InvoiceStatus | undefined;
    const paymentMethod = enumMatch(PaymentMethod) as PaymentMethod | undefined;
    const purchaseOrderStatus = enumMatch(PurchaseOrderStatus) as PurchaseOrderStatus | undefined;
    const salesOrderStatus = enumMatch(SalesOrderStatus) as SalesOrderStatus | undefined;
    const supplierInvoiceStatus = enumMatch(SupplierInvoiceStatus) as SupplierInvoiceStatus | undefined;

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
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          material: true,
          sellingPrice: true,
          variants: { select: { variantName: true, skuVariant: true }, take: 2 },
        },
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
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          type: true,
          outstandingBalance: true,
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
        select: {
          id: true,
          name: true,
          contact: true,
          email: true,
          phone: true,
          country: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.taxInvoice.findMany({
        where: {
          tenantId,
          OR: [
            ...idSearches.map((term) => ({ id: contains(term) })),
            ...(invoiceStatus ? [{ status: invoiceStatus }] : []),
            { invoiceNumber: contains(search) },
            { bsDate: contains(search) },
            ...idSearches.map((term) => ({ salesOrder: { id: contains(term) } })),
            { salesOrder: { customer: { name: contains(search) } } },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          invoiceAmount: true,
          bsDate: true,
          salesOrder: { select: { id: true, customer: { select: { name: true } } } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.supplierInvoice.findMany({
        where: {
          tenantId,
          OR: [
            ...idSearches.map((term) => ({ id: contains(term) })),
            ...(supplierInvoiceStatus ? [{ status: supplierInvoiceStatus }] : []),
            { invoiceNumber: contains(search) },
            { supplier: { name: contains(search) } },
            ...idSearches.map((term) => ({ purchaseOrder: { id: contains(term) } })),
            { notes: contains(search) },
          ],
        },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          supplier: { select: { id: true, name: true } },
          purchaseOrder: { select: { id: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.salesOrder.findMany({
        where: {
          tenantId,
          OR: [
            ...idSearches.map((term) => ({ id: contains(term) })),
            ...(salesOrderStatus ? [{ status: salesOrderStatus }] : []),
            { bsDate: contains(search) },
            { customer: { name: contains(search) } },
            { notes: contains(search) },
            { lineItems: { some: { customProductName: contains(search) } } },
            { lineItems: { some: { productVariant: { variantName: contains(search) } } } },
            { lineItems: { some: { productVariant: { skuVariant: contains(search) } } } },
            { lineItems: { some: { productVariant: { product: { name: contains(search) } } } } },
          ],
        },
        select: {
          id: true,
          status: true,
          orderAmount: true,
          balanceDue: true,
          bsDate: true,
          customer: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.purchaseOrder.findMany({
        where: {
          tenantId,
          OR: [
            ...idSearches.map((term) => ({ id: contains(term) })),
            ...(purchaseOrderStatus ? [{ status: purchaseOrderStatus }] : []),
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
        select: {
          id: true,
          status: true,
          totalAmount: true,
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
      }),
      prisma.payment.findMany({
        where: {
          tenantId,
          OR: [
            ...idSearches.map((term) => ({ id: contains(term) })),
            ...(paymentMethod ? [{ method: paymentMethod }] : []),
            { reference: contains(search) },
            { note: contains(search) },
            { bsDate: contains(search) },
            ...idSearches.map((term) => ({ salesOrder: { id: contains(term) } })),
            { salesOrder: { customer: { name: contains(search) } } },
            ...idSearches.map((term) => ({ purchaseOrder: { id: contains(term) } })),
            { purchaseOrder: { supplier: { name: contains(search) } } },
            { supplierInvoice: { invoiceNumber: contains(search) } },
          ],
        },
        select: {
          id: true,
          amount: true,
          method: true,
          reference: true,
          bsDate: true,
          salesOrder: { select: { id: true, customer: { select: { name: true } } } },
          purchaseOrder: { select: { id: true, supplier: { select: { name: true } } } },
          supplierInvoice: { select: { invoiceNumber: true, supplier: { select: { name: true } } } },
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
