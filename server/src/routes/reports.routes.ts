import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { customReportSchema, reportQuerySchema, idParamSchema, listQuerySchema } from "../schemas/domain";
import {
  getApAgingReport,
  getApAgingSummary,
  getAraAgingReport,
  getArAgingSummary,
  getBalanceSheet,
  getCashFlow,
  getProfitAndLoss,
  getSalesTrend,
  getPurchaseOrderSummary,
  getAuditReport,
  getOutstandingReceivables,
  getStockMovements,
  getTaxSummary,
  getTrialBalance,
} from "../services/report.service";
import { getCustomerLedger } from "../modules/ar-ledger/ar-ledger.service";
import { toNumber } from "../utils/number";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/api-error";
import { renderLedgerPdf } from "../lib/pdf/ar-statement.pdf";

import { getEntries, getMonthlySummary } from "../modules/vat-register/vat-register.service";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);
reportsRouter.use(requireRole(["ADMIN", "ACCOUNTANT", "SALES"]));

function inDateRange(date: Date, startDate?: Date, endDate?: Date) {
  if (startDate && date < startDate) return false;
  if (endDate && date > endDate) return false;
  return true;
}

type CustomReportEntity = "sales" | "inventory" | "customers" | "suppliers" | "finance";
type CustomReportBody = {
  entity: CustomReportEntity;
  fields: string[];
  filters: Record<string, unknown>;
  groupBy: string[];
};
type CustomReportRow = Record<string, unknown>;

function normalizeReportValue(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().toLowerCase();
  }

  if (typeof value === "object") {
    return JSON.stringify(value).toLowerCase();
  }

  return String(value).toLowerCase();
}

function applyCustomFilters(rows: CustomReportRow[], filters: Record<string, unknown>) {
  const filterEntries = Object.entries(filters).filter(([, value]) => normalizeReportValue(value) !== "");

  if (filterEntries.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    filterEntries.every(([field, expectedValue]) =>
      normalizeReportValue(row[field]).includes(normalizeReportValue(expectedValue)),
    ),
  );
}

function selectCustomFields(row: CustomReportRow, fields: string[]) {
  return fields.reduce<CustomReportRow>((selected, field) => {
    selected[field] = row[field] ?? null;
    return selected;
  }, {});
}

