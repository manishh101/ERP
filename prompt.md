# ERP System — Full Rebuild Prompt
### For use in Cursor / Windsurf AI coding assistant

---

## CONTEXT: What this codebase is

This is a Nepal-based business ERP system. The tech stack is:
- **Backend**: Node.js + TypeScript + Express + Prisma ORM + PostgreSQL
- **Frontend**: React + TypeScript + Vite + TailwindCSS + TanStack Query
- **PDF generation**: `@react-pdf/renderer` on the server
- **Validation**: Zod on both client and server

The repo is structured as a monorepo:
```
ERP/
  client/src/        ← React frontend
  server/src/        ← Express backend
  server/prisma/     ← Prisma schema + migrations + seed
```

---

## THE CORE BUSINESS REQUIREMENT (read this carefully before touching anything)

This is a Nepal business. It operates with **two completely separate financial tracks**:

### Track 1: AR Ledger (Accounts Receivable) — the commercial truth
- Based on the **actual order amount** agreed with the customer
- Used for: customer statements, what the customer owes, payment tracking, remaining balance
- This is what you show the customer when they ask "how much do I owe you?"
- **Source of truth**: `SalesOrder.orderAmount`

### Track 2: VAT Register — the tax document track
- Based on the **invoice amount** which the user manually enters and MAY be lower than the order amount
- Used for: IRD tax filing, VAT return, output VAT calculation
- This is what the accountant uses to file with the Inland Revenue Department (IRD) of Nepal
- **Source of truth**: `TaxInvoice.invoiceAmount` (entered by user, not computed)

### The golden rules that must NEVER be violated:
1. `Payment` records are linked to `SalesOrder`, **never** to `TaxInvoice`
2. `ArLedger` entries use `orderAmount`, **never** `invoiceAmount`
3. `VatRegister` entries use `invoiceAmount`, **never** `orderAmount`
4. Customer statements query `ArLedger` only — `TaxInvoice` amounts never appear in a customer statement
5. Some customers get no invoice at all — their orders still appear in the AR ledger
6. `TaxInvoice` is optional — 0 or 1 per `SalesOrder`
7. The invoice amount is always **user-entered** — never auto-computed from line items

---

## CURRENT PROBLEMS TO FIX (do all of these)

### Bug 1 — Customer ledger uses invoice amount, not order amount
**File**: `server/src/routes/customers.routes.ts`

Current broken code in `GET /:id/statement`:
```ts
// WRONG — skips orders with no invoice, uses invoice.total
const statementLines = customer.salesOrders.flatMap((order) => {
  if (!order.invoice) return [];  // ← WRONG: skips no-invoice orders
  return [
    { debit: toNumber(invoice.total), ... },  // ← WRONG: should be orderAmount
  ];
});
```

Fix: Statement must read from the new `ArLedger` table only.

### Bug 2 — Invoice auto-computes amount with hardcoded 13% VAT
**File**: `server/src/routes/invoices.routes.ts`

Current broken code in `POST /from-sales-order/:id`:
```ts
// WRONG — computes total from line items, assumes 13% VAT
const subtotal = salesOrder.lineItems.reduce(...);
const taxAmount = subtotal * 0.13;  // ← WRONG: hardcoded, never auto-compute
const total = subtotal + taxAmount; // ← WRONG: user must enter this
```

Fix: Accept `invoiceAmount` and `vatAmount` from request body. Never compute them.

### Bug 3 — Deposit doesn't create a Payment record
**File**: `server/src/routes/sales-orders.routes.ts`

Current broken code in `POST /:id/deposit`:
```ts
// WRONG — updates numbers directly, no Payment row, no audit trail
await prisma.salesOrder.update({
  data: {
    depositAmount: { increment: body.amount },
    balanceDue: { decrement: body.amount },
  },
});
```

Fix: Create a `Payment` record, let the payment service handle balance updates.

### Bug 4 — Payment schema doesn't allow linking to SalesOrder
**File**: `server/src/schemas/domain.ts`

