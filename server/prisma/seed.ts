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
  // Clear tables that reference others first
  await prisma.auditLog.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.vatRegister.deleteMany();
  await prisma.arLedger.deleteMany();
  await prisma.payment.deleteMany();
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
  await prisma.bankStatementLine.deleteMany();
  await prisma.bankStatementImport.deleteMany();
  await prisma.journalEntryLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.account.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.taxRate.deleteMany();
  await prisma.user.deleteMany();
  
  // Settings and Counters
  await prisma.companyProfile.deleteMany();
  await prisma.currencySetting.deleteMany();
  await prisma.notificationSetting.deleteMany();
  await prisma.invoiceTemplate.deleteMany();
  await prisma.invoiceCounter.deleteMany();
  await prisma.receiptCounter.deleteMany();
  await prisma.estimateCounter.deleteMany();
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
    factory: await prisma.warehouse.create({
      data: {
        name: "Itahari Factory Depot",
        location: "Itahari-04, Sunsari",
        type: "STORAGE",
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
    { name: "Sita Poudel", email: "sita@example.com", phone: "+977-9842001102", type: "RETAIL", creditLimit: 0, address: "Puspalal Chowk, Biratnagar", invoicePref: "PAN", district: "Morang", ward: "2" },
    { name: "Bikash Thapa", email: "bikash@example.com", phone: "+977-9800001103", type: "RETAIL", creditLimit: 0, address: "Bhanu Chowk, Dharan", invoicePref: "NONE", district: "Sunsari", ward: "1" },
    // Showroom Channels (B2B)
    { name: "Birat Showroom (Manish Steel)", email: "brt@manishsteel.com", phone: "+977-21-444111", type: "SHOWROOM", creditLimit: 500000, address: "Tankisinuwari, Morang", vatNo: "300123456", invoicePref: "VAT", district: "Morang", ward: "2" },
    { name: "Dharan Furniture Mart", email: "dharan@furniture.com", phone: "+977-21-555222", type: "SHOWROOM", creditLimit: 1000000, address: "Kanchanbari, Biratnagar", vatNo: "300234567", invoicePref: "VAT", district: "Morang", ward: "4" },
    { name: "Itahari Business Center", email: "office@itahari.biz", phone: "+977-25-580101", type: "SHOWROOM", creditLimit: 350000, address: "Main Road, Itahari", vatNo: "300456789", invoicePref: "VAT", district: "Sunsari", ward: "4" },
  ];

  const customers = await Promise.all(customersInput.map((customer) => prisma.customer.create({ data: customer })));

  const productTemplates = [
    // --- ENAMEL PAINT SERIES ---
    { name: "66 Daraj -Normal", sku: "EP-DRZ-66-N", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 7350, sellingPrice: 10500, description: "1 Locker, Mirror", size: "66x34x18" },
    { name: "66 Daraj", sku: "EP-DRZ-66-L", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 7700, sellingPrice: 11000, description: "1 locker, Inter Lock, Mirror", size: "66x34x18" },
    { name: "66 Daraj - S", sku: "EP-DRZ-66-S", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 7700, sellingPrice: 11000, description: "1 locker, Mirror", size: "66x34x18" },
    { name: "72 Daraj -Normal", sku: "EP-DRZ-72-N", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 8050, sellingPrice: 11500, description: "1 locker, Inter Lock, Mirror", size: "72x36x19" },
    { name: "72 Daraj -S (1 locker)", sku: "EP-DRZ-72-S1", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 8400, sellingPrice: 12000, description: "1 locker, Inter Lock, Mirror", size: "72x36x19" },
    { name: "72 Daraj -S (Towel Rod)", sku: "EP-DRZ-72-S2", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 8750, sellingPrice: 12500, description: "1 locker, Inter Lock, Towel Rod, Mirror", size: "72x36x19" },
    { name: "72 Daraj -S (Full)", sku: "EP-DRZ-72-S3", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 9100, sellingPrice: 13000, description: "1 locker, Inter Lock, chudi, 2 pic S handle, Mirror", size: "72x36x19" },
    { name: "72 Daraj - SR", sku: "EP-DRZ-72-SR", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 9100, sellingPrice: 13000, description: "1 locker, Inter Lock, chudi, Mirror", size: "72x36x19" },
    { name: "Shreeman Shreemati -Normal", sku: "EP-SS-72-N", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 11165, sellingPrice: 15950, description: "1 locker, Inter Lock, 2 Mirror", size: "72x40x19" },
    { name: "Shreeman Shreemati - SR", sku: "EP-SS-72-SR", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 11900, sellingPrice: 17000, description: "1 locker, Inter Lock, chudi, 1 secret chamber, 2 Mirror", size: "72x40x19" },
    { name: "Dressing -Normal", sku: "EP-DRS-72-N", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 10500, sellingPrice: 15000, description: "1 locker", size: "72x36x19" },
    { name: "Dressing -R", sku: "EP-DRS-72-R", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 13650, sellingPrice: 19500, description: "1 locker, Inter Locker, chudi, 2 drawer", size: "72x40x19" },
    { name: "Dressing -R Bambaiya", sku: "EP-DRS-72-RB", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 14350, sellingPrice: 20500, description: "Bambaiya Style", size: "72x40x19" },
    { name: "Three Door Almirah", sku: "EP-AL3-72-N", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 15400, sellingPrice: 22000, description: "1 locker, 1 secret chamber, 1 Drawer, Mirror", size: "72x48x19" },
    { name: "Three Door Almirah- R", sku: "EP-AL3-72-R", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 15400, sellingPrice: 22000, description: "1 locker, chudi, 1 secret chamber, Mirror", size: "72x48x19" },
    { name: "Three Door Dressing", sku: "EP-DRS3-72", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 20300, sellingPrice: 29000, description: "Three Door Style", size: "72x54x19" },
    { name: "Three Piece Almirah (Plain)", sku: "EP-AL3P-72", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 27440, sellingPrice: 39200, description: "Plain Bit", size: "72x60x19" },
    { name: "Three Piece Almirah- HV", sku: "EP-AL3-75-HV", category: "Household Products", material: "Steel", color: "Enamel", costPrice: 33915, sellingPrice: 48450, description: "Slop n Bit, Heavy Duty", size: "75x66x21" },
    { name: "One Locker Office Almirah (68\")", sku: "EP-OFF-68-1L", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 7210, sellingPrice: 10300, description: "One Locker", size: "68x34x17" },
    { name: "One Locker Office Almirah- HV (68\")", sku: "EP-OFF-68-HV", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 8050, sellingPrice: 11500, description: "Heavy Duty", size: "68x34x17" },
    { name: "Bookcase - 4 shelves (66\")", sku: "EP-BC-66-4S", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 9800, sellingPrice: 14000, description: "4 shelves", size: "66x34x13" },
    { name: "Glass Door Almirah - 4 shelves (66\")", sku: "EP-GDA-66-4S", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 9450, sellingPrice: 13500, description: "4 shelves", size: "66x34x19" },
    { name: "One Locker Office Almirah (72\")", sku: "EP-OFF-72-1L", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 7700, sellingPrice: 11000, description: "One Locker", size: "72x36x19" },
    { name: "One Locker Office Almirah - HV (72\")", sku: "EP-OFF-72-HV", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 8750, sellingPrice: 12500, description: "Heavy Duty", size: "72x36x19" },
    { name: "Bookcase - 4 shelves (72\")", sku: "EP-BC-72-4S", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 11060, sellingPrice: 15800, description: "4 shelves", size: "72x36x15" },
    { name: "Glass Door Almirah- 4 shelves (72\")", sku: "EP-GDA-72-4S", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 11200, sellingPrice: 16000, description: "4 shelves", size: "72x36x19" },
    { name: "One Locker Office Almirah - HV (78\")", sku: "EP-OFF-78-HV", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 10150, sellingPrice: 14500, description: "Heavy Duty", size: "78x38x19" },
    { name: "Filing Cabinet - 3 Drawer", sku: "EP-FC-3D", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 11235, sellingPrice: 16050, description: "3 Drawer", size: "42x18x24" },
    { name: "Filing Cabinet - 4 Drawer", sku: "EP-FC-4D", category: "Office Items", material: "Steel", color: "Enamel", costPrice: 13860, sellingPrice: 19800, description: "4 Drawer", size: "54x18x24" },
    { name: "Single Table (30\"x48\") - 3D", sku: "EP-TBL-48-3D", category: "Table Series", material: "Steel", color: "Enamel", costPrice: 5740, sellingPrice: 8200, description: "3 drawer", size: "48x24x30" },
    { name: "Single Table (30\"x48\") - 1D", sku: "EP-TBL-48-1D", category: "Table Series", material: "Steel", color: "Enamel", costPrice: 4900, sellingPrice: 7000, description: "1 Drawer, 1 cabinet", size: "48x24x30" },
    { name: "Double Table (30\"x54\")", sku: "EP-TBL-54-DB", category: "Table Series", material: "Steel", color: "Enamel", costPrice: 8050, sellingPrice: 11500, description: "3 Drawer, 1 cabinet", size: "54x30x30" },
    { name: "Open Rack (5 Shelves)", sku: "EP-RCK-5S", category: "Rack Series", material: "Steel", color: "Enamel", costPrice: 4200, sellingPrice: 6000, description: "5 Shelves", size: "72x35x12" },
    { name: "Open Rack (6 Shelves)", sku: "EP-RCK-6S", category: "Rack Series", material: "Steel", color: "Enamel", costPrice: 4760, sellingPrice: 6800, description: "6 Shelves", size: "78x35x12" },

    // --- POWDER COATED SERIES ---
    { name: "66 Daraj - Normal (PC)", sku: "PC-DRZ-66-N", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 7840, sellingPrice: 11200, description: "1 Locker Mirror", size: "66x34x18" },
    { name: "66 Daraj (PC-Inter)", sku: "PC-DRZ-66-I", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 9450, sellingPrice: 13500, description: "1 locker Inter Locker Mirror", size: "66x34x18" },
    { name: "66 Daraj (PC-1D)", sku: "PC-DRZ-66-1D", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 10150, sellingPrice: 14500, description: "1 locker 1 Drawer Mirror", size: "66x34x18" },
    { name: "72 Daraj (PC-Inter)", sku: "PC-DRZ-72-I", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 10850, sellingPrice: 15500, description: "1 Locker Inter locker Mirror", size: "72x36x19" },
    { name: "72 Daraj (PC-1D-I)", sku: "PC-DRZ-72-1DI", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 11550, sellingPrice: 16500, description: "1 locker 1 Drawer Inter locker Mirror", size: "72x36x19" },
    { name: "72 Daraj - super (PC)", sku: "PC-DRZ-72-S", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 13160, sellingPrice: 18800, description: "1 locker 1 Drawer Mirror Maruti Lock", size: "72x38x19" },
    { name: "Shreeman Shreemati (PC-Full)", sku: "PC-SS-72-F", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 15960, sellingPrice: 22800, description: "Double Handle Inter Locker Chudi Mirror Shoe Drawer Double Mirror", size: "72x42x19" },
    { name: "Shreeman Shreemati - super (PC-2L)", sku: "PC-SS-72-2L", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 14560, sellingPrice: 20800, description: "2 Locker, 1Secret Chamber, Double Mirror", size: "72x42x19" },
    { name: "Shreeman Shreemati - super (PC-1L)", sku: "PC-SS-72-1L", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 14210, sellingPrice: 20300, description: "1 Locker, chudi box, 1 Secret chamber, Double Mirror", size: "72x42x19" },
    { name: "Janki Model (78\") (PC)", sku: "PC-JK-78", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 21350, sellingPrice: 30500, description: "1 Locker, 2 Drawer, 1Secret chamber", size: "78x36x20" },
    { name: "Sansaar Model (78\") (PC)", sku: "PC-SN-78", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 22050, sellingPrice: 31500, description: "1 Locker, 1 Drawer, 2 Large external drawer", size: "78x38x20" },
    { name: "One Door Dressing (PC)", sku: "PC-DRS1-72", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 12250, sellingPrice: 17500, description: "2 Drawer, chudi box, Maruti Lock", size: "72x20x18" },
    { name: "Two Door Dressing (PC)", sku: "PC-DRS2-72", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 15330, sellingPrice: 21900, description: "One Locker, Double Drawer, Chudi, Maruti lock", size: "72x38x19" },
    { name: "Three Door Dressing (PC)", sku: "PC-DRS3-72", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 24290, sellingPrice: 34700, description: "One Locker, Double Drawer, Maruti lock", size: "72x54x19" },
    { name: "Three Door Mirror (PC-NF)", sku: "PC-AL3-72-NF", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 18690, sellingPrice: 26700, description: "Three Door One Locker Mirror - non Folding", size: "72x54x19" },
    { name: "Three Door Mirror (PC-F)", sku: "PC-AL3-72-F", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 24150, sellingPrice: 34500, description: "Three Door One Locker Mirror - Folding", size: "72x54x19" },
    { name: "Three Door Mirror-1D (PC)", sku: "PC-AL3-72-1D", category: "Household Almirah", material: "Steel", color: "Powder Coated", costPrice: 20090, sellingPrice: 28700, description: "Three Door One Locker One Drawer Mirror, 1 Secret chamber", size: "72x54x19" },
    { name: "One Locker Office Almirah (66\") (PC)", sku: "PC-OFF-66-1L", category: "Office Items", material: "Steel", color: "Powder Coated", costPrice: 8995, sellingPrice: 12850, description: "One Locker", size: "66x34x17" },
    { name: "One Locker Office Almirah (72\") (PC)", sku: "PC-OFF-72-1L", category: "Office Items", material: "Steel", color: "Powder Coated", costPrice: 10430, sellingPrice: 14900, description: "One Locker", size: "72x36x19" },
    { name: "One Locker Office Almirah (78\") (PC)", sku: "PC-OFF-78-1L", category: "Office Items", material: "Steel", color: "Powder Coated", costPrice: 11830, sellingPrice: 16900, description: "One Locker", size: "78x36x19" },
    { name: "Bookcase - 4 shelves (66\") (PC)", sku: "PC-BC-66-4S", category: "Office Items", material: "Steel", color: "Powder Coated", costPrice: 10360, sellingPrice: 14800, description: "4 shelves", size: "66x34x13" },
    { name: "Bookcase - 4 shelves (72\") (PC)", sku: "PC-BC-72-4S", category: "Office Items", material: "Steel", color: "Powder Coated", costPrice: 11550, sellingPrice: 16500, description: "4 shelves", size: "72x36x15" },
    { name: "66\" Glass Door Almirah - 4S (PC)", sku: "PC-GDA-66-4S", category: "Glass Door Series", material: "Steel", color: "Powder Coated", costPrice: 9975, sellingPrice: 14250, description: "4 shelves", size: "66x34x19" },
    { name: "72\" Glass Door Almirah- 4S (PC)", sku: "PC-GDA-72-4S", category: "Glass Door Series", material: "Steel", color: "Powder Coated", costPrice: 11550, sellingPrice: 16500, description: "4 shelves", size: "72x36x19" },
    { name: "Filing Cabinet - 3 Drawer (PC)", sku: "PC-FC-3D", category: "Ofilling Cabinet Series", material: "Steel", color: "Powder Coated", costPrice: 13160, sellingPrice: 18800, description: "3 Drawer", size: "42x18x24" },
    { name: "Filing Cabinet - 4 Drawer (PC)", sku: "PC-FC-4D", category: "Ofilling Cabinet Series", material: "Steel", color: "Powder Coated", costPrice: 14700, sellingPrice: 21000, description: "4 Drawer", size: "54x18x24" },
    { name: "Single Table (30\"x48\") - 3D (PC)", sku: "PC-TBL-48-3D", category: "Table Series", material: "Steel", color: "Powder Coated", costPrice: 6370, sellingPrice: 9100, description: "3 drawer", size: "48x24x30" },
    { name: "Single Table (30\"x48\") - 1D (PC)", sku: "PC-TBL-48-1D", category: "Table Series", material: "Steel", color: "Powder Coated", costPrice: 5670, sellingPrice: 8100, description: "1 Drawer, 1 cabinet", size: "48x24x30" },
    { name: "Double Table (30\"x54\") (PC)", sku: "PC-TBL-54-DB", category: "Table Series", material: "Steel", color: "Powder Coated", costPrice: 9030, sellingPrice: 12900, description: "3 Drawer, 1 cabinet", size: "54x30x30" },
    { name: "Double Table (30\"x54\") - HV (PC)", sku: "PC-TBL-54-HV", category: "Table Series", material: "Steel", color: "Powder Coated", costPrice: 13230, sellingPrice: 18900, description: "Heavy Duty, 3 Drawer, 1 cabinet", size: "54x30x30" },
    { name: "Open Rack (5 Shelves) (PC)", sku: "PC-RCK-5S", category: "Rack Series", material: "Steel", color: "Powder Coated", costPrice: 4760, sellingPrice: 6800, description: "5 Shelves", size: "72x35x13" },
    { name: "Open Rack (6 Shelves) (PC)", sku: "PC-RCK-6S", category: "Rack Series", material: "Steel", color: "Powder Coated", costPrice: 5250, sellingPrice: 7500, description: "6 Shelves", size: "78x35x13" },
    { name: "Student Table-Bench (3 Seater) (PC)", sku: "PC-STB-3S", category: "Desk Bench Series", material: "Steel", color: "Powder Coated", costPrice: 6965, sellingPrice: 9950, description: "3 Seater", size: "54x18x30" },
    { name: "Locker - 12 Door (PC)", sku: "PC-LOK-12D", category: "Locker Series", material: "Steel", color: "Powder Coated", costPrice: 21000, sellingPrice: 30000, description: "With Lock", size: "Standard" },
    { name: "Locker - 16 Door (PC)", sku: "PC-LOK-16D", category: "Locker Series", material: "Steel", color: "Powder Coated", costPrice: 28000, sellingPrice: 40000, description: "With Lock", size: "Standard" },
    { name: "Locker - 20 Door (PC)", sku: "PC-LOK-20D", category: "Locker Series", material: "Steel", color: "Powder Coated", costPrice: 31500, sellingPrice: 45000, description: "With Lock", size: "Standard" },
  ];

  const variantMap = new Map<string, { id: string; productId: string; skuVariant: string }>();

  for (const template of productTemplates) {
    const { name, sku, category, material, color, costPrice, sellingPrice, description, size } = template;
    const [h, w, d] = size.includes('x') ? size.split('x').map(s => Number(s.trim())) : [0, 0, 0];

    const created = await prisma.product.create({
      data: {
        name,
        sku,
        category,
        description: description || `${name} (${size})`,
        costPrice,
        sellingPrice,
        material,
        color,
        height: h || null,
        width: w || null,
        length: d || null,
        status: "ACTIVE",
        lowStockThreshold: 5,
        taxRateId: taxRates.standard.id,
        variants: {
          create: [
            {
              variantName: "Standard",
              skuVariant: sku,
              additionalCost: 0,
              stockQuantity: 10,
            }
          ]
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

      // Factory stock distribution
      await prisma.inventory.create({
        data: { productVariantId: variant.id, warehouseId: warehouses.factory.id, quantity: 10, status: "IN_STOCK" },
      });

      await prisma.stockMovement.create({
        data: {
          productVariantId: variant.id,
          warehouseId: warehouses.factory.id,
          userId: users.warehouse.id,
          type: "INBOUND",
          quantity: 10,
          balanceAfter: 10,
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
        shippingTerms: "Delivered to Itahari Factory Depot",
        notes: "Frames and walnut components",
        lineItems: {
          create: [
            { productVariantId: variantMap.get("PC-DRZ-72-I")!.id, quantity: 10, receivedQuantity: 6, unitCost: 10850 },
            { productVariantId: variantMap.get("EP-DRZ-72-S1")!.id, quantity: 5, receivedQuantity: 2, unitCost: 8400 },
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
            { productVariantId: variantMap.get("PC-JK-78")!.id, quantity: 15, receivedQuantity: 15, unitCost: 21350 },
            { productVariantId: variantMap.get("EP-FC-4D")!.id, quantity: 8, receivedQuantity: 8, unitCost: 13860 },
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
            { productVariantId: variantMap.get("PC-AL3-72-1D")!.id, quantity: 5, receivedQuantity: 5, unitCost: 20090 },
            { productVariantId: variantMap.get("EP-AL3-72-R")!.id, quantity: 8, receivedQuantity: 8, unitCost: 15400 },
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
        assignedWarehouseId: warehouses.factory.id,
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
            { productVariantId: variantMap.get("PC-SS-72-F")!.id, quantity: 2, unitPrice: 22800, discountPct: 5 },
            { productVariantId: variantMap.get("EP-SS-72-SR")!.id, quantity: 1, unitPrice: 17000, discountPct: 0 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.salesOrder.create({
      data: {
        customerId: customers[0].id,
        assignedWarehouseId: warehouses.factory.id,
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
            { productVariantId: variantMap.get("PC-AL3-72-1D")!.id, quantity: 1, unitPrice: 28700, discountPct: 0 },
            { productVariantId: variantMap.get("EP-TBL-48-3D")!.id, quantity: 2, unitPrice: 8200, discountPct: 0 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.salesOrder.create({
      data: {
        customerId: customers[3].id,
        assignedWarehouseId: warehouses.factory.id,
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
            { productVariantId: variantMap.get("PC-FC-4D")!.id, quantity: 6, unitPrice: 21000, discountPct: 8 },
            { productVariantId: variantMap.get("EP-AL3-75-HV")!.id, quantity: 12, unitPrice: 48450, discountPct: 10 },
          ],
        },
      },
      include: { lineItems: true },
    }),
    prisma.salesOrder.create({
      data: {
        customerId: customers[2].id,
        assignedWarehouseId: warehouses.factory.id,
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
            { productVariantId: variantMap.get("PC-DRZ-72-S")!.id, quantity: 4, unitPrice: 18800, discountPct: 0 },
            { productVariantId: variantMap.get("EP-TBL-54-DB")!.id, quantity: 6, unitPrice: 11500, discountPct: 0 },
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
