import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const so = await prisma.salesOrder.findFirst({
    orderBy: { createdAt: 'desc' },
    include: { lineItems: true }
  });
  console.log(JSON.stringify(so?.lineItems, null, 2));
}
main();