Current broken schema:
```ts
// WRONG — requires invoiceId, no salesOrderId option
.refine((value) => Boolean(value.invoiceId || value.purchaseOrderId || value.supplierInvoiceId), ...)
```

Fix: Add `salesOrderId` as a valid payment target.

### Bug 5 — Invoice number uses calendar year, not Nepal fiscal year
**File**: `server/src/routes/invoices.routes.ts`

Current broken code:
```ts
const year = new Date().getFullYear(); // ← WRONG: uses AD year, not fiscal year
const count = await prisma.invoice.count(...); // ← WRONG: race condition
```

Fix: Use Nepal fiscal year (2081/82 format) and an atomic DB sequence.

### Bug 6 — Stock reservation records wrong balanceAfter
**File**: `server/src/routes/sales-orders.routes.ts` in confirm endpoint:
```ts
balanceAfter: variant.stockQuantity, // ← WRONG: pre-deduction value
```
Fix: `balanceAfter: variant.stockQuantity - lineItem.quantity`

### Bug 7 — JWT token exposed in URL for PDF downloads
**File**: `client/src/components/sales/customer-ledger-modal.tsx`
```ts
window.open(`...?token=${token}`, '_blank'); // ← WRONG: JWT in URL
```
Fix: Create a short-lived download token endpoint.

### Bug 8 — create-invoice-form allows manually setting amountPaid
**File**: `client/src/components/invoicing/create-invoice-form.tsx`

The "Amount Already Paid" input must be removed entirely. `amountPaid` only changes through the payments API.

### Bug 9 — Customer reports use invoice revenue, not order revenue
**File**: `server/src/routes/reports.routes.ts`
```ts
// WRONG — uses invoice.total as revenue
revenue: customer.salesOrders.reduce((sum, order) => {
  return sum + (order.invoice ? toNumber(order.invoice.total) : 0);
}, 0),
```
Fix: Use `orderAmount` from `SalesOrder` as the commercial revenue figure.

---

## DATABASE SCHEMA CHANGES

Apply these changes to `server/prisma/schema.prisma` and create a migration.

### Step 1 — Add Nepal fields to Customer
```prisma
model Customer {
  // ADD these fields:
  panNo         String?   @map("pan_no")
  vatNo         String?   @map("vat_no")
  invoicePref   String    @default("NONE") @map("invoice_pref") // "VAT" | "PAN" | "NONE"
  
  // ADD these relations:
  arLedger      ArLedger[]
  vatRegister   VatRegister[]
}
```

### Step 2 — Add computed fields and Nepal fields to SalesOrder
```prisma
model SalesOrder {
  // ADD these fields:
  orderAmount   Decimal   @default(0) @map("order_amount") @db.Decimal(14,2)
  fiscalYear    String?   @map("fiscal_year")   // e.g. "2081/82"
  bsDate        String?   @map("bs_date")        // e.g. "2081-09-15"

  // The existing depositAmount + balanceDue stay, but:
  // orderAmount = sum of line items (never changes after confirmation)
  // balanceDue = orderAmount - paidAmount (recomputed on every payment)
  // paidAmount = sum of all Payment.amount for this order
  
  // ADD relations:
  arLedger      ArLedger[]
  payments      Payment[]  // ← move Payment relation here from Invoice
}
```

### Step 3 — Rename Invoice to TaxInvoice and add Nepal fields
Keep the existing `Invoice` model but rename it `TaxInvoice` and add:
```prisma
model TaxInvoice {
  // existing fields stay (id, soId, invoiceNumber, issueDate, dueDate, status, notes)
  // CHANGE: total → invoiceAmount (user-entered, not computed)
  // REMOVE: amountPaid (payments track against order, not invoice)
  
  // ADD these fields:
  invoiceType   String?   @map("invoice_type")   // "VAT" | "PAN"
  fiscalYear    String?   @map("fiscal_year")
  bsDate        String?   @map("bs_date")
  printed       Boolean   @default(false)
  
  // ADD relation:
  vatRegister   VatRegister?
}
```

