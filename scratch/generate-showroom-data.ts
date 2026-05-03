import { PrismaClient, PaymentMethod, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function main() {
  console.log('Generating dummy showroom data...');

  const user = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!user) throw new Error("No admin user found");

  const variants = await prisma.productVariant.findMany({
    include: { product: true }
  });

  if (variants.length === 0) {
    throw new Error('No products found in DB. Please seed products first.');
  }

  // Clear customers of type SHOWROOM and their related data to avoid duplicates if run multiple times
  const existingShowrooms = await prisma.customer.findMany({ where: { type: 'SHOWROOM' } });
  for (const s of existingShowrooms) {
    await prisma.customer.delete({ where: { id: s.id } }).catch(() => {});
  }

  // 1. Create 15 Showroom customers
  const showrooms = [];
  for (let i = 1; i <= 15; i++) {
    const customer = await prisma.customer.create({
      data: {
        name: `Showroom Partner ${i}`,
        email: `showroom${i}@example.com`,
        phone: `9800000${i.toString().padStart(3, '0')}`,
        type: 'SHOWROOM',
        creditLimit: randomInt(500000, 2000000),
        address: `Showroom Address ${i}, Biratnagar`,
        district: 'Morang',
        invoicePref: 'VAT',
        vatNo: `300${i.toString().padStart(6, '0')}`,
        outstandingBalance: 0
      }
    });
    showrooms.push(customer);
  }
  console.log(`Created ${showrooms.length} showrooms.`);

  // Dates: from 12 months ago to now
  const now = new Date();
  const months = [];
  for (let m = 11; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 15);
    months.push(d);
  }

  for (const showroom of showrooms) {
    let runningBalance = 0;
    let lastOrderId = null; // Store order ID to link payments

    for (const monthDate of months) {
      // Generate 3-4 orders for this month
      const numOrders = randomInt(3, 4);
      for (let o = 0; o < numOrders; o++) {
        // Random day in this month
        const orderDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), randomInt(1, 28));
        
        const numProducts = randomInt(6, 7);
        const selectedVariants = getRandomElements(variants, numProducts);

        let orderAmount = 0;
        const lineItems = selectedVariants.map(v => {
          const qty = randomInt(2, 5);
          const price = Number(v.product.sellingPrice) + Number(v.additionalCost);
          orderAmount += qty * price;
          return {
            productVariantId: v.id,
            quantity: qty,
            unitPrice: price,
            discountPct: 0,
            discountAmount: 0,
            isCustom: false
          };
        });

        // Create order
        const order = await prisma.salesOrder.create({
          data: {
            customerId: showroom.id,
            status: 'DELIVERED',
            orderAmount: orderAmount,
            paidAmount: 0,
            balanceDue: orderAmount,
            orderDate: orderDate,
            deliveryDate: orderDate,
            bsDate: "2081-01-01", // Dummy
            fiscalYear: "2081/82",
            isCustomOrder: false,
            lineItems: {
              create: lineItems
            }
          }
        });
        lastOrderId = order.id;

        runningBalance += orderAmount;

        // Debit AR Ledger
        await prisma.arLedger.create({
          data: {
            customerId: showroom.id,
            salesOrderId: order.id,
            entryType: "DEBIT",
            amount: orderAmount,
            runningBalance: runningBalance,
            fiscalYear: "2081/82",
            bsDate: "2081-01-01",
            entryDate: orderDate,
            narration: `Sales Order ${order.id}`
          }
        });

        // Create TaxInvoice (Estimate)
        await prisma.taxInvoice.create({
          data: {
            soId: order.id,
            invoiceNumber: `EST-${order.id}`, // Unique ID
            invoiceType: "ESTIMATE",
            issueDate: orderDate,
            status: "SENT",
            invoiceAmount: orderAmount,
            taxAmount: 0,
            fiscalYear: "2081/82",
            bsDate: "2081-01-01",
            lineItems: {
              create: lineItems.map(item => ({
                productVariantId: item.productVariantId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discountPct: 0,
                discountAmount: 0
              }))
            }
          }
        });
      }

      // Make a payment at the end of the month
      if (runningBalance > 0 && lastOrderId) {
        // Pay 70% to 100% of the balance
        const payPercent = randomInt(70, 100) / 100;
        const paymentAmount = Math.floor(runningBalance * payPercent);

        if (paymentAmount > 0) {
          const paymentDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 28);
          const payment = await prisma.payment.create({
            data: {
              salesOrderId: lastOrderId, // Link to last order
              amount: paymentAmount,
              method: 'BANK',
              paymentDate: paymentDate,
              note: `Monthly payment`
            }
          });

          runningBalance -= paymentAmount;

          await prisma.arLedger.create({
            data: {
              customerId: showroom.id,
              salesOrderId: lastOrderId,
              paymentId: payment.id,
              entryType: "CREDIT",
              amount: paymentAmount,
              runningBalance: runningBalance,
              fiscalYear: "2081/82",
              bsDate: "2081-01-01", 
              entryDate: paymentDate,
              narration: "Payment received"
            }
          });
        }
      }
    }

    // Update customer's final outstanding balance
    await prisma.customer.update({
      where: { id: showroom.id },
      data: { outstandingBalance: runningBalance }
    });
  }

  console.log('✅ Demo data generation complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
