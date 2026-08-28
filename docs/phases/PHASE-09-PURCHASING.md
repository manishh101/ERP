# Phase 9 — Purchasing Workflow Transformation (Connected Document Hub)

## Executive Overview
Phase 9 transforms fragmented procurement operations into a unified, high-transparency Purchasing Workflow. By linking **Purchase Orders**, **Goods Receipts**, **Supplier Invoices**, and **Payments**, users can track and execute the entire procurement lifecycle without needing deep knowledge of complex database structures.

---

## Key Modules & Implementation Details

### 1. Enriched Purchase Order Creation Form
- **Catalog Autocomplete**: Direct product & variant selection with live inventory stock & unit cost defaults.
- **Detailed Supplier Context**: Live display of supplier email, phone, and PAN number.
- **Automatic Calculations**: Dynamic line-item subtotal, tax amount, and order total calculation.

### 2. Purchase Order Detail Page & Connected Document Hub
- **Visual Stepper**: Real-time lifecycle pipeline (Draft → Approved → Sent → Goods Received → Closed).
- **Executive Financial Metrics Card**:
  - **PO Agreed Value**: Total contracted value.
  - **Received Goods Value**: Value of inventory physically received to date.
  - **Invoiced Value**: Sum of supplier VAT bills recorded against the PO.
  - **Paid Total & Balance Payable**: Real-time financial settlement tracking.
- **Connected Documents Hub**:
  - **Goods Receipts Tab**: Display received quantities per item with partial/full receipt badges and inline links.
  - **Supplier Invoices Tab**: Lists supplier VAT bills, issue dates, total amounts, and payment statuses.
  - **Payments Ledger Tab**: Tracks payment outflows against supplier invoices with payment dates, reference IDs, and payment methods.

### 3. Precision Partial Goods Receipt Modal
- **Line-by-Line Receipt Tracking**: Clearly displays `Ordered Qty`, `Previously Received`, `Current Receipt`, and `Remaining Qty`.
- **Validation**: Enforces non-negative inputs and prevents invalid over-receiving beyond ordered quantities.

### 4. Dual-Mode Payments Center (AR & AP Outflow)
- **Mode Toggle**: Seamlessly switch between **Customer Payment (AR Receipt)** and **Supplier Payment (AP Outflow)**.
- **Supplier Invoice Picker**: Filter supplier invoices with outstanding balances, auto-fill balance due, and record payments directly against supplier invoices.
- **Instant Cache Synchronization**: Invalidation of `["purchase-order"]`, `["supplier-invoices"]`, `["payments"]`, and `["suppliers"]` query keys on successful payment recording.

---

## Financial & Accounting Invariants
1. **GL Integration**: Supplier payment recording triggers `postSupplierPaymentJournalEntry` inside an atomic transaction, debiting Accounts Payable and crediting Cash/Bank.
2. **Invoice Reconciliation**: Supplier invoice status updates dynamically to `PARTIALLY_PAID` or `PAID` based on exact balance calculations.
3. **No Over-Receiving**: Physical goods receipts strictly bounded by remaining quantities.

---

## Verification & Build Status
- **TypeScript**: 0 compilation errors across client and server.
- **Vite Production Bundle**: Successfully built (`✓ built in 21.63s`).
