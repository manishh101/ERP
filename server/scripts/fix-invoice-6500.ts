import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.taxInvoiceLineItem.updateMany({
    where: {
      invoiceId: "cmpfdlyjg0001f53jsr0fxr2d",
      unitPrice: 6499.99
    } as any,
    data: {
      unitPrice: 6500
    }
  });

  const taxInvoice = await prisma.taxInvoice.findUnique({
    where: { id: "cmpfdlyjg0001f53jsr0fxr2d" },
    include: { lineItems: true }
  });

  if (taxInvoice) {
    let subtotal = 0;
    for (const item of taxInvoice.lineItems) {
      subtotal += Number(item.quantity) * Number(item.unitPrice) - Number(item.discountAmount || 0);
    }
    const vat = subtotal * 0.13;

    await prisma.taxInvoice.update({
      where: { id: taxInvoice.id },
      data: {
        invoiceAmount: subtotal,
        taxAmount: vat
      }
    });
    console.log("Updated invoice to:", subtotal, vat);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