### Step 4 — Change Payment to link to SalesOrder
```prisma
model Payment {
  // CHANGE: remove invoiceId, add salesOrderId
  salesOrderId  String    @map("sales_order_id")
  
  // existing fields stay:
  // purchaseOrderId, supplierInvoiceId (for supplier payments)
  // amount, method, paymentDate, reference, note
  
  // ADD Nepal fields:
  bsDate        String?   @map("bs_date")
  
  // CHANGE relation:
  salesOrder    SalesOrder @relation(fields: [salesOrderId], references: [id])
}
```

### Step 5 — Add ArLedger table (NEW)
```prisma
model ArLedger {
  id             String    @id @default(cuid())
  customerId     String    @map("customer_id")
  salesOrderId   String    @map("sales_order_id")
  paymentId      String?   @map("payment_id")
  entryType      String    // "DEBIT" | "CREDIT"
  amount         Decimal   @db.Decimal(14,2)
  runningBalance Decimal   @db.Decimal(14,2) @map("running_balance")
  fiscalYear     String    @map("fiscal_year")
  bsDate         String    @map("bs_date")
  entryDate      DateTime  @map("entry_date")
  narration      String?
  
  customer    Customer   @relation(fields: [customerId], references: [id])
  salesOrder  SalesOrder @relation(fields: [salesOrderId], references: [id])
  payment     Payment?   @relation(fields: [paymentId], references: [id])

  @@index([customerId, fiscalYear, entryDate])
  @@map("ar_ledger")
}
```

### Step 6 — Add VatRegister table (NEW)
```prisma
model VatRegister {
  id              String      @id @default(cuid())
  taxInvoiceId    String      @unique @map("tax_invoice_id")
  customerId      String      @map("customer_id")
  taxableAmount   Decimal     @db.Decimal(14,2) @map("taxable_amount")
  outputVat       Decimal     @db.Decimal(14,2) @map("output_vat")
  totalWithVat    Decimal     @db.Decimal(14,2) @map("total_with_vat")
  fiscalYear      String      @map("fiscal_year")
  bsDate          String      @map("bs_date")
  entryDate       DateTime    @map("entry_date")
  
  taxInvoice  TaxInvoice @relation(fields: [taxInvoiceId], references: [id])
  customer    Customer   @relation(fields: [customerId], references: [id])

  @@index([fiscalYear, bsDate])
  @@map("vat_register")
}
```

### Step 7 — Add InvoiceCounter table for atomic fiscal-year sequences
```prisma
model InvoiceCounter {
  id          String @id @default(cuid())
  fiscalYear  String @unique @map("fiscal_year")  // "2081/82"
  lastSeq     Int    @default(0) @map("last_seq")
  
  @@map("invoice_counters")
}
```

---

## BACKEND SERVICE LAYER TO CREATE

Reorganize `server/src/` into modules. Create these service files:

### `server/src/modules/sales-orders/sales-order.service.ts`
```ts
// Responsible for:
// - createOrder(data) → creates SalesOrder, posts ArLedger DEBIT, posts GL journal
// - updateOrder(id, data) → only allowed before CONFIRMED status
// - cancelOrder(id) → releases stock, posts ArLedger reversal
// - confirmOrder(id) → locks orderAmount, reserves stock
//
// NEVER:
// - touches TaxInvoice or VatRegister
// - auto-creates an invoice

export async function createOrder(input: {
  customerId: string;
  lineItems: Array<{ productVariantId: string; quantity: number; unitPrice: number; discountPct: number }>;
  depositAmount: number;
  deliveryDate?: Date;
  notes?: string;
  bsDate: string;
  fiscalYear: string;
  assignedWarehouseId?: string;
  salespersonId?: string;
}) {
  // 1. Compute orderAmount = sum(qty * unitPrice * (1 - discountPct/100))
  // 2. Create SalesOrder with orderAmount, balanceDue = orderAmount - depositAmount
  // 3. If depositAmount > 0, create Payment record for deposit
  // 4. Post ArLedger DEBIT entry for orderAmount
  // 5. Post GL: Dr Accounts Receivable (1100) / Cr Revenue (4000)
  // 6. If depositAmount > 0, also post ArLedger CREDIT and GL for it
  // Return the created order
}
```