reportsRouter.get(
  "/sales",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as {
      startDate?: Date;
      endDate?: Date;
      groupBy?: string;
      customerType?: "RETAIL" | "SHOWROOM";
      salespersonId?: string;
      category?: string;
    };

    const orders = await prisma.salesOrder.findMany({
      where: {
        tenantId: request.user!.tenantId,
        status: { notIn: ["CANCELLED", "QUOTE"] },
        orderDate: {
          gte: query.startDate,
          lte: query.endDate,
        },
        customer: {
          type: query.customerType,
        },
        salespersonId: query.salespersonId,
      },
      include: {
        customer: true,
        salesperson: true,
        lineItems: {
          include: {
            productVariant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    const rows = orders.flatMap((order) =>
      order.lineItems
        .filter((line) => inDateRange(order.orderDate, query.startDate, query.endDate))
        .filter((line) => !query.category || (line.productVariant && line.productVariant.product.category === query.category))
        .map((line) => {
          const lineRevenue = line.quantity * toNumber(line.unitPrice);
          const discAmt = line.discountAmount
            ? toNumber(line.discountAmount)
            : lineRevenue * (toNumber(line.discountPct) / 100);
          const revenue = lineRevenue - discAmt;
          return {
            date: order.orderDate,
            customer: order.customer.name,
            customerType: order.customer.type,
            salesperson: order.salesperson?.name ?? "Unassigned",
            product: line.productVariant ? line.productVariant.product.name : line.customProductName || "Custom Item",
            variant: line.productVariant ? line.productVariant.variantName : "N/A",
            category: line.productVariant ? line.productVariant.product.category : "Custom",
            quantity: line.quantity,
            unitPrice: toNumber(line.unitPrice),
            discountAmount: discAmt,
            revenue,
          };
        }),
    );

    response.json({
      rows,
      exportFormats: ["pdf", "csv"],
      groupBy: query.groupBy ?? "product",
    });
  }),
);

reportsRouter.get(
  "/inventory",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const [variants, recentSales] = await Promise.all([
      prisma.productVariant.findMany({
        where: { tenantId: request.user!.tenantId },
        include: {
          product: true,
          inventoryItems: {
            include: {
              warehouse: true,
            },
          },
        },
      }),
      prisma.salesOrderLineItem.findMany({
        where: {
          tenantId: request.user!.tenantId,
          salesOrder: {
            orderDate: {
              gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        },
        select: {
          productVariantId: true,
        },
      }),
    ]);

    const recentVariantIds = new Set(recentSales.map((item) => item.productVariantId));

    response.json({
      currentStock: variants.map((variant) => ({
        id: variant.id,
        product: variant.product.name,
        variant: variant.variantName,
        category: variant.product.category,
        quantity: variant.stockQuantity,
        overstock: variant.stockQuantity > variant.product.lowStockThreshold * 3,
        slowMoving: !recentVariantIds.has(variant.id),
      })),
      exportFormats: ["pdf", "csv"],
    });
  }),
);

reportsRouter.get(
  "/margin",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const lineItems = await prisma.salesOrderLineItem.findMany({
      where: {
        tenantId: request.user!.tenantId,
        salesOrder: {
          status: { notIn: ["CANCELLED", "QUOTE"] },
        },
      },
      include: {
        productVariant: {
          include: {
            product: true,
          },
        },
        salesOrder: true,
      },
    });

    const rows = lineItems.map((line) => {
      const lineRevenue = line.quantity * toNumber(line.unitPrice);
      const discAmt = line.discountAmount
        ? toNumber(line.discountAmount)
        : lineRevenue * (toNumber(line.discountPct) / 100);
      const revenue = lineRevenue - discAmt;
      const cost =
        line.quantity *
        (line.productVariant
          ? (toNumber(line.productVariant.product.costPrice) + toNumber(line.productVariant.additionalCost))
          : toNumber(line.unitPrice) * 0.7);

      return {
        sku: line.productVariant ? line.productVariant.skuVariant : "CUSTOM",
        product: line.productVariant ? line.productVariant.product.name : line.customProductName || "Custom Item",
        category: line.productVariant ? line.productVariant.product.category : "Custom",
        revenue,
        cost,
        grossMargin: revenue - cost,
        marginPct: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0,
      };
    });

    response.json({
      rows,
      overall: rows.reduce((sum, row) => sum + row.grossMargin, 0),
      exportFormats: ["pdf", "csv"],
    });
  }),
);

reportsRouter.get(
  "/suppliers",
  asyncHandler(async (request, response) => {
    const suppliers = await prisma.supplier.findMany({
      where: { tenantId: request.user!.tenantId },
      include: {
        purchaseOrders: {
          include: {
            goodsReceipts: true,
          },
        },
      },
    });

    response.json({
      rows: suppliers.map((supplier) => {
        const receipts = supplier.purchaseOrders.flatMap((po) => po.goodsReceipts);
        const onTime = receipts.filter((receipt) => {
          const po = supplier.purchaseOrders.find((item) => item.id === receipt.purchaseOrderId);
          return po?.expectedDelivery ? receipt.receivedDate <= po.expectedDelivery : true;
        });

        return {
          supplier: supplier.name,
          spend: supplier.purchaseOrders.reduce((sum, po) => sum + toNumber(po.totalAmount), 0),
          purchaseOrders: supplier.purchaseOrders.length,
          onTimeRate: receipts.length === 0 ? 0 : (onTime.length / receipts.length) * 100,
        };
      }),
      exportFormats: ["pdf", "csv"],
    });
  }),
);

reportsRouter.get(
  "/customers",
  asyncHandler(async (request, response) => {
    const customers = await prisma.customer.findMany({
      where: { tenantId: request.user!.tenantId },
      include: {
        salesOrders: {
          where: {
            status: { not: "CANCELLED" },
          },
          include: {
            taxInvoices: true,
            lineItems: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    response.json({
      topCustomers: customers
        .map((customer) => ({
          customer: customer.name,
          revenue: (customer as any).salesOrders.reduce((sum: number, order: any) => {
            return sum + toNumber(order.orderAmount);
          }, 0),
        }))
        .sort((left, right) => right.revenue - left.revenue)
        .slice(0, 10),
      atRisk: (await getAraAgingReport(request.user!.tenantId)).filter((row) => row.bucket !== "0-30"),
      lifecycle: {
        newCustomers: customers.filter(
          (customer) =>
            customer.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        ).length,
        returningCustomers: customers.filter((customer) => customer.salesOrders.length > 1).length,
      },
      exportFormats: ["pdf", "csv"],
    });
  }),
);

reportsRouter.get(
  "/financial-summary",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };

    response.json({
      profitAndLoss: await getProfitAndLoss(request.user!.tenantId, query.startDate, query.endDate),
      balanceSheet: await getBalanceSheet(request.user!.tenantId),
      cashFlow: await getCashFlow(request.user!.tenantId, query.startDate, query.endDate),
      arAging: await getAraAgingReport(request.user!.tenantId),
      apAging: await getApAgingReport(request.user!.tenantId),
      exportFormats: ["pdf", "csv"],
    });
  }),
);

reportsRouter.get(
  "/trial-balance",
  asyncHandler(async (request, response) => {
    response.json(await getTrialBalance(request.user!.tenantId));
  }),
);

reportsRouter.get(
  "/tax-summary",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    response.json(await getTaxSummary(request.user!.tenantId, query.startDate, query.endDate));
  }),
);

reportsRouter.get(
  "/ar-aging",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    const aging = await getArAgingSummary(request.user!.tenantId, query.startDate, query.endDate);
    response.json({ rows: aging, exportFormats: ["csv"] });
  }),
);

