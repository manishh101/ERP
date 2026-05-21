import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const soLineItems = await prisma.salesOrderLineItem.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(soLineItems.map(x => x.unitPrice));
}
main();
