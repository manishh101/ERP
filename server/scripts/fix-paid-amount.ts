import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting paidAmount sync...");

  const orders = await prisma.salesOrder.findMany({
    include: { payments: true }
  });

  console.log(`Found ${orders.length} orders to process.`);

  let updatedCount = 0;

  for (const order of orders) {
    const totalPaid = order.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const orderAmt = Number(order.orderAmount || 0);
    const newBalanceDue = Math.max(orderAmt - totalPaid, 0);

    // If the database values don't match reality, update them
    if (Number(order.paidAmount || 0) !== totalPaid || Number(order.balanceDue || 0) !== newBalanceDue) {
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: {
          paidAmount: totalPaid,
          balanceDue: newBalanceDue,
        }
      });
      updatedCount++;
    }
  }

  console.log(`Successfully synced ${updatedCount} orders.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
