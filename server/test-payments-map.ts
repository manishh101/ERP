import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const fetched = await prisma.payment.findMany({
    take: 50,
    include: {
        salesOrder: { include: { customer: true } },
        purchaseOrder: { include: { supplier: true } },
        supplierInvoice: { include: { supplier: true } },
    },
    orderBy: {
        paymentDate: "desc",
    },
  });

  console.log("Fetched raw:", fetched.length);
  const mapped = fetched.map(item => {
    try {
        let relatedEntity = "-";
        if (item.salesOrder?.customer) {
        relatedEntity = `Sales Order (Customer: ${item.salesOrder.customer.name})`;
        } else if (item.purchaseOrder?.supplier) {
        relatedEntity = `Purchase Order (Supplier: ${item.purchaseOrder.supplier.name})`;
        } else if (item.supplierInvoice?.supplier) {
        relatedEntity = `Supplier Invoice (Supplier: ${item.supplierInvoice.supplier.name})`;
        }
        return {
            id: item.id,
            date: item.paymentDate.toISOString(),
            amount: item.amount,
            method: item.method,
            reference: item.reference || "-",
            relatedEntity,
            bsDate: item.bsDate || "-",
        };
    } catch (e) {
        return null;
    }
  }).filter(Boolean);
  
  console.log("Mapped:", mapped.length);
}
main();
