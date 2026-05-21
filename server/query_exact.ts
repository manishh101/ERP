import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const lineItem = await prisma.taxInvoiceLineItem.findFirst({
    where: { unitPrice: 6499.99 }
  });
  console.log(lineItem);
}
main();
