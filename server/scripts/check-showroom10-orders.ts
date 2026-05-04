import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const customer = await prisma.customer.findFirst({
    where: { name: "Showroom Partner 10" },
    include: {
      salesOrders: {
        include: {
          payments: true
        }
      }
    }
  });

  if (!customer) return;

  for (const order of customer.salesOrders) {
    const orderBilled = Number(order.orderAmount || 0);
    const orderCollected = Number(order.paidAmount || 0);
    const orderDue = Number(order.balanceDue || 0);
    
    // Check if billed != collected + due
    if (orderBilled !== orderCollected + orderDue) {
      console.log(`Order ${order.id}: Billed=${orderBilled}, Collected=${orderCollected}, Due=${orderDue}. Math is broken!`);
    } else {
        console.log(`Order ${order.id}: Billed=${orderBilled}, Collected=${orderCollected}, Due=${orderDue}.`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