reportsRouter.get(
  "/ap-aging",
  asyncHandler(async (request, response) => {
    const aging = await getApAgingSummary(request.user!.tenantId);
    response.json({ rows: aging, exportFormats: ["csv"] });
  }),
);

reportsRouter.get(
  "/outstanding-receivables",
  asyncHandler(async (request, response) => {
    const receivables = await getOutstandingReceivables(request.user!.tenantId);
    response.json({ rows: receivables, exportFormats: ["csv"] });
  }),
);

reportsRouter.get(
  "/sales-trend",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { 
      startDate?: Date; 
      endDate?: Date; 
      groupBy?: 'month' | 'salesperson' | 'category';
    };
    const trend = await getSalesTrend(
      request.user!.tenantId, 
      query.startDate, 
      query.endDate, 
      query.groupBy || 'month'
    );
    response.json({ rows: trend, exportFormats: ["csv"] });
  }),
);

reportsRouter.get(
  "/purchase-orders",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    const summary = await getPurchaseOrderSummary(request.user!.tenantId, query.startDate, query.endDate);
    response.json({ ...summary, exportFormats: ["csv"] });
  }),
);

reportsRouter.get(
  "/inventory-valuation",
  asyncHandler(async (request, response) => {
    // Proxy to existing inventory valuation endpoint - use same logic for consistency
    const valuation = await prisma.productVariant.findMany({
      where: { tenantId: request.user!.tenantId },
      include: {
        product: true,
        inventoryItems: { include: { warehouse: true } },
      },
    });

    const rows = valuation.map(variant => {
      const baseCost = toNumber(variant.product.costPrice);
      const extra = toNumber(variant.additionalCost);
      const totalQty = variant.inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
      const unitCost = baseCost + extra;
      const totalValue = totalQty * unitCost;
      
      return {
        product: variant.product.name,
        variant: variant.variantName,
        sku: variant.skuVariant,
        category: variant.product.category,
        totalQty,
        unitCost,
        totalValue,
        method: "weighted_average",
        warehouseBreakdown: variant.inventoryItems.map(item => ({
          warehouse: item.warehouse.name,
          quantity: item.quantity,
          value: item.quantity * unitCost,
        })),
      };
    });

    // Calculate total valuation across all variants (not just this page)
    const allVariants = await prisma.productVariant.findMany({
      where: { tenantId: request.user!.tenantId },
      select: {
        stockQuantity: true,
        additionalCost: true,
        product: { select: { costPrice: true } },
      },
    });

    const grandTotal = allVariants.reduce((sum, v) => {
      const uc = toNumber(v.product.costPrice) + toNumber(v.additionalCost);
      return sum + uc * v.stockQuantity;
    }, 0);

    response.json({ rows, grandTotal, exportFormats: ["csv"] });
  }),
);

