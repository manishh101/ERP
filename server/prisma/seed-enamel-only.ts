import { basePrisma, prisma, tenantStorage } from "../src/config/prisma";

const TARGET_EMAIL = "shreemanishfurniture@gmail.com";

const enamelPriceList = [
  {
    name: "66 Daraj -Normal",
    sku: "EP-001-66-daraj-normal",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 9000,
    description: "1 locker, Mirror",
    size: "66x34x18",
  },
  {
    name: "66 Daraj - S",
    sku: "EP-002-66-daraj-s",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 9500,
    description: "1 locker, Mirror",
    size: "66x34x18",
  },
  {
    name: "66 Daraj - S",
    sku: "EP-003-66-daraj-s",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 10500,
    description: "1 locker, inter locker, 2 pice S handle, Mirror",
    size: "66x34x18",
  },
  {
    name: "72 Daraj -Normal",
    sku: "EP-004-72-daraj-normal",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 11000,
    description: "1 locker, Inter Lock, Mirror",
    size: "72x36x19",
  },
  {
    name: "72 Daraj -S",
    sku: "EP-005-72-daraj-s",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 12000,
    description: "1 locker, Inter Lock, Mirror",
    size: "72x36x19",
  },
  {
    name: "72 Daraj -S",
    sku: "EP-006-72-daraj-s",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 12500,
    description: "1 locker, Inter Lock, Towel Rod, Mirror",
    size: "72x36x19",
  },
  {
    name: "72 Daraj -S",
    sku: "EP-007-72-daraj-s",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 13000,
    description: "1 locker, Inter Lock, chudi, 2 pic S handle, Mirror",
    size: "72x36x19",
  },
  {
    name: "72 Daraj -SR",
    sku: "EP-008-72-daraj-sr",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 13000,
    description: "1 locker, Inter Lock, chudi, Mirror",
    size: "72x36x19",
  },
  {
    name: "Shreeman Shreemati -Normal",
    sku: "EP-009-shreeman-shreemati-normal",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 15950,
    description: "1 locker, Inter Lock, 2 Mirror",
    size: "72x40x19",
  },
  {
    name: "Shreeman Shreemati - SR",
    sku: "EP-010-shreeman-shreemati-sr",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 17000,
    description: "1 locker, Inter Lock, chudi, 1 secret chamber, 2 Mirror",
    size: "72x40x19",
  },
  {
    name: "Dressing -Normal",
    sku: "EP-011-dressing-normal",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 15000,
    description: "1 locker",
    size: "72x38x19",
  },
  {
    name: "Dressing -R",
    sku: "EP-012-dressing-r",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 19000,
    description: "1 locker, Inter Locker, chudi, 2 drawer",
    size: "72x40x19",
  },
  {
    name: "Dressing -R Bambaiya",
    sku: "EP-013-dressing-r-bambaiya",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 19800,
    description: "",
    size: "72x40x19",
  },
  {
    name: "Three Door Almirah",
    sku: "EP-014-three-door-almirah",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 22000,
    description: "1 locker, 1 secret chamber, 1 Drawer, Mirror",
    size: "72x48x19",
  },
  {
    name: "Three Door Almirah - R",
    sku: "EP-015-three-door-almirah-r",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 22000,
    description: "1 locker, chudi, 1 secret chamber, Mirror",
    size: "72x48x19",
  },
  {
    name: "Three Door Dressing",
    sku: "EP-016-three-door-dressing",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 29000,
    description: "",
    size: "72x54x19",
  },
  {
    name: "Three Piece Almirah",
    sku: "EP-017-three-piece-almirah",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 39200,
    description: "Plain Bit",
    size: "72x60x19",
  },
  {
    name: "Three Piece Almirah- HV",
    sku: "EP-018-three-piece-almirah-hv",
    category: "Household Products",
    material: "Steel",
    color: "Enamel Paint",
    price: 48450,
    description: "Slopin Bit",
    size: "75x66x21",
  },
  {
    name: "One Locker Office Almirah",
    sku: "EP-019-one-locker-office-almirah",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 10300,
    description: "",
    size: "66x34x17",
  },
  {
    name: "One Locker Office Almirah- HV",
    sku: "EP-020-one-locker-office-almirah-hv",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 11500,
    description: "",
    size: "66x34x17",
  },
  {
    name: "Bookcase - 4 shelves",
    sku: "EP-021-bookcase-4-shelves",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 14000,
    description: "",
    size: "66x34x13",
  },
  {
    name: "Glass Door Almirah - 4 shelves",
    sku: "EP-022-glass-door-almirah-4-shelves",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 13500,
    description: "",
    size: "66x34x19",
  },
  {
    name: "One Locker Office Almirah",
    sku: "EP-023-one-locker-office-almirah",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 11000,
    description: "",
    size: "72x36x19",
  },
  {
    name: "One Locker Office Almirah - HV",
    sku: "EP-024-one-locker-office-almirah-hv",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 12500,
    description: "",
    size: "72x36x19",
  },
  {
    name: "Bookcase - 4 shelves",
    sku: "EP-025-bookcase-4-shelves",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 15800,
    description: "",
    size: "72x36x15",
  },
  {
    name: "Glass Door Almirah- 4 shelves",
    sku: "EP-026-glass-door-almirah-4-shelves",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 16000,
    description: "",
    size: "72x36x19",
  },
  {
    name: "One Locker Office Almirah - HV",
    sku: "EP-027-one-locker-office-almirah-hv",
    category: "Office Items",
    material: "Steel",
    color: "Enamel Paint",
    price: 15000,
    description: "",
    size: "78x36x19",
  },
  {
    name: "Filing Cabinet - 3 Drawer",
    sku: "EP-028-filing-cabinet-3-drawer",
    category: "Filling Cabinet Series",
    material: "Steel",
    color: "Enamel Paint",
    price: 16050,
    description: "",
    size: "42x18x24",
  },
  {
    name: "Filing Cabinet - 4 Drawer",
    sku: "EP-029-filing-cabinet-4-drawer",
    category: "Filling Cabinet Series",
    material: "Steel",
    color: "Enamel Paint",
    price: 19800,
    description: "",
    size: "54x18x24",
  },
  {
    name: "Single Table (30\" x 48\")",
    sku: "EP-030-single-table-30x48-3-drawer",
    category: "Table Series",
    material: "Steel",
    color: "Enamel Paint",
    price: 8200,
    description: "3 drawer",
    size: "48x24x30",
  },
  {
    name: "Single Table (30\" x 48\")",
    sku: "EP-031-single-table-30x48-1-drawer",
    category: "Table Series",
    material: "Steel",
    color: "Enamel Paint",
    price: 7000,
    description: "1 Drawer, 1 cabinet",
    size: "48x24x30",
  },
  {
    name: "Double Table (30\" x 54\")",
    sku: "EP-032-double-table-30x54",
    category: "Table Series",
    material: "Steel",
    color: "Enamel Paint",
    price: 11500,
    description: "3 Drawer, 1 cabinet",
    size: "54x30x30",
  },
  {
    name: "Open Rack (5 Shelves)",
    sku: "EP-033-open-rack-5-shelves",
    category: "Rack Series",
    material: "Steel",
    color: "Enamel Paint",
    price: 6000,
    description: "",
    size: "72x35x12",
  },
  {
    name: "Open Rack (6 Shelves)",
    sku: "EP-034-open-rack-6-shelves",
    category: "Rack Series",
    material: "Steel",
    color: "Enamel Paint",
    price: 6800,
    description: "",
    size: "78x35x12",
  },
];

