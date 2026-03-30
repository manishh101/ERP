# BACKEND — Definitive Fix Prompt
## Nepal Furniture ERP · Based on actual codebase analysis
## Use in Cursor or Windsurf — apply every fix in order

---

## WHAT HAS BEEN DONE CORRECTLY (do not touch)

- ✅ `schema.prisma` — ArLedger, VatRegister, InvoiceCounter, TaxInvoice, paidAmount, furniture fields all added
- ✅ `modules/ar-ledger/ar-ledger.service.ts` — postDebit / postCredit with proper tx signature
- ✅ `modules/payments/payment.service.ts` — proper paidAmount + balanceDue update, PAID status logic
- ✅ `modules/sales-orders/sales-order.service.ts` — createOrder, confirmOrder, cancelOrder correct
- ✅ `modules/tax-invoices/tax-invoice.service.ts` — user-entered invoiceAmount, VatRegister entry
- ✅ `modules/vat-register/vat-register.service.ts` — getMonthlySummary, getEntries correct
- ✅ `shared/fiscal-year.util.ts` — BS month logic correct
- ✅ `shared/number-words.util.ts` — Nepali crore/lakh system correct
- ✅ `utils/jwt.ts` — expiresIn cast to `any` done, purpose field added
- ✅ `routes/tax-invoices.routes.ts` — imports vat-invoice.pdf correctly, proper service wiring
- ✅ `routes/sales-orders.routes.ts` — `{ order, orderAmount }` destructure fixed, `taxInvoice` include correct
- ✅ `routes/payments.routes.ts` — salesOrderId path routes to paymentService
- ✅ `routes/search.routes.ts` — searches `taxInvoice` not `invoice`
- ✅ `routes/index.ts` — /tax-invoices registered, /invoices removed
- ✅ `services/report.service.ts` getCashFlow — uses `salesOrderId` filter

---

## REMAINING BUGS — ALL MUST BE FIXED

---

### BUG 1 — Two duplicate service implementations (critical architectural issue)

There are TWO sets of service files:
- `server/src/modules/` — the **correct** implementations (proper imports, tx pattern)
- `server/src/services/` — **old/duplicate** implementations that create their own `PrismaClient` instances

The routes import from `../services/` but the correct code lives in `../modules/`. This means the correct module-level code is never actually used.

**Fix: Update every route that imports services to point to modules:**

```ts
// In sales-orders.routes.ts — CHANGE:
import { salesOrderService } from "../services/sales-order.service";
// TO:
import { createOrder, confirmOrder, cancelOrder } from "../modules/sales-orders/sales-order.service";

// In payments.routes.ts — CHANGE:
import { paymentService } from "../services/payment.service";
// TO:
import { recordPayment } from "../modules/payments/payment.service";

// In tax-invoices.routes.ts — CHANGE:
import { taxInvoiceService } from "../services/tax-invoice.service";
// TO:
import { createInvoice } from "../modules/tax-invoices/tax-invoice.service";

// In customers.routes.ts — CHANGE:
import { arLedgerService } from "../services/ar-ledger.service";
// TO:
import { getCustomerLedger } from "../modules/ar-ledger/ar-ledger.service";

// In reports.routes.ts — CHANGE:
import { vatRegisterService } from "../services/vat-register.service";
// TO:
import { getMonthlySummary, getEntries } from "../modules/vat-register/vat-register.service";
```

After fixing imports, **delete these old duplicate files** (they create separate DB connection pools and will exhaust PostgreSQL):
- `server/src/services/ar-ledger.service.ts`
- `server/src/services/payment.service.ts`
- `server/src/services/sales-order.service.ts`
- `server/src/services/tax-invoice.service.ts`
- `server/src/services/vat-register.service.ts`

Keep: `accounting.service.ts`, `dashboard.service.ts`, `report.service.ts` — these have no module equivalents.

---

### BUG 2 — `server/src/routes/sales-orders.routes.ts` — still uses old service object pattern

After BUG 1 fix, update the call sites to use the new function imports:

