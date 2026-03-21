# ERP Build Prompt — Addendum
### Paste this AFTER the main ERP_BUILD_PROMPT.md in Cursor/Windsurf

---

## BACKEND GAPS — ADD THESE TO THE MAIN PROMPT

---

### GAP 1 — `SalesOrder` schema is missing `paidAmount` field

The main prompt adds `orderAmount`, `fiscalYear`, and `bsDate` but omits `paidAmount`.
Without it, `paymentService.recordPayment()` has nowhere to write the running paid total.

Add to `SalesOrder` in `schema.prisma`:
```prisma
paidAmount    Decimal   @default(0) @map("paid_amount") @db.Decimal(14,2)
```

The invariant: `balanceDue = orderAmount - paidAmount`. Both fields must always be kept in sync by `paymentService`. Never compute one from the other on read — store both.

---

### GAP 2 — `receipt.pdf.tsx` breaks after payment schema change

**File**: `server/src/lib/pdf/receipt.tsx`

Current broken path after the Payment → SalesOrder change:
```ts
// BREAKS — payment no longer has .invoice
payment?.invoice?.salesOrder?.customer?.name
```

Fix the data path to:
```ts
payment?.salesOrder?.customer?.name
```

Also apply the same font CDN fix as invoice.tsx:
```ts
// REMOVE:
Font.register({ src: "https://fonts.gstatic.com/..." });

// ADD:
import path from "path";
Font.register({
  family: "Inter",
  src: path.join(__dirname, "../../assets/Inter-Regular.ttf")
});
```

Add BS date to the receipt body:
```tsx
<Text>Date (BS): {payment.bsDate ?? ""}</Text>
<Text>Date (AD): {new Date(payment.paymentDate).toLocaleDateString()}</Text>
```

Add receipt number in fiscal-year format: `REC-{fiscalYear}-{seq}` — add a `ReceiptCounter` table the same way as `InvoiceCounter`.

---

### GAP 3 — `dashboard.service.ts` uses invoice amounts for all KPIs

**File**: `server/src/services/dashboard.service.ts`

This file has 4 broken calculations that all use `Invoice` as the source:

**Fix 1 — Revenue MTD KPI**: Replace invoice query with:
```ts
// WRONG:
const invoices = await prisma.invoice.findMany({ where: { issueDate: { gte: monthStart } } });
const totalRevenueMtd = invoices.reduce((sum, inv) => sum + toNumber(inv.total), 0);

// RIGHT — use orderAmount from SalesOrder:
const monthOrders = await prisma.salesOrder.findMany({
  where: { orderDate: { gte: monthStart }, status: { not: "CANCELLED" } }
});
const totalRevenueMtd = monthOrders.reduce((sum, o) => sum + toNumber(o.orderAmount), 0);
```

**Fix 2 — Outstanding AR KPI**: Replace invoice aggregate with ArLedger sum:
```ts
// WRONG:
const outstandingAr = await prisma.invoice.aggregate({
  _sum: { total: true, amountPaid: true },
  where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } }
});

// RIGHT — sum ArLedger running balances per customer:
const openOrders = await prisma.salesOrder.findMany({
  where: { balanceDue: { gt: 0 }, status: { not: "CANCELLED" } },
  select: { balanceDue: true }
});
const outstandingArValue = openOrders.reduce((sum, o) => sum + toNumber(o.balanceDue), 0);
```

**Fix 3 — Cash flow inflows**: Replace `invoiceId IS NOT NULL` filter with `salesOrderId IS NOT NULL`:
```ts
// WRONG:
const invoicePayments = await prisma.payment.findMany({
  where: { invoiceId: { not: null }, paymentDate: { gte: ... } }
});

// RIGHT:
const customerPayments = await prisma.payment.findMany({
  where: { salesOrderId: { not: null }, paymentDate: { gte: ... } }
});
```

