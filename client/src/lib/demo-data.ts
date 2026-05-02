import type {
  DashboardPayload,
  DeliveryRow,
  TaxInvoiceRow,
  ProductRow,
  ReportCard,
  SalesOrderRow,
  SupplierRow,
} from "@/types/domain";

export const dashboardData: DashboardPayload = {
  kpis: [
    { label: "Revenue (MTD)", value: "NPR 184,200", change: "+12.4%", tone: "positive" },
    { label: "Outstanding AR", value: "NPR 46,900", change: "14 invoices", tone: "neutral" },
    { label: "Inventory Value", value: "NPR 322,500", change: "+4.8%", tone: "positive" },
    { label: "Pending Deliveries", value: "18", change: "6 today", tone: "neutral" },
    { label: "Low Stock Items", value: "9", change: "3 urgent", tone: "negative" },
    { label: "Net Profit (MTD)", value: "NPR 41,780", change: "+7.1%", tone: "positive" },
  ],
  revenueVsCogs: [
    { month: "Baisakh", revenue: 128000, cogs: 74000 },
    { month: "Jestha", revenue: 141000, cogs: 79000 },
    { month: "Ashadh", revenue: 134000, cogs: 76000 },
    { month: "Shrawan", revenue: 149000, cogs: 88000 },
    { month: "Bhadra", revenue: 162000, cogs: 93000 },
    { month: "Ashwin", revenue: 171000, cogs: 97000 },
    { month: "Kartik", revenue: 158000, cogs: 91000 },
    { month: "Mangsir", revenue: 176000, cogs: 102000 },
    { month: "Poush", revenue: 198000, cogs: 118000 },
    { month: "Magh", revenue: 169000, cogs: 94000 },
    { month: "Falgun", revenue: 178000, cogs: 102000 },
    { month: "Chaitra", revenue: 184000, cogs: 108000 },
  ],
  cashFlow: [
    { month: "Kartik", inflow: 122000, outflow: 80000 },
    { month: "Mangsir", inflow: 136000, outflow: 91000 },
    { month: "Poush", inflow: 152000, outflow: 98000 },
    { month: "Magh", inflow: 128000, outflow: 86000 },
    { month: "Falgun", inflow: 144000, outflow: 93000 },
    { month: "Chaitra", inflow: 151000, outflow: 95800 },
  ],
  topProducts: [
    { name: "Monarch Sofa / Walnut Large", quantity: 86 },
    { name: "Aster Dining Set / 6 Seat Oak", quantity: 74 },
    { name: "Vela Executive Desk / Matte Black", quantity: 65 },
    { name: "Harbor Outdoor Lounge / Teak", quantity: 54 },
    { name: "Luna Bed Frame / Queen", quantity: 48 },
  ],
  recentSalesOrders: [
    { id: "SO-2026-0038", customer: "Evergreen Homes", status: "Out for Delivery", deliveryDate: "2026-03-22", total: 8600 },
    { id: "SO-2026-0037", customer: "Mia Thompson", status: "Deposit Paid", deliveryDate: "2026-03-24", total: 3200 },
    { id: "SO-2026-0036", customer: "Urban Nest Studio", status: "Confirmed", deliveryDate: "2026-03-26", total: 12940 },
    { id: "SO-2026-0035", customer: "Cedar Lane Hotels", status: "Delivered", deliveryDate: "2026-03-19", total: 21450 },
  ],
  lowStockItems: [
    { id: "ls1", product: "Luna Bed Frame", variant: "Queen", quantity: 4 },
    { id: "ls2", product: "Aster Dining Set", variant: "6 Seat Oak", quantity: 6 },
    { id: "ls3", product: "Harbor Lounge Chair", variant: "Teak", quantity: 2 },
  ],
};

export const inventoryProducts: ProductRow[] = ([
  { id: "p1", name: "Monarch Sofa", sku: "SOF-MON-001", category: "Sofa", material: "Walnut / Linen", status: "Active", stock: 14, margin: 38, valuation: 7840 },
  { id: "p2", name: "Aster Dining Set", sku: "DIN-AST-002", category: "Dining", material: "Oak / Stone", status: "Active", stock: 6, margin: 32, valuation: 3360 },
  { id: "p3", name: "Luna Bed Frame", sku: "BED-LUN-003", category: "Bedroom", material: "Ash / Upholstered", status: "Active", stock: 4, margin: 35, valuation: 2240 },
  { id: "p4", name: "Vela Executive Desk", sku: "OFF-VEL-004", category: "Office", material: "Steel / Walnut", status: "Active", stock: 9, margin: 41, valuation: 5040 },
  { id: "p5", name: "Harbor Lounge Chair", sku: "OUT-HAR-005", category: "Outdoor", material: "Teak / Rope", status: "Discontinued", stock: 2, margin: 28, valuation: 1120 },
] as any[]);

