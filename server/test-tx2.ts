import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { recordPayment } from './src/modules/payments/payment.service';

async function main() {
  const cust = await prisma.customer.findFirst({ include: { salesOrders: true } });
  if (!cust) return;
  // create two unpaid orders
  const o1 = await prisma.salesOrder.create({ data: { customerId: cust.id, balanceDue: 100, orderAmount: 100, status: 'CONFIRMED' }});
  const o2 = await prisma.salesOrder.create({ data: { customerId: cust.id, balanceDue: 200, orderAmount: 200, status: 'CONFIRMED' }});
  
  const payment = await recordPayment({
    salesOrderId: o1.id,
    amount: 250,
    method: 'CASH',
    bsDate: '2081-01-01',
    fiscalYear: '2081/82'
  });

  const all = await prisma.payment.findMany({ where: { salesOrderId: { in: [o1.id, o2.id] } } });
  console.log("All payments for this tx:");
  console.log(all.map(p => ({ amount: p.amount, createdAt: p.createdAt.getTime() })));
}
main();
