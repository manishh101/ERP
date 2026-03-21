import { prisma } from "../config/prisma";
import { getProfitAndLoss } from "./report.service";
import { toNumber } from "../utils/number";
import NepaliDate from "nepali-datetime";

function startOfCurrentMonth() {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value);
}

export async function getDashboardSummary() {
  const monthStart = startOfCurrentMonth();

  const [invoices, inventoryItems, deliveries, lowStockItems, recentSalesOrders, salesOrders] =
    await Promise.all([
      prisma.taxInvoice.findMany({
        where: {
          issueDate: {
            gte: monthStart,
          },
        },
      }),
      prisma.inventory.findMany({
        include: {
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.delivery.count({
        where: {
          status: {
            in: ["SCHEDULED", "OUT_FOR_DELIVERY", "FAILED_ATTEMPT"],
          },
        },
      }),
      prisma.productVariant.findMany({
        where: {
          stockQuantity: {
            lte: 5,
          },
        },
        include: {
          product: true,
        },
        take: 10,
      }),
      prisma.salesOrder.findMany({
        include: {
          customer: true,
          lineItems: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),
      prisma.salesOrder.findMany({
        include: {
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
      }),
    ]);

  const totalRevenueMtd = invoices.reduce((sum, invoice) => sum + toNumber(invoice.invoiceAmount), 0);
  const outstandingAr = (
    await prisma.customer.aggregate({
      _sum: {
        outstandingBalance: true,
      },
    })
  );

  const inventoryValue = inventoryItems.reduce((sum, item) => {
    const baseCost = toNumber(item.productVariant.product.costPrice);
    const extra = toNumber(item.productVariant.additionalCost);
    return sum + item.quantity * (baseCost + extra);
  }, 0);

  const invoicePayments = await prisma.payment.findMany({
    where: {
      salesOrderId: {
        not: null,
      },
      paymentDate: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
      },
    },
  });

  const expenseRows = await prisma.expense.findMany({
    where: {
      date: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth() - 5, 1),
      },
    },
  });

  const revenueVsCogs = Array.from({ length: 12 }).map((_, index) => {
    const nd = new NepaliDate();
    // Backtrack to 11 months ago, then move forward by index
    // Simplified BS month iteration
    let m = nd.getMonth() - (11 - index);
    let y = nd.getYear();
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const bucketNd = new NepaliDate(y, m, 1);
    const label = bucketNd.format("MMMM");
    return {
      month: label,
      revenue: 0,
      cogs: 0,
    };
  });

  const cashFlowSeries = Array.from({ length: 6 }).map((_, index) => {
    const nd = new NepaliDate();
    let m = nd.getMonth() - (5 - index);
    let y = nd.getYear();
    while (m < 0) {
      m += 12;
      y -= 1;
    }
    const bucketNd = new NepaliDate(y, m, 1);
    const label = bucketNd.format("MMMM");
    return {
      month: label,
      inflow: 0,
      outflow: 0,
    };
  });

  salesOrders.forEach((order) => {
    const bucket = revenueVsCogs.find(
      (item) =>
        item.month === new NepaliDate(order.orderDate).format("MMMM"),
    );

    if (!bucket) {
      return;
    }

    order.lineItems.forEach((lineItem) => {
      const revenue = lineItem.quantity * toNumber(lineItem.unitPrice);
      const cogs =
        lineItem.quantity *
        (toNumber(lineItem.productVariant.product.costPrice) +
          toNumber(lineItem.productVariant.additionalCost));
      bucket.revenue += revenue;
      bucket.cogs += cogs;
    });
  });

  invoicePayments.forEach((payment) => {
    const bucket = cashFlowSeries.find(
      (item) =>
        item.month === new NepaliDate(payment.paymentDate).format("MMMM"),
    );

    if (bucket) {
      bucket.inflow += toNumber(payment.amount);
    }
  });

  expenseRows.forEach((expense) => {
    const bucket = cashFlowSeries.find(
      (item) =>
        item.month === new NepaliDate(expense.date).format("MMMM"),
    );

    if (bucket) {
      bucket.outflow += toNumber(expense.amount);
    }
  });

  const topProductMap = new Map<string, number>();
  salesOrders.forEach((order) => {
    order.lineItems.forEach((lineItem) => {
      const name = `${lineItem.productVariant.product.name} / ${lineItem.productVariant.variantName}`;
      topProductMap.set(name, (topProductMap.get(name) ?? 0) + lineItem.quantity);
    });
  });

  const topSellingProducts = [...topProductMap.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((left, right) => right.quantity - left.quantity)
    .slice(0, 10);

  const profitAndLoss = await getProfitAndLoss(monthStart, new Date());
  const outstandingArValue = toNumber(outstandingAr._sum.outstandingBalance ?? 0);
  const totalRevenueMtdValue = totalRevenueMtd;
  const netProfitValue = profitAndLoss.netProfit;

  return {
    kpis: [
      { label: "Revenue (MTD)", value: formatCurrency(totalRevenueMtdValue), change: "Live", tone: "positive" },
      { label: "Outstanding AR", value: formatCurrency(outstandingArValue), change: "Open invoices", tone: outstandingArValue > 0 ? "neutral" : "positive" },
      { label: "Inventory Value", value: formatCurrency(inventoryValue), change: "Weighted average", tone: "positive" },
      { label: "Pending Deliveries", value: String(deliveries), change: "Current queue", tone: deliveries > 0 ? "neutral" : "positive" },
      { label: "Low Stock Items", value: String(lowStockItems.length), change: "Threshold alerts", tone: lowStockItems.length > 0 ? "negative" : "positive" },
      { label: "Net Profit (MTD)", value: formatCurrency(netProfitValue), change: "Current month", tone: netProfitValue >= 0 ? "positive" : "negative" },
    ],
    revenueVsCogs,
    cashFlow: cashFlowSeries,
    topProducts: topSellingProducts,
    recentSalesOrders: recentSalesOrders.map((order) => ({
      id: order.id,
      customer: order.customer.name,
      status: order.status,
      deliveryDate: order.deliveryDate?.toISOString() ?? order.orderDate.toISOString(),
      total: order.lineItems.reduce((sum, item) => sum + item.quantity * toNumber(item.unitPrice), 0),
    })),
    lowStockItems: lowStockItems.map((variant) => ({
      id: variant.id,
      product: variant.product.name,
      variant: variant.variantName,
      quantity: variant.stockQuantity,
    })),
  };
}
