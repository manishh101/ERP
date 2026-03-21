import bcrypt from "bcryptjs";
import { PrismaClient, type AccountType, type CustomerType, type UserRole } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = "Password123!";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function resetDatabase() {
  await prisma.bankStatementLine.deleteMany();
  await prisma.bankStatementImport.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.salesOrderLineItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.goodsReceiptLine.deleteMany();
  await prisma.goodsReceipt.deleteMany();
  await prisma.supplierInvoice.deleteMany();
  await prisma.purchaseOrderLineItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.account.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.currencySetting.deleteMany();
  await prisma.notificationSetting.deleteMany();
  await prisma.invoiceTemplate.deleteMany();
  await prisma.user.deleteMany();
}

async function createBalancedEntry(input: {
  date: Date;
  description: string;
  reference?: string;
  sourceType?: string;
  sourceId?: string;
  createdById?: string;
  lines: Array<{ accountId: string; debit: number; credit: number; type: AccountType }>;
}) {
  const entry = await prisma.journalEntry.create({
    data: {
      date: input.date,
      description: input.description,
      reference: input.reference,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      createdById: input.createdById,
      lines: {
        create: input.lines.map((line) => ({
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
        })),
      },
    },
  });

  for (const line of input.lines) {
    const delta =
      line.type === "ASSET" || line.type === "EXPENSE"
        ? line.debit - line.credit
        : line.credit - line.debit;

    await prisma.account.update({
      where: { id: line.accountId },
      data: {
        balance: {
          increment: delta,
        },
      },
    });
  }

  return entry;
}