### `server/src/modules/payments/payment.service.ts`
```ts
// Responsible for:
// - recordPayment(salesOrderId, amount, method, ref, bsDate) → creates Payment,
//   updates SalesOrder.paidAmount and balanceDue, posts ArLedger CREDIT, posts GL
//
// NEVER:
// - takes invoiceId as a parameter for customer payments
// - touches TaxInvoice or VatRegister

export async function recordPayment(input: {
  salesOrderId: string;
  amount: number;
  method: 'CASH' | 'BANK' | 'CARD' | 'INSTALLMENT';
  reference?: string;
  bsDate: string;
  note?: string;
}) {
  // 1. Validate: amount <= order.balanceDue (throw if overpayment)
  // 2. Create Payment linked to salesOrderId
  // 3. Update SalesOrder: paidAmount += amount, balanceDue -= amount
  // 4. Update SalesOrder.status: 'PAID' if balanceDue <= 0, else 'DEPOSIT_PAID' or 'PARTIAL'
  // 5. Post ArLedger CREDIT for amount
  // 6. Post GL: Dr Cash/Bank (1000) / Cr Accounts Receivable (1100)
  // Return Payment with updated order
}
```

### `server/src/modules/tax-invoices/tax-invoice.service.ts`
```ts
// Responsible for:
// - createInvoice(salesOrderId, invoiceAmount, vatAmount, invoiceType, bsDate)
//   → creates TaxInvoice, posts VatRegister entry, posts GL for VAT liability
// - printInvoice(id) → generates IRD-format PDF
//
// NEVER:
// - auto-computes invoiceAmount from line items
// - updates ArLedger or SalesOrder.balanceDue
// - assumes 13% VAT — always use the provided vatAmount

export async function createTaxInvoice(input: {
  salesOrderId: string;
  invoiceAmount: number;    // user-entered — may be less than orderAmount
  vatAmount: number;        // user-entered — e.g. 0 for PAN bill
  invoiceType: 'VAT' | 'PAN';
  bsDate: string;
  fiscalYear: string;
  notes?: string;
}) {
  // 1. Check no invoice already exists for this salesOrderId
  // 2. Generate invoice number: atomically increment InvoiceCounter for fiscalYear
  //    Format: INV-2081/82-0001
  // 3. Create TaxInvoice with the provided invoiceAmount (not computed!)
  // 4. Post VatRegister entry: taxableAmount = invoiceAmount, outputVat = vatAmount
  // 5. Post GL: Dr Accounts Receivable (1100) / Cr VAT Payable (2100) / Cr Revenue (4000)
  //    Note: GL revenue = invoiceAmount - vatAmount
  // Return created TaxInvoice
}
```

### `server/src/modules/ar-ledger/ar-ledger.service.ts`
```ts
// Responsible for:
// - postDebit(customerId, salesOrderId, amount, bsDate, fiscalYear, narration)
// - postCredit(customerId, salesOrderId, paymentId, amount, bsDate, fiscalYear, narration)
// - getCustomerStatement(customerId, fiscalYear?) → sorted ArLedger entries with running balance
// - getArAging(asOfDate) → buckets: 0-30, 31-60, 61-90, 90+ days
//
// NEVER:
// - reads TaxInvoice for any balance or statement calculation
// - reads Invoice.total or Invoice.amountPaid

export async function getCustomerStatement(customerId: string, fiscalYear?: string) {
  // Query ArLedger where customerId = X, optionally filter by fiscalYear
  // Include salesOrder (for reference/date) and payment (for payment method)
  // Sort by entryDate ASC
  // Compute runningBalance as a running total
  // Return array of statement lines
}
```

