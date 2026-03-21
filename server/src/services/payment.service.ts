import { PrismaClient, PaymentMethod } from '@prisma/client';
import { getCurrentFiscalYear, getBsDate } from '../shared/fiscal-year.util';
import { ApiError } from '../utils/api-error';

const prisma = new PrismaClient();

export const paymentService = {
  recordCustomerPayment: async (data: { salesOrderId: string, amount: number, method: PaymentMethod, reference?: string, note?: string, paymentDate?: Date }) => {
    const order = await prisma.salesOrder.findUnique({ where: { id: data.salesOrderId } });
    if (!order) throw new ApiError(404, "Sales order not found");

    const paymentDate = data.paymentDate || new Date();
    const bsDate = getBsDate(paymentDate);
    const fiscalYear = getCurrentFiscalYear(paymentDate);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          salesOrderId: data.salesOrderId,
          amount: data.amount,
          method: data.method,
          reference: data.reference,
          note: data.note,
          paymentDate,
          bsDate,
        }
      });

      await tx.salesOrder.update({
        where: { id: data.salesOrderId },
        data: {
          depositAmount: { increment: data.amount },
          balanceDue: { decrement: data.amount },
          status: "DEPOSIT_PAID" 
          // Note: depending on the order lifecycle, this might safely stay as DEPOSIT_PAID or advance if fully paid
        }
      });

      const lastEntry = await tx.arLedger.findFirst({
        where: { customerId: order.customerId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });
      const newBalance = (lastEntry?.runningBalance ? Number(lastEntry.runningBalance) : 0) - data.amount;

      await tx.arLedger.create({
        data: {
          customerId: order.customerId,
          salesOrderId: order.id,
          paymentId: payment.id,
          entryType: 'CREDIT',
          amount: data.amount,
          runningBalance: newBalance,
          fiscalYear,
          bsDate,
          entryDate: payment.paymentDate,
          narration: `Payment received - ${data.method}`
        }
      });

      // SYNC CUSTOMER BALANCE
      await tx.customer.update({
        where: { id: order.customerId },
        data: { outstandingBalance: newBalance }
      });

      return payment;
    });
  }
};