```ts
// POST / — createOrder
// CHANGE:
const { order, orderAmount } = await salesOrderService.createOrder(body, request.user?.id);
// TO:
const { order, orderAmount } = await createOrder({
  customerId: body.customerId,
  lineItems: body.lineItems,
  depositAmount: body.depositAmount,
  deliveryDate: body.deliveryDate,
  notes: body.notes,
  bsDate: new (await import("../shared/fiscal-year.util")).getBsDate(),
  fiscalYear: new (await import("../shared/fiscal-year.util")).getCurrentFiscalYear(),
  assignedWarehouseId: body.assignedWarehouseId,
  salespersonId: body.salespersonId ?? request.user?.id,
  isCustomOrder: body.isCustomOrder,
}, request.user?.id);
```

Better: import the util functions at the top of the file:
```ts
import { getBsDate, getCurrentFiscalYear } from "../shared/fiscal-year.util";
import { createOrder, confirmOrder, cancelOrder } from "../modules/sales-orders/sales-order.service";
```

Then update all three call sites:
```ts
// POST / :
const { order, orderAmount } = await createOrder({ ...body, bsDate: getBsDate(), fiscalYear: getCurrentFiscalYear() }, request.user?.id);

// POST /:id/confirm:
const updated = await confirmOrder(params.id, request.user?.id);

// POST /:id/cancel:
const updated = await cancelOrder(params.id, request.user?.id);
```

Also update the deposit endpoint to use the new `recordPayment`:
```ts
// POST /:id/deposit — replace paymentService.recordCustomerPayment with:
import { recordPayment } from "../modules/payments/payment.service";

// In the handler:
await recordPayment({
  salesOrderId: params.id,
  amount: body.amount,
  method: "BANK" as any,
  bsDate: getBsDate(),
  fiscalYear: getCurrentFiscalYear(),
  note: "Deposit / advance payment",
});
```

---

### BUG 3 — `server/src/routes/payments.routes.ts` — still includes old `invoice` relation

**Line ~40 — the GET / include has `invoice: true` which no longer exists:**

```ts
// WRONG — Payment no longer has an invoice relation:
include: {
  invoice: true,          // ← TS ERROR: this doesn't exist
  purchaseOrder: true,
  supplierInvoice: true,
},

// RIGHT:
include: {
  salesOrder: { include: { customer: true } },
  purchaseOrder: true,
  supplierInvoice: true,
},
```

Also update the payment service call site to use the module function:
```ts
// CHANGE:
payment = await paymentService.recordCustomerPayment({ ... });
// TO:
payment = await recordPayment({
  salesOrderId: body.salesOrderId,
  amount: body.amount,
  method: body.method,
  reference: body.reference,
  note: body.note,
  paymentDate: body.paymentDate,
  bsDate: getBsDate(body.paymentDate),
  fiscalYear: getCurrentFiscalYear(body.paymentDate),
});
```

---

### BUG 4 — `server/src/routes/reports.routes.ts` — 6 remaining TS errors

**Error at line ~323 — `invoice` in SalesOrder include inside custom-builder:**

The custom-builder already uses `taxInvoice: true` correctly in the first `include`. But the `customers` dataset still references `invoice`:

```ts
// Find in the customers dataset mapping, CHANGE:
prisma.customer.findMany({
  include: {
    salesOrders: {
      include: {
        invoice: true,     // ← TS ERROR: doesn't exist
        lineItems: true,
      },
    },
  },
})

// TO:
prisma.customer.findMany({
  include: {
    salesOrders: {
      include: {
        taxInvoice: true,  // ← correct
        lineItems: true,
      },
    },
  },
})
```

**Errors at lines ~375, 383, 386, 393 — `lineItems` and `customer` not in query result:**

These errors are in the `GET /sales` report endpoint. The query fetches orders but the `include` is missing `lineItems`, `customer`, and `salesperson`:

```ts
// In the GET /sales handler, ensure the include has all needed relations:
const orders = await prisma.salesOrder.findMany({
  where: { ... },
  include: {
    customer: true,       // ← must be here
    salesperson: true,    // ← must be here
    lineItems: {
      include: {
        productVariant: { include: { product: true } },
      },
    },
  },
});
```

**Error at line ~492 — `reference: string | null` not assignable to `string`:**