### `server/src/modules/vat-register/vat-register.service.ts`
```ts
// Responsible for:
// - postEntry(taxInvoiceId, customerId, taxableAmount, outputVat, bsDate, fiscalYear)
// - getVatSummary(fiscalYear, month?) → aggregated output VAT by month
// - exportVatReturn(fiscalYear) → data for IRD filing
//
// NEVER:
// - appears in customer statements or AR reports
// - uses orderAmount

export async function getVatSummary(fiscalYear: string, month?: number) {
  // Query VatRegister where fiscalYear = X
  // Group by month of bsDate
  // Return: { month, taxableAmount: sum, outputVat: sum, totalWithVat: sum }
}
```

---

## UTILITY FILES TO CREATE

### `server/src/shared/fiscal-year.util.ts`
```ts
// Nepal fiscal year runs Shrawan 1 (mid-July) to Ashadh 31 (mid-July)
// BS date format: "YYYY-MM-DD" e.g. "2081-09-15"

export function getFiscalYearFromBsDate(bsDate: string): string {
  // Parse BS date
  // If BS month >= 4 (Shrawan), fiscal year is "YYYY/(YYYY+1)"
  // If BS month < 4 (before Shrawan), fiscal year is "(YYYY-1)/YYYY"
  // Return format: "2081/82"
}

export function adDateToBs(adDate: Date): string {
  // Convert AD date to BS date string using nepali-date or adbs library
  // Return format: "2081-09-15"
}

export function getCurrentFiscalYear(): string {
  // Get today's AD date, convert to BS, derive fiscal year
}
```

### `server/src/shared/invoice-seq.util.ts`
```ts
// Atomically generate next invoice number for a fiscal year
// Uses a DB counter table to prevent race conditions

export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string
): Promise<string> {
  // Upsert InvoiceCounter for fiscalYear inside a transaction
  // Increment lastSeq atomically using $executeRaw or Prisma upsert
  // Return format: "INV-2081/82-0001"
}
```

### `server/src/shared/number-words.util.ts`
```ts
// Convert number to words for Nepal invoice footer
// e.g. 73450 → "Seventy Three Thousand Four Hundred Fifty Rupees Only"

export function toNepaliWords(amount: number): string { ... }
export function toEnglishWords(amount: number): string { ... }
```

---

## ROUTE CHANGES REQUIRED

### `server/src/routes/sales-orders.routes.ts` — changes:

1. **POST `/`** — after creating order, call `arLedgerService.postDebit()`
2. **POST `/:id/deposit`** — replace direct increment/decrement with `paymentService.recordPayment()`
3. **POST `/:id/confirm`** — fix `balanceAfter: variant.stockQuantity - lineItem.quantity`
4. **Remove** the auto-invoice-creation logic if any exists here

### `server/src/routes/invoices.routes.ts` — major changes:

1. **Rename** to `tax-invoices.routes.ts`
2. **POST `/from-sales-order/:id`** — remove all auto-computation. Accept body:
   ```ts
   {
     invoiceAmount: number,   // user-entered
     vatAmount: number,       // user-entered  
     invoiceType: 'VAT' | 'PAN',
     bsDate: string,
     notes?: string
   }
   ```
   Call `taxInvoiceService.createTaxInvoice()`
3. **GET `/:id/pdf`** — call new IRD-format PDF generator

### `server/src/routes/payments.routes.ts` — changes:

1. **POST `/`** — update schema to accept `salesOrderId` for customer payments
2. Call `paymentService.recordPayment()` instead of inline logic
3. Remove direct `invoice.amountPaid` increment

### `server/src/routes/customers.routes.ts` — changes:

1. **GET `/:id/statement`** — replace entire flatMap logic with `arLedgerService.getCustomerStatement()`
2. **GET `/`** — compute `outstandingBalance` from ArLedger sum, not from Invoice
3. **POST `/`** — add `panNo`, `vatNo`, `invoicePref` to schema and form

### `server/src/routes/reports.routes.ts` — changes:

1. **GET `/customers`** — replace `invoice.total` revenue with `SalesOrder.orderAmount`
2. **GET `/customer-ledger/:id`** — use `arLedgerService.getCustomerStatement()`
3. **GET `/vat-register`** — NEW route, queries `VatRegister` table
4. **GET `/vat-return/:fiscalYear`** — NEW route, calls `vatRegisterService.exportVatReturn()`

### `server/src/routes/index.ts` — changes:
```ts
// Add new routes:
router.use("/tax-invoices", taxInvoicesRouter);
router.use("/ar-ledger", arLedgerRouter);
router.use("/vat-register", vatRegisterRouter);
// Keep /invoices as alias for backward compat or remove
```

---

## PDF TEMPLATES TO UPDATE

### `server/src/lib/pdf/vat-invoice.pdf.tsx` (rename from invoice.tsx)

The IRD-compliant VAT invoice PDF must include:
- Header: "कर बिजक / TAX INVOICE" (for VAT) or "बिजक / INVOICE" (for PAN)
- Seller: company name, address, VAT No / PAN No
- Buyer: customer name, address, customer's PAN/VAT No (if applicable)
- Invoice No (from TaxInvoice.invoiceNumber, fiscal-year format)
- Date in **BS format** (e.g. 2081-09-15) AND AD format
- Fiscal year
- Line items table: Description, Qty, Unit Price, Amount
  - Note: line items shown are from the SalesOrder, but total shown is TaxInvoice.invoiceAmount
- Totals: Taxable Amount, VAT (13%), Total
- Amount in words (use `toEnglishWords()`)
- Company stamp area + authorized signature
- Footer: payment terms, bank details

**Critical**: The `total` shown on the PDF is `TaxInvoice.invoiceAmount` — NOT the sum of line item prices.

### `server/src/lib/pdf/ar-statement.pdf.tsx` (rename from ledger.tsx)

The customer AR statement PDF must:
- Show company letterhead
- Show customer name, address, PAN/VAT
- Show statement period (fiscal year or date range)
- Table: Date (BS) | Narration | Order Ref | Debit | Credit | Balance
- All amounts from `ArLedger` only — no invoice amounts
- Closing balance = total debits − total credits
- Source of all debits: order amounts
- Source of all credits: payment amounts

**Critical**: TaxInvoice amounts must never appear in this statement.

### Font fix in all PDFs:
Replace the Google Fonts CDN URL with a local font file:
```ts
// WRONG:
Font.register({ src: "https://fonts.gstatic.com/..." });

// RIGHT — download Inter font to server/assets/ and reference locally:
import path from "path";
Font.register({ 
  family: "Inter",
  src: path.join(__dirname, "../../assets/Inter-Regular.ttf")
});
```

---

## FRONTEND CHANGES REQUIRED

### `client/src/components/sales/create-customer-form.tsx`
Add these fields to the form:
```tsx
// Add to formData state:
panNo: "",
vatNo: "",
invoicePref: "NONE",  // "VAT" | "PAN" | "NONE"

// Add to the form UI:
<Input placeholder="PAN Number" value={formData.panNo} ... />
<Input placeholder="VAT Number (if VAT registered)" value={formData.vatNo} ... />
<select value={formData.invoicePref} ...>
  <option value="NONE">No invoice required</option>
  <option value="PAN">PAN bill</option>
  <option value="VAT">VAT bill</option>
</select>
```

### `client/src/components/invoicing/create-invoice-form.tsx`
Major rewrite:
1. **Remove** the "Amount Already Paid" input entirely
2. **Remove** the auto-computed total
3. **Add** explicit `invoiceAmount` input (user types the amount for the tax document)
4. **Add** `vatAmount` input (user types VAT — do not compute as 13% automatically)
5. **Add** `invoiceType` selector: "VAT" or "PAN"
6. **Add** BS date picker for invoice date
7. Show the selected sales order's `orderAmount` as reference: "Order amount: NPR X,XXX"
   This helps the user know what the actual amount is while entering a potentially different invoice amount.

