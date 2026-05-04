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

  if (!customer) {
    console.log("Customer not found.");
    return;
  }

  let totalBilled = 0;
  let totalOrderCollected = 0;
  let totalOrderOutstanding = 0;

  for (const order of customer.salesOrders) {
    const orderBilled = Number(order.orderAmount || 0);
    const orderCollected = Number(order.paidAmount || 0);
    const orderDue = Number(order.balanceDue || 0);
    totalBilled += orderBilled;
    totalOrderCollected += orderCollected;
    totalOrderOutstanding += orderDue;
  }

  console.log("Customer Name:", customer.name);
  console.log("Customer DB outstandingBalance:", customer.outstandingBalance);
  console.log("====================");
  console.log("Total Billed from Orders:", totalBilled);
  console.log("Total Collected from Orders:", totalOrderCollected);
  console.log("Total Outstanding from Orders:", totalOrderOutstanding);
  console.log("====================");
  console.log("Difference between Customer DB outstanding and Orders Outstanding:", Number(customer.outstandingBalance) - totalOrderOutstanding);
}

main().catch(console.error).finally(() => prisma.$disconnect());
