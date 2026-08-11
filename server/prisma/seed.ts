import bcrypt from "bcryptjs";
import { type AccountType, type CustomerType, type UserRole } from "@prisma/client";
import { prisma, tenantStorage, basePrisma } from "../src/config/prisma";
import { ensureStandardAccounts } from "../src/services/ensure-accounts";

const DEFAULT_PASSWORD = "M@nish123";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function resetDatabase() {
  // Clear tables that reference others first using basePrisma to clear globally
  await basePrisma.auditLog.deleteMany();
  await basePrisma.stockMovement.deleteMany();
  await basePrisma.delivery.deleteMany();
  await basePrisma.vatRegister.deleteMany();
  await basePrisma.arLedger.deleteMany();
  await basePrisma.payment.deleteMany();
  await basePrisma.taxInvoice.deleteMany();
  await basePrisma.salesOrderLineItem.deleteMany();
  await basePrisma.salesOrder.deleteMany();
  await basePrisma.goodsReceiptLine.deleteMany();
  await basePrisma.goodsReceipt.deleteMany();
  await basePrisma.supplierInvoice.deleteMany();
  await basePrisma.purchaseOrderLineItem.deleteMany();
  await basePrisma.purchaseOrder.deleteMany();
  await basePrisma.inventory.deleteMany();
  await basePrisma.productVariant.deleteMany();
  await basePrisma.product.deleteMany();
  await basePrisma.bankStatementLine.deleteMany();
  await basePrisma.bankStatementImport.deleteMany();
  await basePrisma.journalEntryLine.deleteMany();
  await basePrisma.journalEntry.deleteMany();
  await basePrisma.expense.deleteMany();
  await basePrisma.account.deleteMany();
  await basePrisma.customer.deleteMany();
  await basePrisma.supplier.deleteMany();
  await basePrisma.warehouse.deleteMany();
  await basePrisma.taxRate.deleteMany();
  await basePrisma.user.deleteMany();
  
  // Settings and Counters
  await basePrisma.companyProfile.deleteMany();
  await basePrisma.currencySetting.deleteMany();
  await basePrisma.notificationSetting.deleteMany();
  await basePrisma.invoiceTemplate.deleteMany();
  await basePrisma.invoiceCounter.deleteMany();
  await basePrisma.receiptCounter.deleteMany();
  await basePrisma.estimateCounter.deleteMany();
  await basePrisma.tenant.deleteMany();
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

  const defaultTenant = await basePrisma.tenant.create({
    data: {
      name: "Default Sandbox",
    },
  });

  await tenantStorage.run({ tenantId: defaultTenant.id }, async () => {
    await ensureStandardAccounts(defaultTenant.id);

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const users = {
      admin: await prisma.user.create({
      data: {
        name: "Shree Manish",
        email: "shreemanishfurniture@gmail.com",
        passwordHash,
        role: "ADMIN",
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
      baseCurrency: "NPR",
      supportedCurrencies: ["NPR"],
      multiCurrencyEnabled: false,
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


  const productTemplates = [
    {
      "name": "66 Daraj -Normal",
      "sku": "EP-001-66-daraj-normal",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 9000,
      "sellingPrice": 9000,
      "description": "1 locker, Mirror",
      "size": "66x34x18"
    },
    {
      "name": "66 Daraj - S",
      "sku": "EP-002-66-daraj-s",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 9500,
      "sellingPrice": 9500,
      "description": "1 locker, Mirror",
      "size": "66x34x18"
    },
    {
      "name": "66 Daraj - S",
      "sku": "EP-003-66-daraj-s",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 10500,
      "sellingPrice": 10500,
      "description": "1 locker, inter locker, 2 pice S handle, Mirror",
      "size": "66x34x18"
    },
    {
      "name": "72 Daraj -Normal",
      "sku": "EP-004-72-daraj-normal",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 11000,
      "sellingPrice": 11000,
      "description": "1 locker, Inter Lock, Mirror",
      "size": "72x36x19"
    },
    {
      "name": "72 Daraj -S",
      "sku": "EP-005-72-daraj-s",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 12000,
      "sellingPrice": 12000,
      "description": "1 locker, Inter Lock, Mirror",
      "size": "72x36x19"
    },
    {
      "name": "72 Daraj -S",
      "sku": "EP-006-72-daraj-s",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 12500,
      "sellingPrice": 12500,
      "description": "1 locker, Inter Lock, Towel Rod, Mirror",
      "size": "72x36x19"
    },
    {
      "name": "72 Daraj -S",
      "sku": "EP-007-72-daraj-s",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 13000,
      "sellingPrice": 13000,
      "description": "1 locker, Inter Lock, chudi, 2 pic S handle, Mirror",
      "size": "72x36x19"
    },
    {
      "name": "72 Daraj -SR",
      "sku": "EP-008-72-daraj-sr",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 13000,
      "sellingPrice": 13000,
      "description": "1 locker, Inter Lock, chudi, Mirror",
      "size": "72x36x19"
    },
    {
      "name": "Shreeman Shreemati -Normal",
      "sku": "EP-009-shreeman-shreemati-normal",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 15950,
      "sellingPrice": 15950,
      "description": "1 locker, Inter Lock, 2 Mirror",
      "size": "72x40x19"
    },
    {
      "name": "Shreeman Shreemati - SR",
      "sku": "EP-010-shreeman-shreemati-sr",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 17000,
      "sellingPrice": 17000,
      "description": "1 locker, Inter Lock, chudi, 1 secret chamber, 2 Mirror",
      "size": "72x40x19"
    },
    {
      "name": "Dressing -Normal",
      "sku": "EP-011-dressing-normal",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 15000,
      "sellingPrice": 15000,
      "description": "1 locker",
      "size": "72x38x19"
    },
    {
      "name": "Dressing -R",
      "sku": "EP-012-dressing-r",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 19000,
      "sellingPrice": 19000,
      "description": "1 locker, Inter Locker, chudi, 2 drawer",
      "size": "72x40x19"
    },
    {
      "name": "Dressing -R Bambaiya",
      "sku": "EP-013-dressing-r-bambaiya",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 19800,
      "sellingPrice": 19800,
      "description": "",
      "size": "72x40x19"
    },
    {
      "name": "Three Door Almirah",
      "sku": "EP-014-three-door-almirah",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 22000,
      "sellingPrice": 22000,
      "description": "1 locker, 1 secret chamber, 1 Drawer, Mirror",
      "size": "72x48x19"
    },
    {
      "name": "Three Door Almirah - R",
      "sku": "EP-015-three-door-almirah-r",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 22000,
      "sellingPrice": 22000,
      "description": "1 locker, chudi, 1 secret chamber, Mirror",
      "size": "72x48x19"
    },
    {
      "name": "Three Door Dressing",
      "sku": "EP-016-three-door-dressing",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 29000,
      "sellingPrice": 29000,
      "description": "",
      "size": "72x54x19"
    },
    {
      "name": "Three Piece Almirah",
      "sku": "EP-017-three-piece-almirah",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 39200,
      "sellingPrice": 39200,
      "description": "Plain Bit",
      "size": "72x60x19"
    },
    {
      "name": "Three Piece Almirah - HV",
      "sku": "EP-018-three-piece-almirah-hv",
      "category": "Household Products",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 48450,
      "sellingPrice": 48450,
      "description": "Slopin Bit",
      "size": "75x66x21"
    },
    {
      "name": "One Locker Office Almirah",
      "sku": "EP-019-one-locker-office-almirah",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 10300,
      "sellingPrice": 10300,
      "description": "",
      "size": "66x34x17"
    },
    {
      "name": "One Locker Office Almirah- HV",
      "sku": "EP-020-one-locker-office-almirah-hv",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 11500,
      "sellingPrice": 11500,
      "description": "",
      "size": "66x34x17"
    },
    {
      "name": "Bookcase - 4 shelves",
      "sku": "EP-021-bookcase-4-shelves",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 14000,
      "sellingPrice": 14000,
      "description": "",
      "size": "66x34x13"
    },
    {
      "name": "Glass Door Almirah - 4 shelves",
      "sku": "EP-022-glass-door-almirah-4-shelves",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 13500,
      "sellingPrice": 13500,
      "description": "",
      "size": "66x34x19"
    },
    {
      "name": "One Locker Office Almirah",
      "sku": "EP-023-one-locker-office-almirah",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 11000,
      "sellingPrice": 11000,
      "description": "",
      "size": "72x36x19"
    },
    {
      "name": "One Locker Office Almirah - HV",
      "sku": "EP-024-one-locker-office-almirah-hv",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 12500,
      "sellingPrice": 12500,
      "description": "",
      "size": "72x36x19"
    },
    {
      "name": "Bookcase - 4 shelves",
      "sku": "EP-025-bookcase-4-shelves",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 15800,
      "sellingPrice": 15800,
      "description": "",
      "size": "72x36x15"
    },
    {
      "name": "Glass Door Almirah- 4 shelves",
      "sku": "EP-026-glass-door-almirah-4-shelves",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 16000,
      "sellingPrice": 16000,
      "description": "",
      "size": "72x36x19"
    },
    {
      "name": "One Locker Office Almirah - HV",
      "sku": "EP-027-one-locker-office-almirah-hv",
      "category": "Office Items",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 15000,
      "sellingPrice": 15000,
      "description": "",
      "size": "78x36x19"
    },
    {
      "name": "Filing Cabinet - 3 Drawer",
      "sku": "EP-028-filing-cabinet-3-drawer",
      "category": "Filling Cabinet Series",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 16050,
      "sellingPrice": 16050,
      "description": "",
      "size": "42x18x24"
    },
    {
      "name": "Filing Cabinet - 4 Drawer",
      "sku": "EP-029-filing-cabinet-4-drawer",
      "category": "Filling Cabinet Series",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 19800,
      "sellingPrice": 19800,
      "description": "",
      "size": "54x18x24"
    },
    {
      "name": "Single Table (30\" x 48\")",
      "sku": "EP-030-single-table-30x48-3-drawer",
      "category": "Table Series",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 8200,
      "sellingPrice": 8200,
      "description": "3 drawer",
      "size": "48x24x30"
    },
    {
      "name": "Single Table (30\" x 48\")",
      "sku": "EP-031-single-table-30x48-1-drawer",
      "category": "Table Series",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 7000,
      "sellingPrice": 7000,
      "description": "1 Drawer, 1 cabinet",
      "size": "48x24x30"
    },
    {
      "name": "Double Table (30\" x 54\")",
      "sku": "EP-032-double-table-30x54",
      "category": "Table Series",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 11500,
      "sellingPrice": 11500,
      "description": "3 Drawer, 1 cabinet",
      "size": "54x30x30"
    },
    {
      "name": "Open Rack (5 Shelves)",
      "sku": "EP-033-open-rack-5-shelves",
      "category": "Rack Series",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 6000,
      "sellingPrice": 6000,
      "description": "",
      "size": "72x35x12"
    },
    {
      "name": "Open Rack (6 Shelves)",
      "sku": "EP-034-open-rack-6-shelves",
      "category": "Rack Series",
      "material": "Steel",
      "color": "Enamel Paint",
      "costPrice": 6800,
      "sellingPrice": 6800,
      "description": "",
      "size": "78x35x12"
    },
    {
      "name": "66 Daraj - Normal (PC)",
      "sku": "PC-66-daraj-normal-0",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 8400,
      "sellingPrice": 11200,
      "description": "1 Locker Mirror",
      "size": "66x34x18"
    },
    {
      "name": "66 Daraj (PC)",
      "sku": "PC-66-daraj-1",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 10125,
      "sellingPrice": 13500,
      "description": "1 locker Inter Locker Mirror",
      "size": "66x34x18"
    },
    {
      "name": "66 Daraj (PC)",
      "sku": "PC-66-daraj-2",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 10875,
      "sellingPrice": 14500,
      "description": "1 locker 1 Drawer Mirror",
      "size": "66x34x18"
    },
    {
      "name": "72 Daraj (PC)",
      "sku": "PC-72-daraj-3",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 11625,
      "sellingPrice": 15500,
      "description": "1 Locker Inter locker Mirror",
      "size": "72x36x19"
    },
    {
      "name": "72 Daraj (PC)",
      "sku": "PC-72-daraj-4",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 12375,
      "sellingPrice": 16500,
      "description": "1 locker 1 Drawer Inter locker Mirror",
      "size": "72x36x19"
    },
    {
      "name": "72 Daraj - super (PC)",
      "sku": "PC-72-daraj-super-5",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 14100,
      "sellingPrice": 18800,
      "description": "1 locker 1 Drawer Mirror Maruti Lock",
      "size": "72x38x19"
    },
    {
      "name": "Shreeman Shreemati (PC)",
      "sku": "PC-shreeman-shreem-6",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 17100,
      "sellingPrice": 22800,
      "description": "Double Handle Inter Locker Chudi Mirror Shoe Drawer Double Mirror",
      "size": "72x42x19"
    },
    {
      "name": "Shreeman Shreemati - super (PC)",
      "sku": "PC-shreeman-shreem-7",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 20100,
      "sellingPrice": 26800,
      "description": "2 Locker, 1Secret Chamber, Double Mirror",
      "size": "72x42x19"
    },
    {
      "name": "Shreeman Shreemati - super (PC)",
      "sku": "PC-shreeman-shreem-8",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 21975,
      "sellingPrice": 29300,
      "description": "1 Locker, chudi box, 1 Secret chamber, Double Mirror",
      "size": "72x42x19"
    },
    {
      "name": "Janki Model (78\") (PC)",
      "sku": "PC-janki-model-78-9",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 22875,
      "sellingPrice": 30500,
      "description": "1 Locker, 2 Drawer, 1Secret chamber",
      "size": "78x36x20"
    },
    {
      "name": "Sansaar Model (78\") (PC)",
      "sku": "PC-sansaar-model-7-10",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 23625,
      "sellingPrice": 31500,
      "description": "1 Locker, 1 Drawer, 2 Large external drawer",
      "size": "78x38x20"
    },
    {
      "name": "One Door Dressing (PC)",
      "sku": "PC-one-door-dressi-11",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 13125,
      "sellingPrice": 17500,
      "description": "2 Drawer,chudi box, Maruti Lock",
      "size": "72x20x18"
    },
    {
      "name": "Two Door Dressing (PC)",
      "sku": "PC-two-door-dressi-12",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 16425,
      "sellingPrice": 21900,
      "description": "One Locker, Double Drawer, Chudi, Maruti lock",
      "size": "72x36x19"
    },
    {
      "name": "Three Door Dressing (PC)",
      "sku": "PC-three-door-dres-13",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 26025,
      "sellingPrice": 34700,
      "description": "One Locker, Double Drawer, Maruti lock",
      "size": "72x54x19"
    },
    {
      "name": "Three Door One Locker Mirror - non Folding (PC)",
      "sku": "PC-three-door-one--14",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 20025,
      "sellingPrice": 26700,
      "description": "",
      "size": "72x54x19"
    },
    {
      "name": "Three Door One Locker Mirror - Folding (PC)",
      "sku": "PC-three-door-one--15",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 25875,
      "sellingPrice": 34500,
      "description": "",
      "size": "72x54x19"
    },
    {
      "name": "Three Door One Locker One Drawer Mirror (PC)",
      "sku": "PC-three-door-one--16",
      "category": "Household Almirah",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 20025,
      "sellingPrice": 26700,
      "description": "1 Secret chamber",
      "size": "72x54x19"
    },
    {
      "name": "One Locker Office Almirah (PC)",
      "sku": "PC-one-locker-offi-17",
      "category": "Office Items",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 9712,
      "sellingPrice": 12950,
      "description": "",
      "size": "66x34x17"
    },
    {
      "name": "One Locker Office Almirah (PC)",
      "sku": "PC-one-locker-offi-18",
      "category": "Office Items",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 11175,
      "sellingPrice": 14900,
      "description": "",
      "size": "72x36x19"
    },
    {
      "name": "One Locker Office Almirah (PC)",
      "sku": "PC-one-locker-offi-19",
      "category": "Office Items",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 12675,
      "sellingPrice": 16900,
      "description": "",
      "size": "78x38x19"
    },
    {
      "name": "Bookcase - 4 shelves (PC)",
      "sku": "PC-bookcase-4-shel-20",
      "category": "Office Items",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 11100,
      "sellingPrice": 14800,
      "description": "",
      "size": "66x34x13"
    },
    {
      "name": "Bookcase - 4 shelves (PC)",
      "sku": "PC-bookcase-4-shel-21",
      "category": "Office Items",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 12375,
      "sellingPrice": 16500,
      "description": "",
      "size": "72x36x15"
    },
    {
      "name": "66\" Glass Door Almirah - 4 shelves (PC)",
      "sku": "PC-66-glass-door-a-22",
      "category": "Glass Door Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 10688,
      "sellingPrice": 14250,
      "description": "",
      "size": "66x34x19"
    },
    {
      "name": "72\" Glass Door Almirah- 4 shelves (PC)",
      "sku": "PC-72-glass-door-a-23",
      "category": "Glass Door Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 12375,
      "sellingPrice": 16500,
      "description": "",
      "size": "72x36x19"
    },
    {
      "name": "Filing Cabinet - 3 Drawer (PC)",
      "sku": "PC-filing-cabinet--24",
      "category": "Ofilling Cabinet Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 14100,
      "sellingPrice": 18800,
      "description": "",
      "size": "42x18x24"
    },
    {
      "name": "Filing Cabinet - 4 Drawer (PC)",
      "sku": "PC-filing-cabinet--25",
      "category": "Ofilling Cabinet Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 15750,
      "sellingPrice": 21000,
      "description": "",
      "size": "54x18x24"
    },
    {
      "name": "Single Table (30\" x 48\") (PC)",
      "sku": "PC-single-table-30-26",
      "category": "Table Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 6825,
      "sellingPrice": 9100,
      "description": "3 drawer",
      "size": "48x24x30"
    },
    {
      "name": "Single Table (30\" x 48\") (PC)",
      "sku": "PC-single-table-30-27",
      "category": "Table Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 6075,
      "sellingPrice": 8100,
      "description": "1 Drawer, 1 cabinet",
      "size": "48x24x30"
    },
    {
      "name": "Double Table (30\" x 54\") (PC)",
      "sku": "PC-double-table-30-28",
      "category": "Table Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 9675,
      "sellingPrice": 12900,
      "description": "3 Drawer, 1 cabinet",
      "size": "54x30x30"
    },
    {
      "name": "Double Table (30\" x 54\") - HV (PC)",
      "sku": "PC-double-table-30-29",
      "category": "Table Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 14175,
      "sellingPrice": 18900,
      "description": "3 Drawer, 1 cabinet",
      "size": "54x30x30"
    },
    {
      "name": "Open Rack (5 Shelves) (PC)",
      "sku": "PC-open-rack-5-she-30",
      "category": "Rack Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 5100,
      "sellingPrice": 6800,
      "description": "",
      "size": "72x35x13"
    },
    {
      "name": "Open Rack (6 Shelves) (PC)",
      "sku": "PC-open-rack-6-she-31",
      "category": "Rack Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 5625,
      "sellingPrice": 7500,
      "description": "",
      "size": "78x35x13"
    },
    {
      "name": "Student Table-Bench (3 Seater) (PC)",
      "sku": "PC-student-table-b-32",
      "category": "Desk Bench Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 7463,
      "sellingPrice": 9950,
      "description": "",
      "size": "54x18x30"
    },
    {
      "name": "Locker - 12 Door (PC)",
      "sku": "PC-locker-12-door-33",
      "category": "Locker Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 22500,
      "sellingPrice": 30000,
      "description": "",
      "size": "With Lock"
    },
    {
      "name": "Locker - 16 Door (PC)",
      "sku": "PC-locker-16-door-34",
      "category": "Locker Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 30000,
      "sellingPrice": 40000,
      "description": "",
      "size": "With Lock"
    },
    {
      "name": "Locker - 20 Door (PC)",
      "sku": "PC-locker-20-door-35",
      "category": "Locker Series",
      "material": "Steel",
      "color": "Powder Coated",
      "costPrice": 33750,
      "sellingPrice": 45000,
      "description": "",
      "size": "With Lock"
    }
  ];

  const variantMap = new Map<string, { id: string; productId: string; skuVariant: string }>();

  for (const template of productTemplates) {
    const { name, sku, category, material, color, costPrice, sellingPrice, description, size } = template;
    const isGeometric = size.includes('x');
    const [h, w, d] = isGeometric ? size.split('x').map(s => Number(s.trim())) : [0, 0, 0];
    const sizeLabel = isGeometric ? null : size;

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
              sizeLabel,
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
          userId: users.admin.id,
          type: "INBOUND",
          quantity: 10,
          balanceAfter: 10,
          source: "Seed opening stock",
        },
      });
    }
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