```tsx
// Key UI change — show reference amount:
{selectedOrder && (
  <div className="text-sm text-muted-foreground bg-amber-50 p-3 rounded-lg border border-amber-200">
    Order amount: <strong>{formatCurrency(selectedOrder.orderAmount)}</strong>
    <br />
    Invoice amount below may differ from order amount.
  </div>
)}

<Input 
  label="Invoice Amount (for tax bill) *"
  type="number"
  placeholder="Enter amount to show on the VAT/PAN bill"
  // This is NOT auto-filled from the order
/>
<Input 
  label="VAT Amount"
  type="number" 
  placeholder="e.g. 7800 for 13% on 60000"
  // NOT computed automatically
/>
```

### `client/src/components/sales/customer-ledger-modal.tsx`
Fix the JWT-in-URL problem:
```tsx
// WRONG — current code:
const url = `${baseUrl}/reports/customer-ledger/${customerId}/pdf?token=${token}`;
window.open(url, '_blank');

// RIGHT — get a short-lived download token first:
const handleDownloadPdf = async () => {
  const { downloadToken } = await apiRequest<{ downloadToken: string }>(
    `/reports/download-token`,
    { method: 'POST', body: { resource: 'ledger', id: customerId }, token }
  );
  window.open(`${baseUrl}/reports/customer-ledger/${customerId}/pdf?dt=${downloadToken}`, '_blank');
};
```

### `client/src/components/invoicing/record-payment-form.tsx`
Update to link payment to `salesOrderId` not `invoiceId`:
```tsx
// Form should show: Sales Order selection, then payment amount, method, date, reference
// Payment is against the ORDER, not the invoice
// Show: "Order amount: X | Already paid: Y | Balance due: Z"
```

### `client/src/hooks/use-queries.ts`
Add new query hooks:
```ts
export function useArLedgerQuery(customerId: string) { ... }
export function useVatRegisterQuery(fiscalYear: string) { ... }
export function useTaxInvoicesQuery(params?) { ... }
```

### `client/src/types/domain.ts`
Add new types:
```ts
export type ArLedgerEntry = {
  id: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  runningBalance: number;
  entryDate: string;
  bsDate: string;
  narration: string;
  salesOrderId: string;
  paymentId?: string;
};

export type TaxInvoiceRow = {
  id: string;
  invoiceNumber: string;
  customer: string;
  invoiceType: 'VAT' | 'PAN';
  invoiceAmount: number;
  vatAmount: number;
  status: string;
  bsDate: string;
  fiscalYear: string;
  orderAmount: number;   // for reference only
};

export type VatRegisterEntry = {
  id: string;
  customer: string;
  invoiceNumber: string;
  taxableAmount: number;
  outputVat: number;
  totalWithVat: number;
  bsDate: string;
  fiscalYear: string;
};
```

---

## ZOD SCHEMA CHANGES (server/src/schemas/domain.ts)

### Update customerSchema:
```ts
export const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.nativeEnum(CustomerType),
  creditLimit: decimalNumber.default(0),
  address: z.string().min(4),
  panNo: z.string().optional(),
  vatNo: z.string().optional(),
  invoicePref: z.enum(['VAT', 'PAN', 'NONE']).default('NONE'),
});
```

### Replace invoiceSchema with taxInvoiceSchema:
```ts
export const taxInvoiceSchema = z.object({
  salesOrderId: z.string().min(1),
  invoiceAmount: decimalNumber,        // user-entered, never computed
  vatAmount: decimalNumber.default(0), // user-entered
  invoiceType: z.enum(['VAT', 'PAN']),
  bsDate: z.string().min(8),           // e.g. "2081-09-15"
  notes: z.string().optional(),
});
```

### Update paymentSchema:
```ts
export const paymentSchema = z
  .object({
    salesOrderId: z.string().optional(),       // for customer payments
    purchaseOrderId: z.string().optional(),
    supplierInvoiceId: z.string().optional(),
    amount: decimalNumber,
    method: z.nativeEnum(PaymentMethod),
    paymentDate: z.coerce.date().default(new Date()),
    bsDate: z.string().min(8).optional(),
    reference: z.string().optional(),
    note: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.salesOrderId || value.purchaseOrderId || value.supplierInvoiceId),
    "A payment must be linked to a sales order, purchase order, or supplier invoice",
  );
```