**Fix 4 — Add "Custom Orders in Production" KPI** (furniture-specific):
```ts
const customInProduction = await prisma.salesOrder.count({
  where: { isCustomOrder: true, status: { in: ["CONFIRMED", "DEPOSIT_PAID", "IN_WAREHOUSE"] } }
});
// Add to kpis array:
{ label: "Custom Orders", value: String(customInProduction), change: "In production", tone: "neutral" }
```

---

### GAP 4 — `report.service.ts` getCustomerLedger and getTaxSummary

**File**: `server/src/services/report.service.ts`

**Fix `getCustomerLedger()`** — currently reads from `invoice` and `payment.invoice`, skipping no-invoice orders:
```ts
// REPLACE the entire function with:
export async function getCustomerLedger(customerId: string, startDate?: Date, endDate?: Date) {
  const entries = await prisma.arLedger.findMany({
    where: {
      customerId,
      entryDate: buildDateRange(startDate, endDate),
    },
    include: {
      salesOrder: { select: { id: true, orderDate: true } },
      payment: { select: { id: true, method: true, reference: true } },
    },
    orderBy: { entryDate: "asc" },
  });

  return entries.map((entry) => ({
    id: entry.id,
    date: entry.entryDate,
    bsDate: entry.bsDate,
    type: entry.entryType,        // "DEBIT" | "CREDIT"
    reference: entry.salesOrder?.id ?? entry.payment?.reference ?? entry.id,
    narration: entry.narration ?? "",
    debit: entry.entryType === "DEBIT" ? toNumber(entry.amount) : 0,
    credit: entry.entryType === "CREDIT" ? toNumber(entry.amount) : 0,
    balance: toNumber(entry.runningBalance),
  }));
}
```

**Fix `getTaxSummary()`** — currently reads `invoice.taxAmount`, should read `VatRegister`:
```ts
// REPLACE with:
export async function getTaxSummary(startDate?: Date, endDate?: Date) {
  const vatEntries = await prisma.vatRegister.findMany({
    where: { entryDate: buildDateRange(startDate, endDate) },
  });
  const supplierInvoices = await prisma.supplierInvoice.findMany({
    where: { issueDate: buildDateRange(startDate, endDate) },
  });

  const outputTax = vatEntries.reduce((sum, e) => sum + toNumber(e.outputVat), 0);
  const inputTax = supplierInvoices.reduce((sum, inv) => sum + toNumber(inv.taxAmount), 0);

  return { outputTax, inputTax, netPayable: outputTax - inputTax };
}
```

---

### GAP 5 — `accounting.routes.ts` has duplicate bank import

**File**: `server/src/routes/accounting.routes.ts`

The `POST /reconcile/import` endpoint in `accounting.routes.ts` is a duplicate of the same functionality in `bank.routes.ts`. Having two implementations means they will diverge.

**Fix**: Remove `POST /reconcile/import` from `accounting.routes.ts` entirely. The canonical bank import lives in `bank.routes.ts`. Update `client/src/hooks/use-queries.ts` to ensure the bank import mutation points to `/api/bank/import`, not `/api/accounting/reconcile/import`.

---

### GAP 6 — `app.ts` missing security middleware

**File**: `server/src/app.ts`

Add these packages to `server/package.json`:
```json
"helmet": "^8.0.0",
"express-rate-limit": "^7.0.0",
"morgan": "^1.10.0"
```

Add to `server/src/app.ts` before `registerRoutes(app)`:
```ts
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

app.use(helmet());
app.use(morgan("dev"));
// Tight limit on login to prevent brute force
app.use("/api/auth/login", rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true }));
// General API limit
app.use("/api", rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true }));
```

Fix `@types/express` version mismatch in `server/package.json`:
```json
// CHANGE:
"@types/express": "^5.0.0"
// TO:
"@types/express": "^4.18.0"
```

---

### GAP 7 — `users.routes.ts` exposes passwordHash

**File**: `server/src/routes/users.routes.ts`

All `prisma.user.findMany()` and `prisma.user.findUnique()` calls return the `passwordHash` field.
Add `select` to every user query:

```ts
const USER_SELECT = {
  id: true, name: true, email: true,
  role: true, isActive: true, createdAt: true, updatedAt: true,
  // passwordHash: false (omit entirely)
} as const;

// Use in all queries:
prisma.user.findMany({ select: USER_SELECT, ... })
prisma.user.findUnique({ where: { id }, select: USER_SELECT })
```

---

### GAP 8 — `search.routes.ts` salesOrder search never matches

**File**: `server/src/routes/search.routes.ts`

`salesOrder.id` is a `cuid()` like `clx7abc123...` — searching it with `contains` on a human-typed search term will never match anything useful.

Replace with:
```ts
// REPLACE salesOrder search:
prisma.salesOrder.findMany({
  where: {
    OR: [
      { customer: { name: { contains: search, mode: "insensitive" } } },
      { notes: { contains: search, mode: "insensitive" } },
    ],
  },
  include: { customer: true },
  take: 5,
})
```

---

### GAP 9 — Furniture-specific schema fields (from codebase analysis)

Add to `schema.prisma` alongside the main prompt's schema changes:

**Product model** — add:
```prisma
hsCode          String?   @map("hs_code")
woodType        String?   @map("wood_type")
finishType      String?   @map("finish_type")
assemblyRequired Boolean  @default(false) @map("assembly_required")
warrantyMonths  Int       @default(0) @map("warranty_months")
leadTimeDays    Int       @default(0) @map("lead_time_days")
isCustomizable  Boolean   @default(false) @map("is_customizable")
```

**ProductVariant model** — add:
```prisma
fabricColor     String?   @map("fabric_color")
woodFinish      String?   @map("wood_finish")
sizeLabel       String?   @map("size_label")
hsCode          String?   @map("hs_code")
```

**SalesOrder model** — add:
```prisma
isCustomOrder      Boolean   @default(false) @map("is_custom_order")
expectedReadyDate  DateTime? @map("expected_ready_date")
assemblyNotes      String?   @map("assembly_notes")
deliveryFloor      Int?      @map("delivery_floor")
```

**Customer model** — add beyond the main prompt's fields:
```prisma
district        String?
ward            String?
```

**Delivery model** — add:
```prisma
floorDelivery   Boolean   @default(false) @map("floor_delivery")
assemblyService Boolean   @default(false) @map("assembly_service")
assemblyCharge  Decimal   @default(0) @map("assembly_charge") @db.Decimal(14,2)
deliveryCharge  Decimal   @default(0) @map("delivery_charge") @db.Decimal(14,2)
```

**CompanyProfile model** — fix the generic `taxNumber` field:
```prisma
// REMOVE: taxNumber String
// ADD:
panNo           String    @map("pan_no")
vatNo           String?   @map("vat_no")
```

---

## FRONTEND GAPS — ADD THESE TO THE MAIN PROMPT

---

### GAP 10 — `record-deposit-modal.tsx` calls the wrong endpoint

**File**: `client/src/components/sales/record-deposit-modal.tsx`

The deposit endpoint `POST /sales-orders/:id/deposit` is being replaced with a proper payment flow (Bug 3 fix). After that change, this modal must call the payments endpoint instead.

**Rewrite the modal's submit handler**:
```tsx
// WRONG — current:
await recordDeposit({ orderId, amount });  // calls POST /sales-orders/:id/deposit

// RIGHT — after fix, call payments:
await apiRequest("/api/payments", {
  method: "POST",
  body: {
    salesOrderId: orderId,
    amount: Number(depositAmount),
    method: selectedMethod,  // CASH | BANK | CARD
    bsDate: currentBsDate,
    note: "Initial deposit",
  },
  token,
});
```

Add `method` selector (CASH / BANK TRANSFER / CHEQUE) to the deposit modal UI since deposits can be paid different ways.

---

### GAP 11 — `create-product-form.tsx` is missing all furniture fields

**File**: `client/src/components/inventory/create-product-form.tsx`

The current form is generic. For a furniture business, rebuild it with these fields:

```tsx
// CATEGORY — dropdown, not free text:
const FURNITURE_CATEGORIES = [
  "Sofa Sets", "Dining Tables", "Bedroom Sets", "Office Furniture",
  "Wardrobes", "TV Units", "Center Tables", "Chairs", "Beds", "Other"
];

// WOOD TYPE — dropdown:
const WOOD_TYPES = ["Sal", "Teak", "Pine", "MDF", "Engineered Wood", "Plywood", "Other"];

// FINISH TYPE — dropdown:
const FINISH_TYPES = ["Lacquer", "Wax Polish", "Paint", "Natural", "Veneer", "Other"];

// Add these to formData state:
hsCode: "",
woodType: "",
finishType: "",
assemblyRequired: false,
warrantyMonths: "12",
leadTimeDays: "0",
isCustomizable: false,
length: "",     // already in schema, missing from form
width: "",      // already in schema, missing from form
height: "",     // already in schema, missing from form

// Show dimensions in the form as a group:
<div className="grid grid-cols-3 gap-2">
  <Input placeholder="Length (cm)" type="number" value={formData.length} ... />
  <Input placeholder="Width (cm)" type="number" value={formData.width} ... />
  <Input placeholder="Height (cm)" type="number" value={formData.height} ... />
</div>
```

**Also fix the variant form** — `barcode` field is in the UI but does NOT exist in `productVariantInputSchema`. Remove it or add it to the schema. Currently it submits silently and the barcode is dropped.

Correct variant fields to match schema:
```tsx
// CORRECT variant fields (match productVariantInputSchema exactly):
{ variantName: "", skuVariant: "", additionalCost: "0", stockQuantity: "0" }
// Plus furniture variant extras (after schema addition):
// fabricColor, woodFinish, sizeLabel
```

---

### GAP 12 — `create-sales-order-form.tsx` needs furniture improvements

**File**: `client/src/components/sales/create-sales-order-form.tsx`

1. **Product dropdown is too long** — replace with search-as-you-type:
```tsx
// Instead of <select> with all products:
const [productSearch, setProductSearch] = useState("");
const filteredProducts = products.data?.items.filter(p =>
  p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
  p.sku.toLowerCase().includes(productSearch.toLowerCase())
);
// Show max 20 filtered results
```

2. **Show margin warning** when entered price is below cost:
```tsx
{Number(item.unitPrice) < selectedProduct?.costPrice && (
  <p className="text-xs text-red-500">Price below cost price</p>
)}
```

3. **Show credit limit warning**:
```tsx
const orderTotal = lineItems.reduce((sum, item) => sum + qty * price * (1 - disc/100), 0);
const wouldExceedLimit = selectedCustomer &&
  (Number(selectedCustomer.outstandingBalance) + orderTotal) > Number(selectedCustomer.creditLimit);

{wouldExceedLimit && (
  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
    Warning: This order would exceed the customer's credit limit of {formatCurrency(selectedCustomer.creditLimit)}
  </div>
)}
```

4. **Add custom order fields** when selected product has `isCustomizable: true`:
```tsx
{selectedProducts.some(p => p.isCustomizable) && (
  <div className="space-y-2 p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <h4 className="font-medium text-sm">Custom Order Details</h4>
    <NepaliDatePickerInput
      label="Expected Ready Date"
      value={formData.expectedReadyDate}
      onChange={(date) => setFormData({ ...formData, expectedReadyDate: date.toISOString() })}
    />
    <Textarea placeholder="Assembly / customization notes" value={formData.assemblyNotes} ... />
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={formData.isCustomOrder}
        onChange={(e) => setFormData({ ...formData, isCustomOrder: e.target.checked })} />
      Mark as custom order (production tracking)
    </label>
  </div>
)}
```

5. **Add bsDate field** using `NepaliDatePickerInput` — the order date must be stored in BS format.

---

### GAP 13 — `schedule-delivery-form.tsx` missing furniture delivery fields

