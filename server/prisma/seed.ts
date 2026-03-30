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
  await prisma.invoiceCounter.deleteMany();
  await prisma.vatRegister.deleteMany();
  await prisma.arLedger.deleteMany();
  await prisma.taxInvoice.deleteMany();
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
        name: "Manish Admin",
        email: "admin@manishsteel.com.np",
        passwordHash,
        role: "ADMIN",
      },
    }),
    accountant: await prisma.user.create({
      data: {
        name: "Asha Ledger",
        email: "accountant@manishsteel.com.np",
        passwordHash,
        role: "ACCOUNTANT",
      },
    }),
    sales: await prisma.user.create({
      data: {
        name: "Ravi Sales",
        email: "sales@manishsteel.com.np",
        passwordHash,
        role: "SALES",
      },
    }),
    warehouse: await prisma.user.create({
      data: {
        name: "Kiran Store",
        email: "warehouse@manishsteel.com.np",
        passwordHash,
        role: "WAREHOUSE",
      },
    }),
    driver: await prisma.user.create({
      data: {
        name: "Sanjay Driver",
        email: "driver@manishsteel.com.np",
        passwordHash,
        role: "DRIVER",
      },
    }),
  } satisfies Record<string, { id: string; email: string; role: UserRole }>;

     await prisma.companyProfile.create({
       data: {
         name: "Shree Manish Steel Furniture Udhyog Pvt. Ltd.",
         address: "Dharan Rd, Biratnagar-05, Nepal",
         panNo: "300012345",
         vatNo: "300012345",
         bankDetails: "NIC Asia Bank · A/C 0100012345 · Biratnagar Branch",
         email: "shreemanishfurniture@gmail.com",
         phone: "+977-9824336371",
         website: "https://www.manishsteel.com.np",
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
        name: "Biratnagar Showroom",
        location: "Dharan Road, Biratnagar",
        type: "SHOWROOM",
      },
    }),
    storage: await prisma.warehouse.create({
      data: {
        name: "Itahari Factory Depot",
        location: "Itahari-04, Sunsari",
        type: "STORAGE",
      },
    }),
    transit: await prisma.warehouse.create({
      data: {
        name: "Dharan Service Point",
        location: "Bhanu Chowk, Dharan",
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
        name: "Hulas Steel Industries",
        contact: "Sanjay Agrawal",
        email: "sales@hulassteel.com.np",
        phone: "+977-21-555001",
        country: "Nepal",
        paymentTerms: "15 days",
        leadTimeDays: 5,
        rating: 4.9,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Tata Steel Nepal",
        contact: "Kiran Sharma",
        email: "orders@tatasteel.com.np",
        phone: "+977-1-444332",
        country: "Nepal/India",
        paymentTerms: "Advance",
        leadTimeDays: 14,
        rating: 4.8,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Asian Paints Biratnagar",
        contact: "Amit Shah",
        email: "brt@asianpaints.com.np",
        phone: "+977-21-522114",
        country: "Nepal",
        paymentTerms: "30 days",
        leadTimeDays: 3,
        rating: 4.6,
      },
    }),
    prisma.supplier.create({
      data: {
        name: "Local Hardware & Co.",
        contact: "Rajesh Gupta",
        email: "rajesh@localhardware.com",
        phone: "+977-9810010011",
        country: "Nepal",
        paymentTerms: "7 days",
        leadTimeDays: 2,
        rating: 4.2,
      },
    }),
  ]);

  const customersInput: any[] = [
    { name: "Ram Kumar", email: "ram@example.com", phone: "+977-9810001101", type: "RETAIL", creditLimit: 0, address: "Tinkune, Biratnagar", panNo: "100123456", invoicePref: "PAN", district: "Morang", ward: "3" },
    { name: "Birat Medical College", email: "procurement@biratmedical.local", phone: "+977-21-444111", type: "TRADE", creditLimit: 50000, address: "Tankisinuwari, Morang", vatNo: "300123456", invoicePref: "VAT", district: "Morang", ward: "2" },
    { name: "Nobel Hospital", email: "ap@nobel.local", phone: "+977-21-555222", type: "TRADE", creditLimit: 100000, address: "Kanchanbari, Biratnagar", vatNo: "300234567", invoicePref: "VAT", district: "Morang", ward: "4" },
    { name: "Sita Poudel", email: "sita@example.com", phone: "+977-9842001102", type: "RETAIL", creditLimit: 0, address: "Puspalal Chowk, Biratnagar", invoicePref: "PAN", district: "Morang", ward: "2" },
    { name: "Bikash Thapa", email: "bikash@example.com", phone: "+977-9800001103", type: "RETAIL", creditLimit: 0, address: "Bhanu Chowk, Dharan", invoicePref: "NONE", district: "Sunsari", ward: "1" },
    { name: "Itahari Business Center", email: "office@itahari.biz", phone: "+977-25-580101", type: "TRADE", creditLimit: 35000, address: "Main Road, Itahari", vatNo: "300456789", invoicePref: "VAT", district: "Sunsari", ward: "4" },
  ];

  const customers = await Promise.all(customersInput.map((customer) => prisma.customer.create({ data: customer })));

  const productTemplates = [
    ["Royal 3-Door Steel Almirah", "ALM-ROY-001", "Almirah", "Steel", "Walnut Finish", 18500, 24500],
    ["Deluxe 2-Door Steel Almirah", "ALM-DEL-002", "Almirah", "Steel", "Ivory", 12500, 16800],
    ["Standard Steel Daraz", "DRZ-STD-003", "Daraz", "Steel", "Gray", 8200, 11500],
    ["Office Executive Daraz", "DRZ-EXE-004", "Daraz", "Steel", "Black", 14500, 21000],
    ["Steel Double Bed (Khat)", "BED-DBL-005", "Bed", "Steel", "Metallic Gray", 13800, 19500],
    ["Steel Single Bed (Khat)", "BED-SNG-006", "Bed", "Steel", "Black", 7200, 10500],
    ["Folding Steel Bed", "BED-FLD-007", "Bed", "Steel", "Blue", 4200, 6200],
    ["Executive Office Chair", "CHR-EXE-008", "Office", "Leatherette", "Black", 9200, 13800],
    ["Staff / Task Mesh Chair", "CHR-TSK-009", "Office", "Mesh", "Gray", 4200, 6500],
    ["4-Drawer Steel Filing Cabinet", "CAB-FIL-010", "Office", "Steel", "Gray", 10200, 14800],
    ["Slotted Angle Rack (Heavy Duty)", "RCK-SLT-011", "Rack", "Steel", "Blue/Orange", 6200, 9200],
    ["Computer / Study Table", "TBL-COM-012", "Table", "Wood/Steel", "Brown", 5200, 7800],
    ["Bedside Folding Table", "TBL-BED-013", "Table", "Steel", "Ivory", 2200, 3600],
    ["Armchair (Super Quality)", "CHR-ARM-014", "Chair", "Plastic/Steel", "Red", 1200, 1850],
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
        lowStockThreshold: category === "Almirah" ? 2 : 5,
        taxRateId: taxRates.standard.id,
        hsCode: "9403.60.00",
        woodType: material === "Wood/Steel" ? "Mixed" : "None",
        finishType: "Matte Lacquer",
        assemblyRequired: index % 3 === 0,
        warrantyMonths: 12,
        leadTimeDays: 14,
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
            { productVariantId: variantMap.get("ALM-ROY-001-STD")!.id, quantity: 10, receivedQuantity: 6, unitCost: 18500 },
            { productVariantId: variantMap.get("DRZ-STD-003-LRG")!.id, quantity: 5, receivedQuantity: 2, unitCost: 8290 },
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
            { productVariantId: variantMap.get("CHR-EXE-008-STD")!.id, quantity: 15, receivedQuantity: 15, unitCost: 9200 },
            { productVariantId: variantMap.get("CAB-FIL-010-STD")!.id, quantity: 8, receivedQuantity: 8, unitCost: 10200 },
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
            { productVariantId: variantMap.get("BED-DBL-005-STD")!.id, quantity: 5, receivedQuantity: 5, unitCost: 13800 },
            { productVariantId: variantMap.get("BED-SNG-006-LRG")!.id, quantity: 8, receivedQuantity: 8, unitCost: 7290 },
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
        orderAmount: 8600,
        depositAmount: 4400,
        balanceDue: 4200,
        orderDate: daysAgo(4),
        deliveryDate: daysFromNow(2),
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        notes: "Site delivery for model apartment",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("ALM-ROY-001-LRG")!.id, quantity: 2, unitPrice: 24500, discountPct: 5 },
            { productVariantId: variantMap.get("DRZ-EXE-004-STD")!.id, quantity: 1, unitPrice: 21000, discountPct: 0 },
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
        orderAmount: 3200,
        depositAmount: 1100,
        balanceDue: 2100,
        orderDate: daysAgo(3),
        deliveryDate: daysFromNow(4),
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        notes: "Customer requested afternoon delivery window",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("BED-DBL-005-STD")!.id, quantity: 1, unitPrice: 19500, discountPct: 0 },
            { productVariantId: variantMap.get("TBL-BED-013-STD")!.id, quantity: 2, unitPrice: 3600, discountPct: 0 },
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
        orderAmount: 21450,
        depositAmount: 6000,
        balanceDue: 0,
        orderDate: daysAgo(9),
        deliveryDate: daysAgo(1),
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        notes: "Hotel lobby refit package",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("CAB-FIL-010-STD")!.id, quantity: 6, unitPrice: 14800, discountPct: 8 },
            { productVariantId: variantMap.get("CHR-EXE-008-STD")!.id, quantity: 12, unitPrice: 13800, discountPct: 10 },
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
        orderAmount: 12940,
        depositAmount: 0,
        balanceDue: 12940,
        orderDate: daysAgo(2),
        deliveryDate: daysFromNow(6),
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        notes: "Staging furniture for office reception",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("CHR-EXE-008-LRG")!.id, quantity: 4, unitPrice: 14500, discountPct: 0 },
            { productVariantId: variantMap.get("TBL-COM-012-STD")!.id, quantity: 6, unitPrice: 7800, discountPct: 0 },
          ],
        },
      },
      include: { lineItems: true },
    }),
  ]);

  const invoices = await Promise.all([
    prisma.taxInvoice.create({
      data: {
        soId: salesOrders[0].id,
        invoiceNumber: "INV-2026-0007",
        issueDate: daysAgo(3),
        dueDate: daysFromNow(8),
        status: "PARTIALLY_PAID",
        invoiceAmount: 8600,
        invoiceType: "VAT",
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        taxAmount: 988,
      },
    }),
    prisma.taxInvoice.create({
      data: {
        soId: salesOrders[1].id,
        invoiceNumber: "INV-2026-0006",
        issueDate: daysAgo(2),
        dueDate: daysFromNow(9),
        status: "PARTIALLY_PAID",
        invoiceAmount: 3200,
        invoiceType: "VAT",
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        taxAmount: 368,
      },
    }),
    prisma.taxInvoice.create({
      data: {
        soId: salesOrders[2].id,
        invoiceNumber: "INV-2026-0005",
        issueDate: daysAgo(8),
        dueDate: daysAgo(1),
        status: "PAID",
        invoiceAmount: 21450,
        invoiceType: "VAT",
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        taxAmount: 2467,
      },
    }),
    prisma.taxInvoice.create({
      data: {
        soId: salesOrders[3].id,
        invoiceNumber: "INV-2026-0008",
        issueDate: daysAgo(1),
        dueDate: daysFromNow(13),
        status: "SENT",
        invoiceAmount: 12940,
        invoiceType: "VAT",
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        taxAmount: 1488,
      },
    }),
  ]);

  const payments = await Promise.all([
    prisma.payment.create({
      data: {
        salesOrderId: salesOrders[0].id,
        amount: 4400,
        method: "BANK",
        paymentDate: daysAgo(2),
        bsDate: "2081-09-02",
        reference: "TXN-884101",
      },
    }),
    prisma.payment.create({
      data: {
        salesOrderId: salesOrders[1].id,
        amount: 1100,
        method: "CARD",
        paymentDate: daysAgo(1),
        bsDate: "2081-09-02",
        reference: "CARD-22094",
      },
    }),
    prisma.payment.create({
      data: {
        salesOrderId: salesOrders[2].id,
        amount: 21450,
        method: "BANK",
        paymentDate: daysAgo(1),
        bsDate: "2081-09-02",
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
    await createBalancedEntry({
      date: invoice.issueDate,
      description: "Sales invoice posted",
      reference: invoice.invoiceNumber,
      sourceType: "sales_invoice",
      sourceId: invoice.id,
      createdById: users.accountant.id,
      lines: [
        { accountId: accountMap.get("1100")!.id, debit: Number(invoice.invoiceAmount), credit: 0, type: accountMap.get("1100")!.type },
        { accountId: accountMap.get("4000")!.id, debit: 0, credit: Number(invoice.invoiceAmount) - Number(invoice.taxAmount), type: accountMap.get("4000")!.type },
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

  

  for (const so of salesOrders) {
    await prisma.arLedger.create({
      data: {
        customerId: so.customerId,
        salesOrderId: so.id,
        entryType: "DEBIT",
        amount: so.orderAmount,
        runningBalance: so.orderAmount,
        fiscalYear: "2081/82",
        bsDate: "2081-09-01",
        entryDate: so.createdAt,
        narration: `Sales Order ${so.id.slice(-6)}`,
      }
    });
  }

  for (const payment of payments.slice(0, 3)) {
    const so = salesOrders.find(s => s.id === payment.salesOrderId);
    if (so) {
      await prisma.arLedger.create({
        data: {
          customerId: so.customerId,
          salesOrderId: so.id,
          paymentId: payment.id,
          entryType: "CREDIT",
          amount: payment.amount,
          runningBalance: Number(so.orderAmount) - Number(payment.amount),
          fiscalYear: "2081/82",
          bsDate: "2081-09-02",
          entryDate: payment.paymentDate,
          narration: `Payment Received ${payment.reference}`,
        }
      });
    }
  }

  for (const inv of invoices) {
    const so = salesOrders.find(s => s.id === inv.soId);
    if (so) {
      await prisma.vatRegister.create({
        data: {
          taxInvoiceId: inv.id,
          customerId: so.customerId,
          taxableAmount: Number(inv.invoiceAmount) - Number(inv.taxAmount),
          outputVat: inv.taxAmount,
          totalWithVat: inv.invoiceAmount,
          fiscalYear: "2081/82",
          bsDate: "2081-09-01",
          entryDate: inv.issueDate,
        }
      });
    }
  }

  await prisma.invoiceCounter.create({
    data: {
      fiscalYear: "2081/82",
      lastSeq: 8,
    }
  });


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
