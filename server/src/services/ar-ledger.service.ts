import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const arLedgerService = {
  /**
   * Fetch AR statements for a customer
   */
  getStatement: async (customerId: string, startDate?: string, endDate?: string) => {
    const where: any = { customerId };
    
    if (startDate || endDate) {
      where.bsDate = {};
      if (startDate) where.bsDate.gte = startDate;
      if (endDate) where.bsDate.lte = endDate;
    }

    const entries = await prisma.arLedger.findMany({
      where,
      orderBy: { entryDate: 'asc' },
    });

    return entries;
  },

  /**
   * Post a debit entry for a sales order (increases AR balance)
   */
  postDebit: async (customerId: string, salesOrderId: string, amount: number, fiscalYear: string, bsDate: string, narration: string) => {
    return prisma.$transaction(async (tx) => {
      const lastEntry = await tx.arLedger.findFirst({
        where: { customerId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });
      
      const newBalance = (lastEntry?.runningBalance ? Number(lastEntry.runningBalance) : 0) + amount;
      
      await tx.customer.update({
        where: { id: customerId },
        data: { outstandingBalance: newBalance }
      });
      
      return tx.arLedger.create({
        data: {
          customerId,
          salesOrderId,
          entryType: 'DEBIT',
          amount,
          runningBalance: newBalance,
          fiscalYear,
          bsDate,
          entryDate: new Date(),
          narration
        }
      });
    });
  },

  /**
   * Post a credit entry for a payment (decreases AR balance)
   */
  postCredit: async (customerId: string, paymentId: string, salesOrderId: string, amount: number, fiscalYear: string, bsDate: string, narration: string) => {
    return prisma.$transaction(async (tx) => {
      const lastEntry = await tx.arLedger.findFirst({
        where: { customerId },
        orderBy: [{ entryDate: 'desc' }, { id: 'desc' }],
      });
      
      const newBalance = (lastEntry?.runningBalance ? Number(lastEntry.runningBalance) : 0) - amount;
      
      await tx.customer.update({
        where: { id: customerId },
        data: { outstandingBalance: newBalance }
      });

      return tx.arLedger.create({
        data: {
          customerId,
          paymentId,
          salesOrderId,
          entryType: 'CREDIT',
          amount,
          runningBalance: newBalance,
          fiscalYear,
          bsDate,
          entryDate: new Date(),
          narration
        }
      });
    });
  }
};