reportsRouter.get(
  "/audit-log",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { 
      page?: number; 
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      action?: string;
      entityType?: string;
    };
    
    const report = await getAuditReport(request.user!.tenantId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      action: query.action,
      entityType: query.entityType,
      page: query.page,
      pageSize: query.pageSize,
    });
    response.json(report);
  }),
);

reportsRouter.get(
  "/stock-movements",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { 
      page?: number; 
      pageSize?: number;
      startDate?: string;
      endDate?: string;
      productVariantId?: string;
      warehouseId?: string;
      type?: string;
    };
    
    const report = await getStockMovements(request.user!.tenantId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      productVariantId: query.productVariantId,
      warehouseId: query.warehouseId,
      type: query.type,
      page: query.page,
      pageSize: query.pageSize,
    });
    response.json(report);
  }),
);

reportsRouter.get(
  "/vat-summary",
  asyncHandler(async (request, response) => {
    const fiscalYear = String(request.query.fiscalYear);
    if (!fiscalYear) throw new ApiError(400, "Fiscal year is required");
    const summary = await getMonthlySummary(request.user!.tenantId, fiscalYear);
    response.json(summary);
  }),
);

reportsRouter.get(
  "/vat-entries",
  asyncHandler(async (request, response) => {
    const fiscalYear = request.query.fiscalYear as string;
    if (!fiscalYear) throw new ApiError(400, "Fiscal year is required");
    const month = request.query.month as string | undefined;
    const entries = await getEntries(request.user!.tenantId, fiscalYear, month);
    response.json(entries);
  }),
);

