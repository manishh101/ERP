/**
 * clear-data.ts
 * Clears ALL data from the database EXCEPT the products and product_variants tables.
 * Deletes in foreign-key-safe order.
 *
 * Usage:  npx tsx scripts/clear-data.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Clearing all data EXCEPT products & product_variants...\n');

  // Order matters — delete children before parents to respect FK constraints.
  // We use deleteMany() which is safe and respects cascades.

  // 1. Leaf / audit tables
  console.log('  Deleting audit_logs...');
  await prisma.auditLog.deleteMany();

  // 2. Bank reconciliation
  console.log('  Deleting bank_statement_lines...');
  await prisma.bankStatementLine.deleteMany();
  console.log('  Deleting bank_statement_imports...');
  await prisma.bankStatementImport.deleteMany();

  // 3. VAT & AR ledger
  console.log('  Deleting vat_register...');
  await prisma.vatRegister.deleteMany();
  console.log('  Deleting ar_ledger...');
  await prisma.arLedger.deleteMany();

  // 4. Payments (links to SO, PO, SupplierInvoice)
  console.log('  Deleting payments...');
  await prisma.payment.deleteMany();

  // 5. Deliveries
  console.log('  Deleting deliveries...');
  await prisma.delivery.deleteMany();

  // 6. Tax invoices (line items → invoices)
  console.log('  Deleting tax_invoice_line_items...');
  await prisma.taxInvoiceLineItem.deleteMany();
  console.log('  Deleting tax_invoices...');
  await prisma.taxInvoice.deleteMany();

  // 7. Sales orders (line items → orders)
  console.log('  Deleting so_line_items...');
  await prisma.salesOrderLineItem.deleteMany();
  console.log('  Deleting sales_orders...');
  await prisma.salesOrder.deleteMany();

  // 8. Goods receipts (lines → receipts)
  console.log('  Deleting goods_receipt_lines...');
  await prisma.goodsReceiptLine.deleteMany();
  console.log('  Deleting goods_receipts...');
  await prisma.goodsReceipt.deleteMany();

  // 9. Purchase orders (line items → orders)
  console.log('  Deleting po_line_items...');
  await prisma.purchaseOrderLineItem.deleteMany();
  console.log('  Deleting purchase_orders...');
  await prisma.purchaseOrder.deleteMany();

  // 10. Supplier invoices
  console.log('  Deleting supplier_invoices...');
  await prisma.supplierInvoice.deleteMany();

  // 11. Suppliers & Customers
  console.log('  Deleting suppliers...');
  await prisma.supplier.deleteMany();
  console.log('  Deleting customers...');
  await prisma.customer.deleteMany();

  // 12. Stock movements & Inventory
  console.log('  Deleting stock_movements...');
  await prisma.stockMovement.deleteMany();
  console.log('  Deleting inventory...');
  await prisma.inventory.deleteMany();

  // 13. Warehouses
  console.log('  Deleting warehouses...');
  await prisma.warehouse.deleteMany();

  // 14. Journal entries (lines → entries)
  console.log('  Deleting journal_entry_lines...');
  await prisma.journalEntryLine.deleteMany();
  console.log('  Deleting journal_entries...');
  await prisma.journalEntry.deleteMany();

  // 15. Chart of accounts
  console.log('  Deleting accounts...');
  await prisma.account.deleteMany();

  // 16. Expenses
  console.log('  Deleting expenses...');
  await prisma.expense.deleteMany();

  // 17. Counters
  console.log('  Deleting invoice_counters...');
  await prisma.invoiceCounter.deleteMany();
  console.log('  Deleting receipt_counters...');
  await prisma.receiptCounter.deleteMany();
  console.log('  Deleting estimate_counters...');
  await prisma.estimateCounter.deleteMany();

  // 18. Settings (company profile, currency, notifications, invoice template)
  console.log('  Deleting company_profiles...');
  await prisma.companyProfile.deleteMany();
  console.log('  Deleting currency_settings...');
  await prisma.currencySetting.deleteMany();
  console.log('  Deleting notification_settings...');
  await prisma.notificationSetting.deleteMany();
  console.log('  Deleting invoice_templates...');
  await prisma.invoiceTemplate.deleteMany();

  // 19. Tax rates (products reference them, but it's optional — clear the FK first)
  // We need to nullify the taxRateId on products before deleting tax rates
  console.log('  Nullifying product tax rate references...');
  await prisma.product.updateMany({
    where: { taxRateId: { not: null } },
    data: { taxRateId: null },
  });
  console.log('  Deleting tax_rates...');
  await prisma.taxRate.deleteMany();

  // 20. Users
  console.log('  Deleting users...');
  await prisma.user.deleteMany();

  // --- Products & ProductVariants are PRESERVED ---

  console.log('\n✅ Done! All data cleared except products & product_variants.');

  // Print counts to confirm
  const productCount = await prisma.product.count();
  const variantCount = await prisma.productVariant.count();
  console.log(`   📦 Products remaining: ${productCount}`);
  console.log(`   🏷️  Variants remaining: ${variantCount}`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