In `getCustomerLedger` (the report service version), the reference field returns `string | null`. Fix with null coalescing:

```ts
// In report.service.ts getCustomerLedger, CHANGE:
reference: inv.invoiceNumber,   // or payment.reference
// TO:
reference: (inv.invoiceNumber ?? inv.id),
reference: (payment.reference ?? payment.id),
```

Note: The `report.service.ts` `getCustomerLedger` function still reads from the old `invoice` model. This function is now REPLACED by `modules/ar-ledger/ar-ledger.service.ts` `getCustomerLedger`. Update `reports.routes.ts` to import from the module:

```ts
// In reports.routes.ts, CHANGE:
import { ..., getCustomerLedger } from "../services/report.service";
// TO — import customer ledger from the module:
import { getCustomerLedger } from "../modules/ar-ledger/ar-ledger.service";
```

---

### BUG 5 — `server/src/services/dashboard.service.ts` — still has old variable names

The dashboard service has been partially fixed (now queries SalesOrder for revenue) but has leftover variable names that cause implicit `any` TypeScript errors:

**Fix the variable naming mismatch:**

```ts
// The Promise.all result is assigned to [invoices, inventoryItems, ...]
// but the first element is now salesOrders. CHANGE the destructure:
const [monthOrders, inventoryItems, deliveries, lowStockItems, recentSalesOrders, allSalesOrders] =
  await Promise.all([
    prisma.salesOrder.findMany({
      where: { orderDate: { gte: monthStart }, status: { not: "CANCELLED" } },
      select: { orderAmount: true },
    }),
    // ... rest unchanged
  ]);

// Then CHANGE:
const totalRevenueMtd = invoices.reduce(...)
// TO:
const totalRevenueMtd = monthOrders.reduce((sum, o) => sum + toNumber(o.orderAmount), 0);
```

**Fix the revenueVsCogs forEach — implicit any parameters:**

```ts
// CHANGE:
salesOrders.forEach((order) => {
  order.lineItems.forEach((lineItem) => {
// TO — add explicit types:
allSalesOrders.forEach((order: { orderDate: Date; lineItems: Array<{ quantity: number; unitPrice: { toNumber?: () => number } | number; productVariant: { product: { costPrice: { toNumber?: () => number } | number }; additionalCost: { toNumber?: () => number } | number } }> }) => {
  order.lineItems.forEach((lineItem) => {
```

The easiest fix for all implicit `any` errors in dashboard.service.ts is to add `"noImplicitAny": false` in `server/tsconfig.json` temporarily, or add explicit `as any` casts at each loop variable. The cleanest fix is to use typed Prisma includes — see below.

**Clean fix for dashboard.service.ts implicit any errors:**

In the `salesOrders` query (used for revenue/COGS charts), add the include so TypeScript knows the shape:

```ts
prisma.salesOrder.findMany({
  include: {
    lineItems: {
      include: {
        productVariant: { include: { product: true } },
      },
    },
  },
}),
```

Then the forEach types resolve automatically.

---

### BUG 6 — `server/src/services/report.service.ts` — `invoiceId` on Payment

```ts
// Line ~178 — CHANGE:
.filter((payment) => payment.invoiceId)
// TO:
.filter((payment) => payment.salesOrderId)
```

---

### BUG 7 — `server/src/routes/bank.routes.ts` — string | string[] type errors (8 errors)

The bank import handler reads `importId` and `lineId` from `request.params` which TypeScript types as `string | string[]`. Cast them at the top of each handler:

```ts
// In ALL four handlers that use importId/lineId, add at the start of the handler:
const importId = String(request.params.importId ?? "");
const lineId = String(request.params.lineId ?? "");
```

This must be done in 4 places: match, unmatch, and any other handlers that read those params directly.

---

### BUG 8 — `server/src/routes/products.routes.ts` — taxRateId update type conflict