**File**: `client/src/components/delivery/schedule-delivery-form.tsx`

Add these fields to the delivery form:

```tsx
// Add to formData state:
deliveryCharge: "0",
assemblyService: false,
assemblyCharge: "0",
floorDelivery: false,
deliveryFloor: "",

// Add to form UI:
<div className="flex items-center gap-2">
  <input type="checkbox" id="assemblyService"
    checked={formData.assemblyService}
    onChange={(e) => setFormData({ ...formData, assemblyService: e.target.checked })} />
  <label htmlFor="assemblyService" className="text-sm">Assembly service required</label>
</div>

{formData.assemblyService && (
  <Input placeholder="Assembly Charge (NPR)" type="number"
    value={formData.assemblyCharge} ... />
)}

<div className="flex items-center gap-2">
  <input type="checkbox" id="floorDelivery"
    checked={formData.floorDelivery}
    onChange={(e) => setFormData({ ...formData, floorDelivery: e.target.checked })} />
  <label htmlFor="floorDelivery" className="text-sm">Floor delivery required</label>
</div>

{formData.floorDelivery && (
  <Input placeholder="Floor Number" type="number" value={formData.deliveryFloor} ... />
)}

<Input placeholder="Delivery Charge (NPR)" type="number"
  value={formData.deliveryCharge} ... />
```

---

### GAP 14 — `app-shell.tsx` company name is hardcoded

**File**: `client/src/components/layout/app-shell.tsx`

"Manish Steel" is hardcoded in the sidebar. It must come from the `CompanyProfile` API.

```tsx
// Add query:
const { data: settings } = useSettingsQuery();
const companyName = settings?.companyProfile?.name ?? "ERP";

// Replace hardcoded text:
// WRONG: <p className="text-xs ...">Manish Steel</p>
// RIGHT:
<p className="text-xs uppercase tracking-[0.3em] text-stone-400">{companyName}</p>
```

Also fix the icon map — currently maps icon names to wrong Lucide icons:
```tsx
import {
  LayoutDashboard, Boxes, ClipboardList, ShoppingCart,
  ReceiptText, BookMarked, Truck, BarChart3, SlidersHorizontal, Users
} from "lucide-react";

const iconMap = {
  LayoutDashboard, Boxes, ClipboardList, ShoppingCart,
  ReceiptText, BookMarked, Truck, BarChart3, SlidersHorizontal, Users,
};
```

Fix navigation section assignment — "Delivery" belongs under "Operations" not "Finance":
```tsx
{ section: "Operations", label: "Delivery", href: "/delivery", icon: "Truck" },
// Remove from Finance section
```

---

### GAP 15 — `use-queries.ts` missing hooks for new features

**File**: `client/src/hooks/use-queries.ts`

Add these hooks (the main prompt only lists 3, several more are needed):

```ts
// For the JWT-free PDF download (needed by customer-ledger-modal.tsx):
export function useDownloadTokenMutation() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: (input: { resource: string; id: string }) =>
      apiRequest<{ downloadToken: string }>("/download-token", {
        method: "POST", body: input, token
      }),
  });
}

// For custom orders production queue:
export function useCustomOrdersQuery() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["custom-orders"],
    queryFn: () => apiRequest<{ items: any[]; total: number }>(
      "/sales-orders?isCustomOrder=true&status=CONFIRMED,DEPOSIT_PAID,IN_WAREHOUSE",
      { token }
    ),
  });
}

// For VAT register (needed by ReportingPage):
export function useVatRegisterQuery(fiscalYear: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["vat-register", fiscalYear],
    queryFn: () => apiRequest<VatRegisterEntry[]>(
      `/vat-register?fiscalYear=${fiscalYear}`, { token }
    ),
    enabled: Boolean(fiscalYear),
  });
}

// For download token in ledger modal:
// Also update useCustomerLedgerQuery to pass fiscalYear param:
export function useCustomerLedgerQuery(customerId: string, fiscalYear?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["customer-ledger", customerId, fiscalYear],
    queryFn: () => apiRequest<ArLedgerEntry[]>(
      `/reports/customer-ledger/${customerId}${fiscalYear ? `?fiscalYear=${fiscalYear}` : ""}`,
      { token }
    ),
    enabled: Boolean(customerId),
  });
}

// For tax invoices (renamed endpoint):
export function useTaxInvoicesQuery(params?: { status?: string; search?: string }) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["tax-invoices", params],
    queryFn: () => apiRequest<{ items: TaxInvoiceRow[]; total: number }>(
      "/tax-invoices", { token, query: params }
    ),
  });
}

// For payments by order (for balance display in payment form):
export function useOrderPaymentsQuery(salesOrderId: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["payments", "order", salesOrderId],
    queryFn: () => apiRequest<{ items: any[] }>(
      `/payments?salesOrderId=${salesOrderId}`, { token }
    ),
    enabled: Boolean(salesOrderId),
  });
}
```