reportsRouter.post(
  "/custom-builder",
  validate(customReportSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as CustomReportBody;
    const selectedFields = [...new Set(body.fields)];

    const [salesRows, inventoryRows, customerRows, supplierRows, financeRows] = await Promise.all([
      prisma.salesOrder.findMany({
        where: { tenantId: request.user!.tenantId },
        include: {
          customer: true,
          salesperson: true,
          taxInvoices: true,
          lineItems: true,
        },
        orderBy: {
          orderDate: "desc",
        },
      }),
      prisma.inventory.findMany({
        where: { tenantId: request.user!.tenantId },
        include: {
          warehouse: true,
          productVariant: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.customer.findMany({
        where: { tenantId: request.user!.tenantId },
        include: {
          salesOrders: {
            include: {
              taxInvoices: true,
              lineItems: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.supplier.findMany({
        where: { tenantId: request.user!.tenantId },
        include: {
          purchaseOrders: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.journalEntry.findMany({
        where: { tenantId: request.user!.tenantId },
        include: {
          lines: true,
        },
        orderBy: {
          date: "desc",
        },
      }),
    ]);

    const datasets: Record<CustomReportEntity, CustomReportRow[]> = {
      sales: salesRows.map((order) => {
        const subtotal = (order as any).lineItems.reduce((sum: number, lineItem: any) => {
          const lineTotal = lineItem.quantity * toNumber(lineItem.unitPrice);
          return sum + (lineTotal - lineTotal * (toNumber(lineItem.discountPct) / 100));
        }, 0);
        const total = toNumber(order.orderAmount);

        return {
          orderId: order.id,
          customer: order.customer.name,
          customerType: order.customer.type,
          status: order.status,
          salesperson: order.salesperson?.name ?? "Unassigned",
          total,
          balanceDue: toNumber(order.balanceDue),
          depositAmount: toNumber(order.depositAmount),
          orderDate: order.orderDate,
          deliveryDate: order.deliveryDate,
          invoiceStatus: null, // Optional tracking
          lineItems: order.lineItems.length,
        };
      }),
      inventory: inventoryRows.map((item) => ({
        inventoryId: item.id,
        product: item.productVariant.product.name,
        sku: item.productVariant.skuVariant,
        variant: item.productVariant.variantName,
        warehouse: item.warehouse.name,
        quantity: item.quantity,
        status: item.status,
        serialNumber: item.serialNumber,
        createdAt: item.createdAt,
      })),
      customers: customerRows.map((customer) => ({
        customer: customer.name,
        type: customer.type,
        email: customer.email,
        phone: customer.phone,
        creditLimit: toNumber(customer.creditLimit),
        outstandingBalance: toNumber(customer.outstandingBalance),
        lifetimeRevenue: (customer as any).salesOrders.reduce((sum: number, order: any) => {
          return sum + toNumber(order.orderAmount);
        }, 0),
        orderCount: customer.salesOrders.length,
        address: customer.address,
        createdAt: customer.createdAt,
      })),
      suppliers: supplierRows.map((supplier) => ({
        supplier: supplier.name,
        contact: supplier.contact,
        email: supplier.email,
        phone: supplier.phone,
        country: supplier.country,
        paymentTerms: supplier.paymentTerms,
        leadTimeDays: supplier.leadTimeDays,
        rating: supplier.rating ? toNumber(supplier.rating) : null,
        totalSpend: supplier.purchaseOrders.reduce((sum, order) => {
          return sum + toNumber(order.totalAmount);
        }, 0),
        purchaseOrders: supplier.purchaseOrders.length,
        createdAt: supplier.createdAt,
      })),
      finance: financeRows.map((entry) => ({
        entryId: entry.id,
        date: entry.date,
        description: entry.description,
        reference: entry.reference,
        sourceType: entry.sourceType,
        sourceId: entry.sourceId,
        lineCount: entry.lines.length,
        totalDebits: entry.lines.reduce((sum, line) => sum + toNumber(line.debit), 0),
        totalCredits: entry.lines.reduce((sum, line) => sum + toNumber(line.credit), 0),
        createdAt: entry.createdAt,
      })),
    };

    const filteredRows = applyCustomFilters(datasets[body.entity], body.filters);

    response.json({
      entity: body.entity,
      fields: selectedFields,
      filters: body.filters,
      groupBy: body.groupBy,
      totalRows: filteredRows.length,
      preview: filteredRows.slice(0, 25).map((row) => selectCustomFields(row, selectedFields)),
      exportFormats: ["pdf", "csv"],
    });
  }),
);
// Removed redundant /customer-ledger/:id as it's now in accounting.routes.ts


reportsRouter.get("/customer-ledger/:id/pdf", asyncHandler(async (request, response) => {
  // Check if authenticated or has a valid download token
  let userId = request.user?.id;
  let tenantId = request.user?.tenantId;
  const token = request.query.token as string;
  
  if (!userId && token) {
    try {
      const decoded = verifyToken(token);
      if (decoded.purpose === "download") {
        userId = decoded.sub;
        const u = await prisma.user.findUnique({ where: { id: decoded.sub } });
        tenantId = u?.tenantId;
      }
    } catch (err) {
      throw new ApiError(401, "Invalid or expired download token");
    }
  }

  if (!userId || !tenantId) {
    throw new ApiError(401, "Unauthorized");
  }

  try {
    const { id } = idParamSchema.parse(request.params);
    const { startDate, endDate } = listQuerySchema.parse(request.query);

    const [customer, ledger, company] = await Promise.all([
      prisma.customer.findFirst({ where: { id, tenantId } }),
      getCustomerLedger(tenantId, id, startDate, endDate),
      prisma.companyProfile.findFirst({ where: { tenantId } }),
    ]);

    if (!customer) {
      return response.status(404).json({ error: "Customer not found" });
    }

    const pdfStream = await renderLedgerPdf({
      customer,
      ledger: ledger.entries,
      openingBalance: ledger.openingBalance,
      company: company || {
        name: process.env.COMPANY_NAME || "ERP System",
        address: "",
        taxNumber: "",
        bankDetails: "",
      },
      period: {
        start: startDate,
        end: endDate,
      },
    });

    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Content-Disposition", `attachment; filename=ledger_${customer.name.replace(/\s+/g, "_")}.pdf`);
    pdfStream.pipe(response);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    response.status(500).json({ error: "Failed to generate PDF" });
  }
}));

export default reportsRouter;
