import { basePrisma } from "../src/config/prisma";

async function deletePayment(paymentId: string) {
  if (!paymentId) {
    console.error("Error: Please provide a payment ID. Usage: npx tsx prisma/delete-payment.ts <PAYMENT_ID>");
    process.exit(1);
  }

  console.log(`Starting safe manual deletion of payment: ${paymentId}...`);

  try {
    await basePrisma.$transaction(async (tx) => {
      // 1. Fetch payment details
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { salesOrder: true },
      });

      if (!payment) {
        throw new Error(`Payment with ID ${paymentId} not found.`);
      }

      const amountNum = Number(payment.amount);
      const salesOrderId = payment.salesOrderId;

      console.log(`Found payment of ${amountNum} associated with Sales Order: ${salesOrderId}`);

      // 2. Update Sales Order if applicable
      if (salesOrderId) {
        const order = await tx.salesOrder.findUnique({
          where: { id: salesOrderId },
        });

        if (order) {
          const newPaidAmount = Math.max(0, Number(order.paidAmount) - amountNum);
          const newBalanceDue = Number(order.balanceDue) + amountNum;
          
          let newStatus = order.status;
          if (newBalanceDue > 0 && order.status === "PAID") {
            newStatus = "CONFIRMED";
          }

          console.log(`Updating Sales Order ${salesOrderId}:`);
          console.log(`  - paidAmount: ${order.paidAmount} -> ${newPaidAmount}`);
          console.log(`  - balanceDue: ${order.balanceDue} -> ${newBalanceDue}`);
          console.log(`  - status: ${order.status} -> ${newStatus}`);

          await tx.salesOrder.update({
            where: { id: salesOrderId },
            data: {
              paidAmount: newPaidAmount,
              balanceDue: newBalanceDue,
              status: newStatus,
            },
          });
        }
      }

      // 3. Delete matching entries from bank statement lines (set to null)
      await tx.bankStatementLine.updateMany({
        where: { matchedPaymentId: paymentId },
        data: { matchedPaymentId: null },
      });

      // 4. Post Reversing AR Ledger Entry instead of physical deletion
      const ledgerEntry = await tx.arLedger.findFirst({
        where: { paymentId },
      });

      if (ledgerEntry && salesOrderId) {
        const order = await tx.salesOrder.findUnique({ where: { id: salesOrderId } });
        if (order) {
          const lastAr = await tx.arLedger.findFirst({
            where: { customerId: order.customerId },
            orderBy: [{ entryDate: "desc" }, { id: "desc" }],
          });
          const currentBal = lastAr ? Number(lastAr.runningBalance) : 0;

          const reversalEntry = await tx.arLedger.create({
            data: {
              tenantId: payment.tenantId,
              customerId: order.customerId,
              salesOrderId: salesOrderId,
              paymentId: paymentId,
              entryType: "DEBIT",
              amount: amountNum,
              runningBalance: currentBal + amountNum,
              fiscalYear: ledgerEntry.fiscalYear,
              bsDate: ledgerEntry.bsDate,
              entryDate: new Date(),
              narration: `Reversal of Payment ${paymentId}`,
            },
          });
          console.log(`Created AR Ledger reversal entry: ${reversalEntry.id}`);
        }
      }

      // 5. Soft-cancel / Reverse Payment note instead of destructive deletion
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          note: `[REVERSED] ${payment.note || "Payment voided"}`,
          amount: 0,
        },
      });

      console.log(`Payment ${paymentId} safely marked as REVERSED.`);

      // 6. Recalculate customer's outstanding balance
      if (salesOrderId) {
        const order = await tx.salesOrder.findUnique({
          where: { id: salesOrderId },
        });
        if (order) {
          const latestBalance = await tx.arLedger.findFirst({
            where: { customerId: order.customerId },
            orderBy: [{ entryDate: "desc" }, { id: "desc" }],
          });

          if (latestBalance) {
            await tx.customer.update({
              where: { id: order.customerId },
              data: { outstandingBalance: latestBalance.runningBalance },
            });
            console.log(`Synced Customer balance to: ${latestBalance.runningBalance}`);
          }
        }
      }
    });

    console.log("Safe reversal complete!");
  } catch (error: any) {
    console.error("Failed to delete payment:", error.message);
  }
}

const paymentId = process.argv[2];
deletePayment(paymentId);