---

### GAP 16 — `domain.ts` missing furniture and new feature types

**File**: `client/src/types/domain.ts`

Add alongside the 3 types in the main prompt:

```ts
// Update ProductRow with furniture fields:
export type ProductRow = {
  id: string;
  name: string;
  sku: string;
  category: string;
  material: string;
  status: string;
  stock: number;
  margin: number;
  valuation: number;
  sellingPrice: number;
  defaultVariantId: string;
  // ADD:
  hsCode?: string;
  woodType?: string;
  finishType?: string;
  isCustomizable: boolean;
  assemblyRequired: boolean;
  warrantyMonths: number;
  leadTimeDays: number;
  dimensions?: string;  // formatted "L: Xcm × W: Ycm × H: Zcm"
};

// Update SalesOrderRow with new fields:
export type SalesOrderRow = {
  id: string;
  customer: string;
  status: string;
  deliveryDate: string;
  balanceDue: number;
  // ADD:
  orderAmount: number;
  paidAmount: number;
  isCustomOrder: boolean;
  expectedReadyDate?: string;
  fiscalYear?: string;
};

// Add payment type:
export type PaymentRow = {
  id: string;
  salesOrderId: string;
  customer: string;
  amount: number;
  method: string;
  paymentDate: string;
  bsDate?: string;
  reference?: string;
  note?: string;
};

// Add custom order type for production queue:
export type CustomOrderRow = {
  id: string;
  customer: string;
  status: string;
  orderAmount: number;
  balanceDue: number;
  expectedReadyDate?: string;
  assemblyNotes?: string;
  daysUntilReady?: number;
};
```

Also add the `formatDimensions` utility to `client/src/lib/utils.ts`:
```ts
export function formatDimensions(l?: number | null, w?: number | null, h?: number | null) {
  const parts = [
    l ? `L: ${l}cm` : null,
    w ? `W: ${w}cm` : null,
    h ? `H: ${h}cm` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" × ") : "—";
}
```

---

### GAP 17 — `client/package.json` cleanup

**File**: `client/package.json`

Remove the unused duplicate Nepali date picker:
```json
// REMOVE this line:
"@himal_bhattarai/nepali-datepicker": "^1.2.3",
```

Add for better form handling (optional but strongly recommended — current forms use verbose useState per field):
```json
"react-hook-form": "^7.54.0",
"@hookform/resolvers": "^3.9.0",
"zod": "^3.24.2"
```

Add for dev experience:
```json
// devDependencies:
"@tanstack/react-query-devtools": "^5.66.8"
```

---

### GAP 18 — `InvoicingPage.tsx` and `SalesPage.tsx` endpoint updates

**File**: `client/src/pages/InvoicingPage.tsx`

Update all API calls from `/invoices` to `/tax-invoices`:
```tsx
// Every useInvoicesQuery call → useTaxInvoicesQuery
// Every useCreateInvoiceMutation → useCreateTaxInvoiceMutation
// The mutation endpoint: POST /tax-invoices/from-sales-order/:id
```

**File**: `client/src/pages/SalesPage.tsx`

