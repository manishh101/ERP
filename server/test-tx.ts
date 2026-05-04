import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const p1 = await prisma.payment.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!p1) return;
  const sameTime = await prisma.payment.findMany({ where: { createdAt: p1.createdAt }});
  console.log("Payments created at exactly", p1.createdAt);
  console.log(sameTime.map(p => ({ id: p.id, amount: p.amount, salesOrderId: p.salesOrderId })));
}
main();