### Add arLedgerQuerySchema:
```ts
export const arLedgerQuerySchema = z.object({
  customerId: z.string().min(1),
  fiscalYear: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
```

### Add vatRegisterQuerySchema:
```ts
export const vatRegisterQuerySchema = z.object({
  fiscalYear: z.string().min(1),
  month: z.coerce.number().int().min(1).max(12).optional(),
});
```

---

## DATA MIGRATION (seed.ts updates)

When resetting the database with the new schema, update `server/prisma/seed.ts`:

1. Add `panNo`, `vatNo`, `invoicePref` to all seeded customers
2. Remove all seeded `Invoice` records — replace with `TaxInvoice` records
3. Change all seeded `Payment` records to link to `salesOrderId` instead of `invoiceId`
4. Add seeded `ArLedger` entries for each order (debit) and payment (credit)
5. Add seeded `VatRegister` entries for orders with VAT invoices
6. Add `InvoiceCounter` seed row for current fiscal year

---

## IMPLEMENTATION ORDER

Follow this exact order to avoid breaking dependencies:

1. **Prisma schema** — add all new models and fields, run `npx prisma migrate dev`
2. **Utility files** — create `fiscal-year.util.ts`, `invoice-seq.util.ts`, `number-words.util.ts`
3. **ArLedger service** — create `ar-ledger.service.ts`
4. **VatRegister service** — create `vat-register.service.ts`
5. **Payment service** — rewrite `payment.service.ts`
6. **SalesOrder service** — rewrite `sales-order.service.ts`
7. **TaxInvoice service** — rewrite `tax-invoice.service.ts`
8. **Update routes** — in order: payments, sales-orders, tax-invoices, customers, reports
9. **PDF templates** — update vat-invoice.pdf.tsx and ar-statement.pdf.tsx
10. **Update seed.ts** — update with new schema
11. **Frontend types** — update `domain.ts`
12. **Frontend forms** — create-customer-form, create-invoice-form, record-payment-form
13. **Frontend queries** — update use-queries.ts
14. **Frontend pages** — update InvoicingPage, SalesPage to use new endpoints
15. **Test** — verify: order without invoice shows in AR, invoice amount ≠ order amount, payment reduces order balance not invoice balance

---

## THINGS TO NEVER DO (hard rules for the AI assistant)

- **Never** auto-compute `invoiceAmount` from line item prices
- **Never** assume 13% VAT — always use user-provided `vatAmount`
- **Never** link `Payment.invoiceId` for customer payments — use `salesOrderId`
- **Never** read `TaxInvoice.invoiceAmount` to determine what a customer owes
- **Never** show `TaxInvoice.invoiceAmount` in a customer statement or AR ledger
- **Never** put the JWT token in a URL query parameter
- **Never** allow `amountPaid` to be set directly on an invoice — only through Payment records
- **Never** use AD year for invoice numbering — always use Nepal fiscal year
- **Never** skip an order in the customer statement because it has no invoice

---

## REFERENCE: Nepal VAT / PAN Rules

- **VAT registered business**: annual turnover > NPR 50 lakhs (goods) or NPR 30 lakhs (services)
- **VAT rate**: 13% flat on taxable amount
- **PAN bill**: for businesses not VAT-registered; shows PAN number, no VAT line
- **Invoice number format**: Must restart at 1 each fiscal year (Shrawan 1)
- **Fiscal year**: Shrawan 1 (approximately July 16) to Ashadh end (approximately July 15)
- **Current fiscal year**: 2081/82 (2024/25 AD)
- **BS date**: Must appear on all tax documents; AD date optional
- **IRD compliance**: HS code (4 digits min), brand, model required on VAT invoices since 2081/82

---

*End of prompt. This document should be pasted as a system prompt or context in Cursor/Windsurf before starting the refactor.*