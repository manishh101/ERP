import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const order = await prisma.salesOrder.findUnique({
    where: { id: 'cmopcs8qr06duf5rfp6sk73bd' },
    include: { payments: true }
  });
  console.log(JSON.stringify(order?.payments, null, 2));
}

main().finally(() => prisma.$disconnect());