Fix the row click navigation (currently goes to `/sales` which is the same page):
```tsx
// WRONG:
detailHref={() => "/sales"}

// RIGHT — link to a detail page:
detailHref={(row) => `/sales/orders/${row.id}`}
```

Add a `Route` for this detail page in `App.tsx`:
```tsx
<Route path="/sales/orders/:orderId" element={<SalesOrderDetailPage />} />
```

Create `client/src/pages/SalesOrderDetailPage.tsx` with:
- Order summary (customer, dates, status, amounts)
- Line items table
- Payment history (from ArLedger CREDIT entries)
- TaxInvoice status + link to PDF (if exists)
- Delivery status
- Action buttons: Confirm, Record Payment, Create Invoice, Schedule Delivery

---

## UPDATED IMPLEMENTATION ORDER

Replace the implementation order in the main prompt with this expanded version:

1. `server/package.json` — add helmet, express-rate-limit, morgan; fix @types/express version
2. `client/package.json` — remove @himal_bhattarai duplicate; add react-hook-form + zod
3. `schema.prisma` — all changes from main prompt + GAP 1 (paidAmount) + GAP 9 (furniture fields)
4. Run `npx prisma migrate dev --name "ar-vat-separation"`
5. Utility files — `fiscal-year.util.ts`, `invoice-seq.util.ts`, `number-words.util.ts`
6. `ar-ledger.service.ts` (new)
7. `vat-register.service.ts` (new)
8. `payment.service.ts` (rewrite)
9. `sales-order.service.ts` (rewrite)
10. `tax-invoice.service.ts` (rewrite)
11. `report.service.ts` — fix `getCustomerLedger` + `getTaxSummary` (GAP 4)
12. `dashboard.service.ts` — fix all 4 broken calculations (GAP 3)
13. `app.ts` — add helmet, rate limit, morgan (GAP 6)
14. Routes in order: payments → sales-orders → tax-invoices → customers → reports
15. `accounting.routes.ts` — remove duplicate bank import (GAP 5)
16. `users.routes.ts` — add USER_SELECT to hide passwordHash (GAP 7)
17. `search.routes.ts` — fix salesOrder search (GAP 8)
18. PDF templates: `vat-invoice.pdf.tsx` + `ar-statement.pdf.tsx` + `receipt.pdf.tsx` (GAP 2)
19. Download font files to `server/assets/fonts/` (Inter-Regular.ttf, Inter-Bold.ttf)
20. `seed.ts` — update with new schema, furniture product data, ArLedger entries
21. **Frontend**: `domain.ts` types (main prompt + GAP 16)
22. **Frontend**: `utils.ts` — add formatDimensions
23. **Frontend**: `use-queries.ts` — all hooks from main prompt + GAP 15
24. **Frontend**: `app-shell.tsx` — fix company name, icon map, nav sections (GAP 14)
25. **Frontend**: `create-product-form.tsx` — full furniture rebuild (GAP 11)
26. **Frontend**: `create-customer-form.tsx` — Nepal fields (main prompt)
27. **Frontend**: `create-sales-order-form.tsx` — search, credit limit, custom order (GAP 12)
28. **Frontend**: `create-invoice-form.tsx` — full rewrite (main prompt)
29. **Frontend**: `record-payment-form.tsx` — salesOrderId link (main prompt)
30. **Frontend**: `record-deposit-modal.tsx` — call payments endpoint (GAP 10)
31. **Frontend**: `schedule-delivery-form.tsx` — furniture delivery fields (GAP 13)
32. **Frontend**: `customer-ledger-modal.tsx` — JWT fix (main prompt)
33. **Frontend**: `InvoicingPage.tsx` — update to /tax-invoices (GAP 18)
34. **Frontend**: `SalesPage.tsx` + `App.tsx` — fix detailHref + add SalesOrderDetailPage (GAP 18)
35. **Test checklist** (from implementation plan verification section)

---

*End of addendum. Use this document together with ERP_BUILD_PROMPT.md.*