export const suppliers: SupplierRow[] = [
  { id: "sup1", name: "Kathmandu Woodcraft", country: "Nepal", leadTime: "8 days", onTimeRate: "95%", spend: 48200 },
  { id: "sup2", name: "Oak & Iron Imports", country: "India", leadTime: "14 days", onTimeRate: "89%", spend: 71600 },
  { id: "sup3", name: "Pacific Foam Works", country: "China", leadTime: "21 days", onTimeRate: "83%", spend: 39800 },
];

export const salesOrders: SalesOrderRow[] = ([
  { id: "SO-2026-0038", customer: "Evergreen Homes", status: "Out for Delivery", deliveryDate: "2026-03-22", balanceDue: 4200 },
  { id: "SO-2026-0037", customer: "Mia Thompson", status: "Deposit Paid", deliveryDate: "2026-03-24", balanceDue: 2100 },
  { id: "SO-2026-0036", customer: "Urban Nest Studio", status: "Confirmed", deliveryDate: "2026-03-26", balanceDue: 12940 },
  { id: "SO-2026-0035", customer: "Cedar Lane Hotels", status: "Delivered", deliveryDate: "2026-03-19", balanceDue: 0 },
] as any[]);

export const invoices: TaxInvoiceRow[] = ([
  { id: "inv1", invoiceNumber: "INV-2026-0007", customer: "Evergreen Homes", status: "Sent", dueDate: "2026-03-28", amount: 8600, balance: 4200 },
  { id: "inv2", invoiceNumber: "INV-2026-0006", customer: "Mia Thompson", status: "Partially Paid", dueDate: "2026-03-29", amount: 3200, balance: 2100 },
  { id: "inv3", invoiceNumber: "INV-2026-0005", customer: "Cedar Lane Hotels", status: "Paid", dueDate: "2026-03-17", amount: 21450, balance: 0 },
] as any[]);

export const deliveries: DeliveryRow[] = ([
  { id: "DL-101", customer: "Evergreen Homes", driver: "Sanjay Driver", status: "Scheduled", scheduledDate: "2026-03-22", route: "Lalitpur / Ring Road" },
  { id: "DL-102", customer: "Mia Thompson", driver: "Sanjay Driver", status: "Out for Delivery", scheduledDate: "2026-03-21", route: "Bhaktapur / Suryabinayak" },
  { id: "DL-103", customer: "Cedar Lane Hotels", driver: "Priya Transport", status: "Delivered", scheduledDate: "2026-03-19", route: "Pokhara / Lakeside" },
] as any[]);

export const reportCatalog: ReportCard[] = [
  {
    id: "sales",
    title: "Sales Report",
    description: "Slice performance by product, category, salesperson, date range, and customer type.",
    exportLabel: "PDF / CSV",
    summary: "Sales reporting scaffold",
    detail: "Static fallback catalog entry",
  },
  {
    id: "inventory",
    title: "Inventory Report",
    description: "Monitor current stock, slow movers, overstock, and warehouse availability.",
    exportLabel: "PDF / CSV",
    summary: "Inventory reporting scaffold",
    detail: "Static fallback catalog entry",
  },
  {
    id: "margin",
    title: "Gross Margin Report",
    description: "Track profitability per SKU, category, and across the whole business.",
    exportLabel: "PDF / CSV",
    summary: "Margin reporting scaffold",
    detail: "Static fallback catalog entry",
  },
  {
    id: "financial-summary",
    title: "Financial Summary",
    description: "Consolidated P&L, Balance Sheet, Cash Flow, AR aging, and AP aging.",
    exportLabel: "PDF / CSV",
    summary: "Financial reporting scaffold",
    detail: "Static fallback catalog entry",
  },
];

export const lowStockItems = [
  { label: "Luna Bed Frame / Queen", quantity: 4, warehouse: "Main Showroom" },
  { label: "Aster Dining Set / 6 Seat Oak", quantity: 6, warehouse: "Storage Warehouse" },
  { label: "Harbor Lounge Chair / Teak", quantity: 2, warehouse: "Transit Hub" },
];

export const moduleHighlights = {
  purchasing: [
    "3-way match between PO, goods receipt, and supplier invoice",
    "Supplier scorecards with lead time and on-time delivery",
    "Receiving workflow with discrepancy tracking",
  ],
  sales: [
    "Quote-to-order conversion with deposit capture",
    "AR aging by customer segment",
    "Customer statements and order pipeline views",
  ],
  accounting: [
    "Auto-post journals for invoices and payments",
    "Bank reconciliation with CSV import",
    "Financial statements with comparison periods",
  ],
};