function splitSize(size: string) {
  if (!size.includes("x")) {
    return { height: null, width: null, length: null, sizeLabel: size };
  }

  const [heightRaw, widthRaw, lengthRaw] = size.split("x").map((value) => Number(value.trim()));
  return {
    height: Number.isFinite(heightRaw) ? heightRaw : null,
    width: Number.isFinite(widthRaw) ? widthRaw : null,
    length: Number.isFinite(lengthRaw) ? lengthRaw : null,
    sizeLabel: null,
  };
}

async function main() {
  const user = await basePrisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    select: { id: true, tenantId: true },
  });

  if (!user) {
    throw new Error(`User not found for ${TARGET_EMAIL}`);
  }

  await tenantStorage.run({ tenantId: user.tenantId }, async () => {
    const warehouse = await prisma.warehouse.findFirst({
      orderBy: { createdAt: "asc" },
    });

    const taxRate = await prisma.taxRate.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: "asc" },
    });

    for (const item of enamelPriceList) {
      const existing = await prisma.product.findFirst({
        where: { sku: item.sku },
        select: { id: true },
      });

      if (existing) {
        continue;
      }

      const { height, width, length, sizeLabel } = splitSize(item.size);

      const created = await prisma.product.create({
        data: {
          name: item.name,
          sku: item.sku,
          category: item.category,
          description: item.description || undefined,
          costPrice: item.price,
          sellingPrice: item.price,
          material: item.material,
          color: item.color,
          height,
          width,
          length,
          status: "ACTIVE",
          lowStockThreshold: 5,
          taxRateId: taxRate?.id,
          variants: {
            create: [
              {
                variantName: "Standard",
                skuVariant: item.sku,
                additionalCost: 0,
                stockQuantity: 0,
                sizeLabel,
              },
            ],
          },
        },
        include: { variants: true },
      });

      if (warehouse) {
        for (const variant of created.variants) {
          await prisma.inventory.create({
            data: {
              productVariantId: variant.id,
              warehouseId: warehouse.id,
              quantity: 0,
              status: "IN_STOCK",
            },
          });
        }
      }
    }
  });
}

main()
  .then(() => basePrisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await basePrisma.$disconnect();
    process.exit(1);
  });
