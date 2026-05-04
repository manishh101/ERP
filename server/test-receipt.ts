import { PrismaClient } from '@prisma/client';
import { recordPayment } from './src/modules/payments/payment.service';
import { renderReceiptPdfBuffer } from './src/lib/pdf/receipt';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const cust = await prisma.customer.create({ data: { name: "Multi Order Customer", type: "RETAIL", address: "KTM" }});
  
  // Create product to make it realistic
  const prod = await prisma.product.create({ data: { name: "Test Sofa", sku: "SKU-SOFA-99", category: "SOFA", costPrice: 100, sellingPrice: 200 }});
  const variant = await prisma.productVariant.create({ data: { productId: prod.id, variantName: "Default", skuVariant: "SKU-SOFA-99-DEF", stockQuantity: 10 }});

  const o1 = await prisma.salesOrder.create({ 
    data: { 
      customerId: cust.id, balanceDue: 200000, orderAmount: 200000, status: 'CONFIRMED',
      lineItems: { create: [{ productVariantId: variant.id, quantity: 1, unitPrice: 200000 }]}
    }
  });
  const o2 = await prisma.salesOrder.create({ 
    data: { 
      customerId: cust.id, balanceDue: 150000, orderAmount: 150000, status: 'CONFIRMED',
      lineItems: { create: [{ productVariantId: variant.id, quantity: 1, unitPrice: 150000 }]}
    }
  });
  
  // Pay 150,000 against O1 (first order)
  const paymentRecord = await recordPayment({
    salesOrderId: o1.id,
    amount: 150000,
    method: 'BANK',
    bsDate: '2081-01-01',
    fiscalYear: '2081/82'
  });

  // Since we modified the route not the service, the service returns one payment id
  // Let's mimic what the route does:
  const timeMin = new Date(paymentRecord.createdAt.getTime() - 5000);
  const timeMax = new Date(paymentRecord.createdAt.getTime() + 5000);

  const groupedPayments = await prisma.payment.findMany({
    where: {
      createdAt: { gte: timeMin, lte: timeMax },
      method: paymentRecord.method,
      salesOrder: { customerId: cust.id },
    },
    include: {
      salesOrder: {
        include: {
          customer: true,
          lineItems: { include: { productVariant: { include: { product: true } } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const companyProfile = await prisma.companyProfile.findFirst() || {};
  const buffer = await renderReceiptPdfBuffer({ payments: groupedPayments, companyProfile });
  fs.writeFileSync('test-multi-receipt.pdf', buffer);
  console.log("Generated test-multi-receipt.pdf successfully with", groupedPayments.length, "payments.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
