import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const totalInDb = await prisma.payment.count();
  console.log("Total payments in DB:", totalInDb);

  const query: any = {};
  
  const where: any = query.search
    ? {
        OR: [
          { reference: { contains: query.search, mode: "insensitive" as const } },
          {
            salesOrder: {
              customer: { name: { contains: query.search, mode: "insensitive" as const } },
            },
          },
          {
            supplierInvoice: {
              supplier: { name: { contains: query.search, mode: "insensitive" as const } },
            },
          },
          {
            purchaseOrder: {
              supplier: { name: { contains: query.search, mode: "insensitive" as const } },
            },
          },
        ],
      }
    : {};

  const fetched = await prisma.payment.findMany({
    where,
    take: 50,
  });

  console.log("Fetched with where clause:", fetched.length);
}
main();
