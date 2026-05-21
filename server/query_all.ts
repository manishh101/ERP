import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const soLineItems = await prisma.salesOrderLineItem.findMany({
    where: { unitPrice: 6499.99 }
  });
  console.log("SO line items with 6499.99:", soLineItems.length);
  
  const invLineItems = await prisma.taxInvoiceLineItem.findMany({
    where: { unitPrice: 6499.99 }
  });
  console.log("Invoice line items with 6499.99:", invLineItems.length);
}
main();
