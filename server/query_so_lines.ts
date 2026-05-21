import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const invoice = await prisma.taxInvoice.findFirst({
    where: { invoiceNumber: 'INV-2082/83-0001' },
    include: { salesOrder: { include: { lineItems: { include: { productVariant: { include: { product: true } } } } } } }
  });
  console.log(JSON.stringify(invoice?.salesOrder?.lineItems.map(li => ({
    productName: li.productVariant?.product.name,
    qty: li.quantity,
    unitPrice: li.unitPrice,
    amount: (li.quantity * Number(li.unitPrice)) - Number(li.discountAmount)
  })), null, 2));
}
main();