async function main() {
  await resetDatabase();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const users = {
    admin: await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@atlaserp.local",
        passwordHash,
        role: "ADMIN",
      },
    }),
    accountant: await prisma.user.create({
      data: {
        name: "Asha Ledger",
        email: "accountant@atlaserp.local",
        passwordHash,
        role: "ACCOUNTANT",
      },
    }),
    sales: await prisma.user.create({
      data: {
        name: "Ravi Sales",
        email: "sales@atlaserp.local",
        passwordHash,
        role: "SALES",
      },
    }),
    warehouse: await prisma.user.create({
      data: {
        name: "Kiran Store",
        email: "warehouse@atlaserp.local",
        passwordHash,
        role: "WAREHOUSE",
      },
    }),
    driver: await prisma.user.create({
      data: {
        name: "Sanjay Driver",
        email: "driver@atlaserp.local",
        passwordHash,
        role: "DRIVER",
      },
    }),
  } satisfies Record<string, { id: string; email: string; role: UserRole }>;

  await prisma.companyProfile.create({
    data: {
      name: "Manish Steel",
      address: "Baluwatar, Kathmandu, Nepal",
      taxNumber: "VAT-NEP-0148",
      bankDetails: "Bank of Kathmandu · A/C 0100012345 · SWIFT BOKLNPKA",
      email: "accounts@atlasfurniture.local",
      phone: "+977-1-5551234",
    },
  });

  await prisma.currencySetting.create({
    data: {
      baseCurrency: "USD",
      supportedCurrencies: ["USD", "NPR", "INR"],
      multiCurrencyEnabled: true,
    },
  });

  await prisma.notificationSetting.create({
    data: {
      overdueInvoiceDays: [7, 14, 30],
      lowStockEnabled: true,
      deliveryUpdatesEnabled: true,
      emailEnabled: true,
    },
  });

  await prisma.invoiceTemplate.create({
    data: {
      primaryColor: "#7c5c45",
      footerText: "Handcrafted furniture, professionally delivered.",
      paymentTerms: "50% deposit on confirmation, balance due before delivery.",
    },
  });

  const taxRates = {
    standard: await prisma.taxRate.create({
      data: {
        name: "Standard VAT",
        category: "General",
        rate: 13,
        isDefault: true,
      },
    }),
    outdoor: await prisma.taxRate.create({
      data: {
        name: "Outdoor VAT",
        category: "Outdoor",
        rate: 10,
        productCategory: "Outdoor",
      },
    }),
  };

  const warehouses = {
    showroom: await prisma.warehouse.create({
      data: {
        name: "Main Showroom",
        location: "Jawalakhel, Lalitpur",
        type: "SHOWROOM",
      },
    }),
    storage: await prisma.warehouse.create({
      data: {
        name: "Storage Warehouse",
        location: "Bhaktapur Industrial Estate",
        type: "STORAGE",
      },
    }),
    transit: await prisma.warehouse.create({
      data: {
        name: "Transit Hub",
        location: "Kalanki Distribution Point",
        type: "TRANSIT",
      },
    }),
  };

  const accountDefinitions = [
    { code: "1000", name: "Cash at Bank", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Inventory", type: "ASSET" },
    { code: "1300", name: "Input Tax Recoverable", type: "ASSET" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2100", name: "Output Tax Payable", type: "LIABILITY" },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "4000", name: "Sales Revenue", type: "INCOME" },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
    { code: "6100", name: "Operating Expense", type: "EXPENSE" },
    { code: "6200", name: "Delivery Expense", type: "EXPENSE" },
  ] as const;

  const accountMap = new Map<string, { id: string; type: AccountType }>();

  for (const definition of accountDefinitions) {
    const account = await prisma.account.create({
      data: {
        code: definition.code,
        name: definition.name,
        type: definition.type,
        balance: 0,
      },
    });

    accountMap.set(definition.code, { id: account.id, type: account.type });
  }

  await createBalancedEntry({
    date: daysAgo(90),
    description: "Opening balances",
    reference: "OPEN-2026",
    sourceType: "opening_balance",
    createdById: users.accountant.id,
    lines: [
      { accountId: accountMap.get("1000")!.id, debit: 125000, credit: 0, type: accountMap.get("1000")!.type },
      { accountId: accountMap.get("1200")!.id, debit: 245000, credit: 0, type: accountMap.get("1200")!.type },
      { accountId: accountMap.get("3000")!.id, debit: 0, credit: 370000, type: accountMap.get("3000")!.type },
    ],
  });

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        name: "Kathmandu Woodcraft",
        contact: "Nabin Maharjan",
        email: "orders@ktmwoodcraft.local",
        phone: "+977-9800001001",
        country: "Nepal",
        paymentTerms: "30 days",
        leadTimeDays: 8,
        rating: 4.8,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Oak & Iron Imports",
        contact: "Pooja Sharma",
        email: "supply@oakiron.local",
        phone: "+91-9900002002",
        country: "India",
        paymentTerms: "45 days",
        leadTimeDays: 14,
        rating: 4.4,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Pacific Foam Works",
        contact: "Leo Chen",
        email: "trade@pacificfoam.local",
        phone: "+86-13000003003",
        country: "China",
        paymentTerms: "50% advance / 50% on shipment",
        leadTimeDays: 21,
        rating: 4.1,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Terra Outdoor Living",
        contact: "Amit Bista",
        email: "sales@terraoutdoor.local",
        phone: "+977-9800004004",
        country: "Nepal",
        paymentTerms: "30 days",
        leadTimeDays: 10,
        rating: 4.6,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Nordic Hardware House",
        contact: "Sofia Berg",
        email: "ops@nordichardware.local",
        phone: "+46-7000005005",
        country: "Sweden",
        paymentTerms: "60 days",
        leadTimeDays: 24,
        rating: 4.7,
      },
    }),
  ]);

  const customersInput: Array<{ name: string; email: string; phone: string; type: CustomerType; creditLimit: number; address: string }> = [
    { name: "Mia Thompson", email: "mia@example.com", phone: "+1-202-555-0101", type: "RETAIL", creditLimit: 0, address: "Durbarmarg, Kathmandu" },
    { name: "Evergreen Homes", email: "procurement@evergreen.local", phone: "+977-9800001101", type: "TRADE", creditLimit: 25000, address: "Pulchowk, Lalitpur" },
    { name: "Urban Nest Studio", email: "orders@urbannest.local", phone: "+977-9800001102", type: "CONTRACTOR", creditLimit: 40000, address: "Thamel, Kathmandu" },
    { name: "Cedar Lane Hotels", email: "finance@cedarlane.local", phone: "+977-9800001103", type: "TRADE", creditLimit: 50000, address: "Lakeside, Pokhara" },
    { name: "Aria Interiors", email: "hello@aria.local", phone: "+977-9800001104", type: "CONTRACTOR", creditLimit: 35000, address: "Boudha, Kathmandu" },
    { name: "Nexa Offices", email: "ap@nexa.local", phone: "+977-9800001105", type: "TRADE", creditLimit: 45000, address: "New Baneshwor, Kathmandu" },
    { name: "Suman Shrestha", email: "suman@example.com", phone: "+977-9800001106", type: "RETAIL", creditLimit: 0, address: "Bhaktapur Durbar Square" },
    { name: "Blue Horizon Villas", email: "sourcing@bluehorizon.local", phone: "+977-9800001107", type: "TRADE", creditLimit: 30000, address: "Dhulikhel, Kavre" },
    { name: "Craftspace Studio", email: "studio@craftspace.local", phone: "+977-9800001108", type: "CONTRACTOR", creditLimit: 28000, address: "Kupondole, Lalitpur" },
    { name: "Priya Karki", email: "priya@example.com", phone: "+977-9800001109", type: "RETAIL", creditLimit: 0, address: "Pokhara, Kaski" },
  ];

  const customers = await Promise.all(customersInput.map((customer) => prisma.customer.create({ data: customer })));

  const productTemplates = [
    ["Monarch Sofa", "SOF-MON-001", "Sofa", "Walnut", "Sand Linen", 620, 1080],
    ["Crest Sectional", "SOF-CRE-002", "Sofa", "Oak", "Charcoal", 920, 1540],
    ["Hearth Loveseat", "SOF-HEA-003", "Sofa", "Ash", "Stone", 480, 840],
    ["Solace Recliner", "SOF-SOL-004", "Sofa", "Teak", "Olive", 410, 760],
    ["Aster Dining Table", "DIN-AST-005", "Dining", "Oak", "Travertine", 700, 1260],
    ["Rowan Dining Chair Set", "DIN-ROW-006", "Dining", "Walnut", "Leather", 360, 640],
    ["Atlas Sideboard", "DIN-ATL-007", "Dining", "Ash", "Natural", 540, 980],
    ["Ember Bar Stool", "DIN-EMB-008", "Dining", "Oak", "Black", 180, 340],
    ["Luna Bed Frame", "BED-LUN-009", "Bedroom", "Walnut", "Ivory", 680, 1220],
    ["Haven Nightstand", "BED-HAV-010", "Bedroom", "Oak", "Fawn", 170, 310],
    ["Cascade Dresser", "BED-CAS-011", "Bedroom", "Ash", "Natural", 460, 860],
    ["Cedar Wardrobe", "BED-CED-012", "Bedroom", "Walnut", "Bronze", 740, 1320],
    ["Vela Executive Desk", "OFF-VEL-013", "Office", "Walnut", "Graphite", 590, 1140],
    ["Draft Task Chair", "OFF-DRA-014", "Office", "Steel", "Black Mesh", 220, 430],
    ["Pivot Bookshelf", "OFF-PIV-015", "Office", "Oak", "Natural", 310, 590],
    ["Orbit Filing Cabinet", "OFF-ORB-016", "Office", "Steel", "Cream", 260, 480],
    ["Harbor Lounge Chair", "OUT-HAR-017", "Outdoor", "Teak", "Sand Rope", 340, 620],
    ["Cove Patio Set", "OUT-COV-018", "Outdoor", "Teak", "Pebble", 940, 1680],
    ["Terra Bistro Table", "OUT-TER-019", "Outdoor", "Acacia", "Stone", 280, 520],
    ["Sora Sunbed", "OUT-SOR-020", "Outdoor", "Teak", "White", 430, 790],
  ] as const;

  const variantMap = new Map<string, { id: string; productId: string; skuVariant: string }>();

  for (let index = 0; index < productTemplates.length; index += 1) {
    const [name, sku, category, material, color, costPrice, sellingPrice] = productTemplates[index];
    const variantDefinitions = [
      {
        variantName: `${material} / Standard`,
        skuVariant: `${sku}-STD`,
        additionalCost: 0,
        stockQuantity: 8 + (index % 4),
      },
      {
        variantName: `${material} / Large`,
        skuVariant: `${sku}-LRG`,
        additionalCost: 90,
        stockQuantity: 6 + (index % 3),
      },
      ...(index % 2 === 0
        ? [
            {
              variantName: `${material} / Premium`,
              skuVariant: `${sku}-PRM`,
              additionalCost: 160,
              stockQuantity: 4 + (index % 2),
            },
          ]
        : []),
    ];

    const created = await prisma.product.create({
      data: {
        name,
        sku,
        category,
        description: `${name} crafted for modern ${category.toLowerCase()} collections.`,
        costPrice,
        sellingPrice,
        material,
        color,
        length: 72 + index,
        width: 32 + (index % 5),
        height: 28 + (index % 6),
        weight: 20 + (index % 9),
        status: index === 16 ? "DISCONTINUED" : "ACTIVE",
        lowStockThreshold: category === "Bedroom" ? 4 : 5,
        taxRateId: category === "Outdoor" ? taxRates.outdoor.id : taxRates.standard.id,
        variants: {
          create: variantDefinitions,
        },
      },
      include: {
        variants: true,
      },
    });

    for (const variant of created.variants) {
      variantMap.set(variant.skuVariant, {
        id: variant.id,
        productId: created.id,
        skuVariant: variant.skuVariant,
      });

      const showroomQty = Math.max(1, Math.floor(variant.stockQuantity * 0.25));
      const showroomDisplay = 1;
      const storageQty = Math.max(1, Math.floor(variant.stockQuantity * 0.6));
      const transitQty = Math.max(0, variant.stockQuantity - showroomQty - showroomDisplay - storageQty);

      await prisma.inventory.createMany({
        data: [
          {
            productVariantId: variant.id,
            warehouseId: warehouses.showroom.id,
            quantity: showroomQty,
            status: "IN_STOCK",
          },
          {
            productVariantId: variant.id,
            warehouseId: warehouses.showroom.id,
            quantity: showroomDisplay,
            status: "ON_DISPLAY",
          },
          {
            productVariantId: variant.id,
            warehouseId: warehouses.storage.id,
            quantity: storageQty,
            status: "IN_STOCK",
          },
          {
            productVariantId: variant.id,
            warehouseId: warehouses.transit.id,
            quantity: transitQty,
            status: transitQty > 0 ? "IN_TRANSIT" : "IN_STOCK",
          },
        ],
      });

      await prisma.stockMovement.create({
        data: {
          productVariantId: variant.id,
          warehouseId: warehouses.storage.id,
          userId: users.warehouse.id,
          type: "INBOUND",
          quantity: variant.stockQuantity,
          balanceAfter: variant.stockQuantity,
          source: "Seed opening stock",
        },
      });
    }
  }

  const purchaseOrders = await Promise.all([
    prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[0].id,
        createdById: users.warehouse.id,
        status: "PARTIALLY_RECEIVED",
        orderDate: daysAgo(25),
        expectedDelivery: daysAgo(14),
        totalAmount: 4850,
        shippingTerms: "Delivered to storage warehouse",
        notes: "Frames and walnut components",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("SOF-MON-001-STD")!.id, quantity: 8, receivedQuantity: 6, unitCost: 620 },
            { productVariantId: variantMap.get("DIN-AST-005-LRG")!.id, quantity: 4, receivedQuantity: 2, unitCost: 790 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[1].id,
        createdById: users.warehouse.id,
        status: "RECEIVED",
        orderDate: daysAgo(34),
        expectedDelivery: daysAgo(20),
        totalAmount: 6120,
        shippingTerms: "FOB Kolkata",
        notes: "Metal bases and desk hardware",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("OFF-VEL-013-STD")!.id, quantity: 6, receivedQuantity: 6, unitCost: 590 },
            { productVariantId: variantMap.get("OFF-ORB-016-STD")!.id, quantity: 10, receivedQuantity: 10, unitCost: 260 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.purchaseOrder.create({
      data: {
        supplierId: suppliers[3].id,
        createdById: users.warehouse.id,
        status: "INVOICED",
        orderDate: daysAgo(18),
        expectedDelivery: daysAgo(8),
        totalAmount: 5580,
        shippingTerms: "DDP Kathmandu",
        notes: "Outdoor teak collection",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("OUT-COV-018-STD")!.id, quantity: 3, receivedQuantity: 3, unitCost: 940 },
            { productVariantId: variantMap.get("OUT-SOR-020-LRG")!.id, quantity: 6, receivedQuantity: 6, unitCost: 520 },
          ],
        },
      },
      include: { lineItems: true },
    }),
  ]);

  await prisma.goodsReceipt.create({
    data: {
      purchaseOrderId: purchaseOrders[0].id,
      receivedById: users.warehouse.id,
      receivedDate: daysAgo(15),
      status: "PARTIAL",
      notes: "Two items short on initial drop",
      lines: {
        create: purchaseOrders[0].lineItems.map((item, index) => ({
          poLineItemId: item.id,
          quantityReceived: index === 0 ? 6 : 2,
          discrepancyQty: index === 0 ? 2 : 2,
        })),
      },
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      purchaseOrderId: purchaseOrders[1].id,
      receivedById: users.warehouse.id,
      receivedDate: daysAgo(19),
      status: "RECEIVED",
      lines: {
        create: purchaseOrders[1].lineItems.map((item) => ({
          poLineItemId: item.id,
          quantityReceived: item.receivedQuantity,
          discrepancyQty: 0,
        })),
      },
    },
  });

  await prisma.goodsReceipt.create({
    data: {
      purchaseOrderId: purchaseOrders[2].id,
      receivedById: users.warehouse.id,
      receivedDate: daysAgo(7),
      status: "RECEIVED",
      lines: {
        create: purchaseOrders[2].lineItems.map((item) => ({
          poLineItemId: item.id,
          quantityReceived: item.receivedQuantity,
          discrepancyQty: 0,
        })),
      },
    },
  });

  const supplierInvoices = await Promise.all([
    prisma.supplierInvoice.create({
      data: {
        supplierId: suppliers[0].id,
        purchaseOrderId: purchaseOrders[0].id,
        invoiceNumber: "BILL-2026-0101",
        issueDate: daysAgo(14),
        dueDate: daysFromNow(10),
        status: "PARTIALLY_PAID",
        subtotal: 4290,
        taxAmount: 560,
        totalAmount: 4850,
        amountPaid: 2000,
      },
    }),
    prisma.supplierInvoice.create({
      data: {
        supplierId: suppliers[3].id,
        purchaseOrderId: purchaseOrders[2].id,
        invoiceNumber: "BILL-2026-0102",
        issueDate: daysAgo(6),
        dueDate: daysFromNow(20),
        status: "RECEIVED",
        subtotal: 4940,
        taxAmount: 640,
        totalAmount: 5580,
        amountPaid: 0,
      },
    }),
  ]);

  const salesOrders = await Promise.all([
    prisma.salesOrder.create({
      data: {
        customerId: customers[1].id,
        assignedWarehouseId: warehouses.storage.id,
        salespersonId: users.sales.id,
        status: "OUT_FOR_DELIVERY",
        depositAmount: 4400,
        balanceDue: 4200,
        orderDate: daysAgo(4),
        deliveryDate: daysFromNow(2),
        notes: "Site delivery for model apartment",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("SOF-MON-001-LRG")!.id, quantity: 2, unitPrice: 1170, discountPct: 5 },
            { productVariantId: variantMap.get("OFF-VEL-013-STD")!.id, quantity: 2, unitPrice: 1140, discountPct: 0 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.salesOrder.create({
      data: {
        customerId: customers[0].id,
        assignedWarehouseId: warehouses.showroom.id,
        salespersonId: users.sales.id,
        status: "DEPOSIT_PAID",
        depositAmount: 1100,
        balanceDue: 2100,
        orderDate: daysAgo(3),
        deliveryDate: daysFromNow(4),
        notes: "Customer requested afternoon delivery window",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("BED-LUN-009-STD")!.id, quantity: 1, unitPrice: 1220, discountPct: 0 },
            { productVariantId: variantMap.get("BED-HAV-010-STD")!.id, quantity: 2, unitPrice: 310, discountPct: 0 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.salesOrder.create({
      data: {
        customerId: customers[3].id,
        assignedWarehouseId: warehouses.storage.id,
        salespersonId: users.sales.id,
        status: "DELIVERED",
        depositAmount: 6000,
        balanceDue: 0,
        orderDate: daysAgo(9),
        deliveryDate: daysAgo(1),
        notes: "Hotel lobby refit package",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("DIN-ATL-007-STD")!.id, quantity: 6, unitPrice: 980, discountPct: 8 },
            { productVariantId: variantMap.get("DIN-ROW-006-STD")!.id, quantity: 12, unitPrice: 640, discountPct: 10 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.salesOrder.create({
      data: {
        customerId: customers[2].id,
        assignedWarehouseId: warehouses.storage.id,
        salespersonId: users.sales.id,
        status: "CONFIRMED",
        depositAmount: 0,
        balanceDue: 12940,
        orderDate: daysAgo(2),
        deliveryDate: daysFromNow(6),
        notes: "Staging furniture for office reception",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("OFF-VEL-013-LRG")!.id, quantity: 4, unitPrice: 1230, discountPct: 0 },
            { productVariantId: variantMap.get("OFF-PIV-015-STD")!.id, quantity: 6, unitPrice: 590, discountPct: 0 },
          ],
        },
      },
      include: { lineItems: true },
    }),
  ]);

  const invoices = await Promise.all([
    prisma.invoice.create({
      data: {
        soId: salesOrders[0].id,
        invoiceNumber: "INV-2026-0007",
        issueDate: daysAgo(3),
        dueDate: daysFromNow(8),
        status: "PARTIALLY_PAID",
        total: 8600,
        taxAmount: 988,
        amountPaid: 4400,
      },
    }),
    prisma.invoice.create({
      data: {
        soId: salesOrders[1].id,
        invoiceNumber: "INV-2026-0006",
        issueDate: daysAgo(2),
        dueDate: daysFromNow(9),
        status: "PARTIALLY_PAID",
        total: 3200,
        taxAmount: 368,
        amountPaid: 1100,
      },
    }),
    prisma.invoice.create({
      data: {
        soId: salesOrders[2].id,
        invoiceNumber: "INV-2026-0005",
        issueDate: daysAgo(8),
        dueDate: daysAgo(1),
        status: "PAID",
        total: 21450,
        taxAmount: 2467,
        amountPaid: 21450,
      },
    }),
    prisma.invoice.create({
      data: {
        soId: salesOrders[3].id,
        invoiceNumber: "INV-2026-0008",
        issueDate: daysAgo(1),
        dueDate: daysFromNow(13),
        status: "SENT",
        total: 12940,
        taxAmount: 1488,
        amountPaid: 0,
      },
    }),
  ]);

  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        invoiceId: invoices[0].id,
        amount: 4400,
        method: "BANK",
        paymentDate: daysAgo(2),
        reference: "TXN-884101",
      },
    }),
    prisma.payment.create({
      data: {
        invoiceId: invoices[1].id,
        amount: 1100,
        method: "CARD",
        paymentDate: daysAgo(1),
        reference: "CARD-22094",
      },
    }),
    prisma.payment.create({
      data: {
        invoiceId: invoices[2].id,
        amount: 21450,
        method: "BANK",
        paymentDate: daysAgo(1),
        reference: "TXN-884205",
      },
    }),
    prisma.payment.create({
      data: {
        supplierInvoiceId: supplierInvoices[0].id,
        purchaseOrderId: purchaseOrders[0].id,
        amount: 2000,
        method: "BANK",
        paymentDate: daysAgo(9),
        reference: "SUP-77102",
      },
    }),
  ]);

  await Promise.all([
    prisma.delivery.create({
      data: {
        soId: salesOrders[0].id,
        driverId: users.driver.id,
        status: "OUT_FOR_DELIVERY",
        scheduledDate: daysFromNow(2),
        vehicle: "BA-2-CHA 5544",
        deliveryAddress: customers[1].address,
        notes: "Call site manager before unloading",
      },
    }),
    prisma.delivery.create({
      data: {
        soId: salesOrders[2].id,
        driverId: users.driver.id,
        status: "DELIVERED",
        scheduledDate: daysAgo(1),
        vehicle: "BA-2-CHA 5544",
        deliveryAddress: customers[3].address,
        notes: "Installed in hotel lobby",
        completedAt: daysAgo(1),
      },
    }),
  ]);

  await Promise.all([
    prisma.expense.create({
      data: {
        category: "Rent",
        amount: 4200,
        date: daysAgo(20),
        description: "Monthly showroom lease",
      },
    }),
    prisma.expense.create({
      data: {
        category: "Fuel",
        amount: 680,
        date: daysAgo(6),
        description: "Delivery vehicle fuel and tolls",
      },
    }),
  ]);

  await createBalancedEntry({
    date: daysAgo(14),
    description: "Supplier invoice recorded",
    reference: supplierInvoices[0].invoiceNumber,
    sourceType: "supplier_invoice",
    sourceId: supplierInvoices[0].id,
    createdById: users.accountant.id,
    lines: [
      { accountId: accountMap.get("1200")!.id, debit: 4290, credit: 0, type: accountMap.get("1200")!.type },
      { accountId: accountMap.get("1300")!.id, debit: 560, credit: 0, type: accountMap.get("1300")!.type },
      { accountId: accountMap.get("2000")!.id, debit: 0, credit: 4850, type: accountMap.get("2000")!.type },
    ],
  });

  await createBalancedEntry({
    date: daysAgo(9),
    description: "Supplier payment",
    reference: payments[3].reference ?? payments[3].id,
    sourceType: "supplier_payment",
    sourceId: payments[3].id,
    createdById: users.accountant.id,
    lines: [
      { accountId: accountMap.get("2000")!.id, debit: 2000, credit: 0, type: accountMap.get("2000")!.type },
      { accountId: accountMap.get("1000")!.id, debit: 0, credit: 2000, type: accountMap.get("1000")!.type },
    ],
  });

  for (const invoice of invoices) {
    const revenue = Number(invoice.total) - Number(invoice.taxAmount);
    await createBalancedEntry({
      date: invoice.issueDate,
      description: "Sales invoice posted",
      reference: invoice.invoiceNumber,
      sourceType: "sales_invoice",
      sourceId: invoice.id,
      createdById: users.accountant.id,
      lines: [
        { accountId: accountMap.get("1100")!.id, debit: Number(invoice.total), credit: 0, type: accountMap.get("1100")!.type },
        { accountId: accountMap.get("4000")!.id, debit: 0, credit: revenue, type: accountMap.get("4000")!.type },
        { accountId: accountMap.get("2100")!.id, debit: 0, credit: Number(invoice.taxAmount), type: accountMap.get("2100")!.type },
      ],
    });
  }

  for (const payment of payments.slice(0, 3)) {
    await createBalancedEntry({
      date: payment.paymentDate,
      description: "Customer payment received",
      reference: payment.reference ?? payment.id,
      sourceType: "customer_payment",
      sourceId: payment.id,
      createdById: users.accountant.id,
      lines: [
        { accountId: accountMap.get("1000")!.id, debit: Number(payment.amount), credit: 0, type: accountMap.get("1000")!.type },
        { accountId: accountMap.get("1100")!.id, debit: 0, credit: Number(payment.amount), type: accountMap.get("1100")!.type },
      ],
    });
  }

  await createBalancedEntry({
    date: daysAgo(20),
    description: "Showroom rent",
    reference: "EXP-RENT-01",
    sourceType: "expense",
    createdById: users.accountant.id,
    lines: [
      { accountId: accountMap.get("6100")!.id, debit: 4200, credit: 0, type: accountMap.get("6100")!.type },
      { accountId: accountMap.get("1000")!.id, debit: 0, credit: 4200, type: accountMap.get("1000")!.type },
    ],
  });

  await createBalancedEntry({
    date: daysAgo(6),
    description: "Delivery fleet fuel",
    reference: "EXP-FUEL-01",
    sourceType: "expense",
    createdById: users.accountant.id,
    lines: [
      { accountId: accountMap.get("6200")!.id, debit: 680, credit: 0, type: accountMap.get("6200")!.type },
      { accountId: accountMap.get("1000")!.id, debit: 0, credit: 680, type: accountMap.get("1000")!.type },
    ],
  });

  await Promise.all([
    prisma.customer.update({
      where: { id: customers[1].id },
      data: { outstandingBalance: 4200 },
    }),
    prisma.customer.update({
      where: { id: customers[0].id },
      data: { outstandingBalance: 2100 },
    }),
    prisma.customer.update({
      where: { id: customers[2].id },
      data: { outstandingBalance: 12940 },
    }),
  ]);

  console.log("Seed complete");
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