```ts
// CHANGE the PATCH /:id handler from:
const updated = await prisma.product.update({
  where: { id: params.id },
  data: body,   // ← TS error: taxRateId type conflict
});

// TO — explicitly map fields:
const updated = await prisma.product.update({
  where: { id: params.id },
  data: {
    name: body.name,
    sku: body.sku,
    category: body.category,
    description: body.description,
    costPrice: body.costPrice,
    sellingPrice: body.sellingPrice,
    material: body.material,
    color: body.color,
    length: body.length,
    width: body.width,
    height: body.height,
    weight: body.weight,
    status: body.status,
    lowStockThreshold: body.lowStockThreshold,
    taxRateId: body.taxRateId ?? undefined,
  },
  include: { variants: true, taxRate: true },
});
```

---

### BUG 9 — `server/src/shared/invoice-seq.util.ts` — race condition in upsert

The current `upsert` with `increment` is NOT atomic. Two simultaneous requests can both read the same `lastSeq` before either writes, producing duplicate invoice numbers.

Replace with a raw SQL atomic upsert in `invoice-seq.util.ts`:

```ts
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";

export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string
): Promise<string> {
  // Single atomic SQL statement — no race condition possible
  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO invoice_counters (id, fiscal_year, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, 1)
    ON CONFLICT (fiscal_year)
    DO UPDATE SET last_seq = invoice_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `INV-${fiscalYear}-${seqStr}`;
}

export async function nextReceiptNumber(
  tx: Prisma.TransactionClient,
  fiscalYear: string
): Promise<string> {
  const result = await tx.$queryRaw<Array<{ last_seq: number }>>`
    INSERT INTO receipt_counters (id, fiscal_year, last_seq)
    VALUES (gen_random_uuid()::text, ${fiscalYear}, 1)
    ON CONFLICT (fiscal_year)
    DO UPDATE SET last_seq = receipt_counters.last_seq + 1
    RETURNING last_seq
  `;
  const seqStr = result[0].last_seq.toString().padStart(4, "0");
  return `REC-${fiscalYear}-${seqStr}`;
}
```

Note: `ReceiptCounter` model is referenced here. Verify `schema.prisma` has it:
```prisma
model ReceiptCounter {
  id         String @id @default(cuid())
  fiscalYear String @unique @map("fiscal_year")
  lastSeq    Int    @default(0) @map("last_seq")
  @@map("receipt_counters")
}
```

If missing, add it and run: `npx prisma migrate dev --name "add_receipt_counter"`

---

### BUG 10 — `server/src/routes/customers.routes.ts` — statement endpoint missing

`arLedgerService` is imported but there is NO `GET /:id/statement` endpoint. Add it:

```ts
import { getCustomerLedger } from "../modules/ar-ledger/ar-ledger.service";

// Add this endpoint to customers.routes.ts:
customersRouter.get(
  "/:id/statement",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const startDate = request.query.startDate
      ? new Date(String(request.query.startDate))
      : undefined;
    const endDate = request.query.endDate
      ? new Date(String(request.query.endDate))
      : undefined;

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      select: {
        id: true, name: true, phone: true,
        panNo: true, vatNo: true, outstandingBalance: true,
      },
    });
    if (!customer) throw new ApiError(404, "Customer not found");

    const entries = await getCustomerLedger(params.id, startDate, endDate);

    response.json({
      customer,
      entries,
      closingBalance: entries.length > 0 ? entries[entries.length - 1].balance : 0,
    });
  }),
);
```

---

### BUG 11 — `server/src/lib/pdf/vat-invoice.pdf.tsx` — shows NPR 0 + wrong font path

**Bug A — Shows NPR 0 for invoice total:**
```ts
// CHANGE every reference to invoice?.total:
Number(invoice?.total ?? 0)
// TO:
Number(invoice?.invoiceAmount ?? 0)
```

Also fix the subtotal display:
```ts
// CHANGE:
(Number(invoice?.total ?? 0) - Number(invoice?.taxAmount ?? 0))
// TO:
(Number(invoice?.invoiceAmount ?? 0) - Number(invoice?.taxAmount ?? 0))
```

**Bug B — Font file in wrong directory:**

The font is at `server/server/src/assets/fonts/Inter-Regular.ttf` (double "server" is a typo).

1. Move the file: `mv server/server/src/assets/fonts/Inter-Regular.ttf server/src/assets/fonts/Inter-Regular.ttf`
2. Remove empty dir: `rm -rf server/server/`
3. Update the path in `vat-invoice.pdf.tsx`:

```ts
import path from "path";

// CHANGE:
Font.register({ family: "Inter", src: path.resolve(process.cwd(), "src/assets/fonts/Inter-Regular.ttf") });

// TO — use __dirname so it works regardless of working directory:
Font.register({
  family: "Inter",
  src: path.join(__dirname, "../../assets/fonts/Inter-Regular.ttf"),
});
```

**Bug C — Add IRD-required "कर बिजक" header:**
```tsx
// In the PDF header View, add before the invoice number:
<Text style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>
  {invoice?.invoiceType === "VAT" ? "कर बिजक / TAX INVOICE" : "बिजक / INVOICE"}
</Text>
<Text style={{ fontSize: 9, marginBottom: 8, color: "#666" }}>
  As per Nepal VAT Act, 2052
</Text>
<Text>Fiscal Year: {invoice?.fiscalYear ?? ""}</Text>
```

**Bug D — Add amount in words:**
```tsx
// Import numberToWords:
import { numberToWords } from "../../shared/number-words.util";

// In the footer View:
<Text style={{ fontStyle: "italic", marginTop: 8 }}>
  {numberToWords(Number(invoice?.invoiceAmount ?? 0))} Rupees Only
</Text>
```

---

### BUG 12 — `server/src/lib/pdf/receipt.tsx` — still using CDN font

```ts
// CHANGE:
Font.register({ family: "Inter", src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3i9gJ8REA.ttf" });

// TO:
import path from "path";
Font.register({
  family: "Inter",
  src: path.join(__dirname, "../../assets/fonts/Inter-Regular.ttf"),
});
```

Also add BS date and fix the customer name path:
```tsx
// Customer name — payment now links to salesOrder directly:
<Text>{payment?.salesOrder?.customer?.name ?? payment?.supplierInvoice?.supplier?.name}</Text>

// Add BS date:
<Text>Date (BS): {payment?.bsDate ?? ""}</Text>
<Text>Date (AD): {payment?.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : ""}</Text>
```

---

### BUG 13 — `server/src/services/payment.service.ts` (in /services/ — will be deleted after BUG 1, but fix before deleting)

The old `services/payment.service.ts` always sets status to `"DEPOSIT_PAID"` even when fully paid. The module version in `modules/payments/payment.service.ts` already handles this correctly. After BUG 1 (using modules), this file gets deleted so no additional fix needed here.

---

## VERIFICATION — Run these after all fixes

```bash
cd server

# Step 1: Compile check
npx tsc --noEmit
# Expected: 0 errors

# Step 2: Start server
npm run dev

# Step 3: Test endpoints manually
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Password123!"}'

# Save the token and test:
# POST /api/sales-orders — creates order + ArLedger DEBIT
# POST /api/payments — creates payment + ArLedger CREDIT
# POST /api/tax-invoices — creates TaxInvoice + VatRegister (does NOT change AR balance)
# GET /api/customers/:id/statement — returns ArLedger entries only
# GET /api/reports/vat-summary?fiscalYear=2081/82 — returns VAT data
```

---

## IMPLEMENTATION ORDER

1. Fix BUG 1 — update all route imports to point to `modules/` (this is the foundation)
2. Fix BUG 2 — update sales-orders.routes.ts call sites
3. Fix BUG 3 — fix payments.routes.ts include
4. Fix BUG 4 — fix reports.routes.ts 6 errors
5. Fix BUG 5 — fix dashboard.service.ts variable names + types
6. Fix BUG 6 — fix report.service.ts invoiceId → salesOrderId
7. Fix BUG 7 — fix bank.routes.ts string casts
8. Fix BUG 8 — fix products.routes.ts taxRateId
9. Run `npx tsc --noEmit` — should be 0 errors now
10. Fix BUG 9 — replace invoice-seq upsert with raw SQL
11. Fix BUG 10 — add customer statement endpoint
12. Fix BUG 11 — fix vat-invoice.pdf.tsx (move font file first)
13. Fix BUG 12 — fix receipt.tsx font
14. Run final `npx tsc --noEmit` + `npm run dev` to confirm