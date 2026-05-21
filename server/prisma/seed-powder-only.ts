import { basePrisma, prisma, tenantStorage } from "../src/config/prisma";

const TARGET_EMAIL = "shreemanishfurniture@gmail.com";

const powderPriceList = [
  {
    name: "66 Daraj - Normal",
    sku: "PC-001-66-daraj-normal",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 11200,
    description: "1 Locker Mirror",
    size: "66x34x18",
  },
  {
    name: "66 Daraj",
    sku: "PC-002-66-daraj",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 13500,
    description: "1 locker Inter Locker Mirror",
    size: "66x34x18",
  },
  {
    name: "66 Daraj",
    sku: "PC-003-66-daraj",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 14500,
    description: "1 locker 1 Drawer Mirror",
    size: "66x34x18",
  },
  {
    name: "72 Daraj",
    sku: "PC-004-72-daraj",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 15500,
    description: "1 Locker Inter locker Mirror",
    size: "72x36x19",
  },
  {
    name: "72 Daraj",
    sku: "PC-005-72-daraj",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 16500,
    description: "1 locker 1 Drawer Inter locker Mirror",
    size: "72x36x19",
  },
  {
    name: "72 Daraj - super",
    sku: "PC-006-72-daraj-super",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 18800,
    description: "1 locker 1 Drawer Mirror Maruti Lock",
    size: "72x38x19",
  },
  {
    name: "Shreeman Shreemati",
    sku: "PC-007-shreeman-shreemati",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 22800,
    description: "Double Handle Inter Locker Chudi Minar Shoe Drawer Double Mirror",
    size: "72x42x19",
  },
  {
    name: "Shreeman Shreemati - super",
    sku: "PC-008-shreeman-shreemati-super",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 20800,
    description: "2 Locker, 1Secret Chamber ,Double Mirror",
    size: "72x42x19",
  },
  {
    name: "Shreeman Shreemati - super",
    sku: "PC-009-shreeman-shreemati-super",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 20800,
    description: "1 Locker, chudi box , 1 Secret chamber, Double Mirror",
    size: "72x42x19",
  },
  {
    name: "Janki Model (78\") - HV",
    sku: "PC-010-janki-model-78-hv",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 30500,
    description: "1 Locker, 2 Drawer, 1Secret chamber",
    size: "78x36x20",
  },
  {
    name: "Sansaar Model (78\") - HV",
    sku: "PC-011-sansaar-model-78-hv",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 34500,
    description: "1 Locker, 1 Drawer, 2 Large external drawer",
    size: "78x36x20",
  },
  {
    name: "One Door Dressing",
    sku: "PC-012-one-door-dressing",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 17500,
    description: "2 Drawer,chudi box, Maruti Lock",
    size: "72x20x18",
  },
  {
    name: "Two Door Dressing",
    sku: "PC-013-two-door-dressing",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 21900,
    description: "One Locker, Double Drawer, Chudi , Maruti lock",
    size: "72x38x19",
  },
  {
    name: "Three Door Dressing",
    sku: "PC-014-three-door-dressing",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 34700,
    description: "One Locker, Double Drawer, Maruti lock",
    size: "72x54x19",
  },
  {
    name: "Three Door One Locker Mirror - non Folding",
    sku: "PC-015-three-door-one-locker-mirror-non-folding",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 26700,
    description: "",
    size: "72x54x19",
  },
  {
    name: "Three Door One Locker Mirror - Folding",
    sku: "PC-016-three-door-one-locker-mirror-folding",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 34500,
    description: "",
    size: "72x54x19",
  },
  {
    name: "Three Door One Locker One Drawer Mirror",
    sku: "PC-017-three-door-one-locker-one-drawer-mirror",
    category: "Household Products",
    material: "Steel",
    color: "Powder Coated",
    price: 26700,
    description: "1 Secret chamber",
    size: "72x54x19",
  },
  {
    name: "One Locker Office Almirah",
    sku: "PC-018-one-locker-office-almirah",
    category: "Office Items",
    material: "Steel",
    color: "Powder Coated",
    price: 12950,
    description: "",
    size: "66x34x17",
  },
  {
    name: "One Locker Office Almirah",
    sku: "PC-019-one-locker-office-almirah",
    category: "Office Items",
    material: "Steel",
    color: "Powder Coated",
    price: 14900,
    description: "",
    size: "72x36x19",
  },
  {
    name: "One Locker Office Almirah",
    sku: "PC-020-one-locker-office-almirah",
    category: "Office Items",
    material: "Steel",
    color: "Powder Coated",
    price: 16900,
    description: "",
    size: "78x36x19",
  },
  {
    name: "Bookcase - 4 shelves",
    sku: "PC-021-bookcase-4-shelves",
    category: "Bookcase Series",
    material: "Steel",
    color: "Powder Coated",
    price: 14800,
    description: "",
    size: "66x34x13",
  },
  {
    name: "Bookcase - 4 shelves",
    sku: "PC-022-bookcase-4-shelves",
    category: "Bookcase Series",
    material: "Steel",
    color: "Powder Coated",
    price: 16500,
    description: "",
    size: "72x36x15",
  },
  {
    name: "66\" Glass Door Almirah - 4 shelves",
    sku: "PC-023-66-glass-door-almirah-4-shelves",
    category: "Glass Door Series",
    material: "Steel",
    color: "Powder Coated",
    price: 14250,
    description: "",
    size: "66x34x19",
  },
  {
    name: "72\" Glass Door Almirah- 4 shelves",
    sku: "PC-024-72-glass-door-almirah-4-shelves",
    category: "Glass Door Series",
    material: "Steel",
    color: "Powder Coated",
    price: 16500,
    description: "",
    size: "72x36x19",
  },
  {
    name: "Filing Cabinet - 3 Drawer",
    sku: "PC-025-filing-cabinet-3-drawer",
    category: "Filling Cabinet Series",
    material: "Steel",
    color: "Powder Coated",
    price: 18800,
    description: "",
    size: "42x18x24",
  },
  {
    name: "Filing Cabinet - 4 Drawer",
    sku: "PC-026-filing-cabinet-4-drawer",
    category: "Filling Cabinet Series",
    material: "Steel",
    color: "Powder Coated",
    price: 21000,
    description: "",
    size: "54x18x24",
  },
  {
    name: "Single Table (30\" x 48\")",
    sku: "PC-027-single-table-30x48-3-drawer",
    category: "Table Series",
    material: "Steel",
    color: "Powder Coated",
    price: 9100,
    description: "3 drawer",
    size: "48x24x30",
  },
  {
    name: "Single Table (30\" x 48\")",
    sku: "PC-028-single-table-30x48-1-drawer",
    category: "Table Series",
    material: "Steel",
    color: "Powder Coated",
    price: 8100,
    description: "1 Drawer , 1 cabinet",
    size: "48x24x30",
  },
  {
    name: "Double Table (30\" x 54\")",
    sku: "PC-029-double-table-30x54",
    category: "Table Series",
    material: "Steel",
    color: "Powder Coated",
    price: 12900,
    description: "3 Drawer , 1 cabinet",
    size: "54x30x30",
  },
  {
    name: "Double Table (30\" x 54\") - HV",
    sku: "PC-030-double-table-30x54-hv",
    category: "Table Series",
    material: "Steel",
    color: "Powder Coated",
    price: 18900,
    description: "3 Drawer , 1 cabinet",
    size: "54x30x30",
  },
  {
    name: "Open Rack (5 Shelves)",
    sku: "PC-031-open-rack-5-shelves",
    category: "Rack Series",
    material: "Steel",
    color: "Powder Coated",
    price: 6800,
    description: "",
    size: "72x35x13",
  },
  {
    name: "Open Rack (6 Shelves)",
    sku: "PC-032-open-rack-6-shelves",
    category: "Rack Series",
    material: "Steel",
    color: "Powder Coated",
    price: 7500,
    description: "",
    size: "78x35x13",
  },
  {
    name: "Student Table-Bench (3 Seater)",
    sku: "PC-033-student-table-bench-3-seater",
    category: "Desk Bench Series",
    material: "Steel",
    color: "Powder Coated",
    price: 9950,
    description: "",
    size: "54x18x30",
  },
  {
    name: "Locker - 12 Door",
    sku: "PC-034-locker-12-door",
    category: "Locker Series",
    material: "Steel",
    color: "Powder Coated",
    price: 30000,
    description: "",
    size: "With Lock",
  },
  {
    name: "Locker - 16 Door",
    sku: "PC-035-locker-16-door",
    category: "Locker Series",
    material: "Steel",
    color: "Powder Coated",
    price: 40000,
    description: "",
    size: "With Lock",
  },
  {
    name: "Locker - 20 Door",
    sku: "PC-036-locker-20-door",
    category: "Locker Series",
    material: "Steel",
    color: "Powder Coated",
    price: 45000,
    description: "",
    size: "With Lock",
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

    for (const item of powderPriceList) {
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
