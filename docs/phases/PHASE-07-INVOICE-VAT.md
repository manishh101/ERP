# Phase 7: Tax Invoice & VAT Transformation

## Executive Summary
Phase 7 transformed the Tax Invoices and VAT Registration experience in Manish Steel ERP. It delivers a professional, auditable, and IRD Nepal-compliant tax invoicing workflow while enforcing strict architectural separation between **Commercial Accounts Receivable (AR)** and **Statutory VAT Compliance**.

---

## Key Achievements

### 1. Separation of Commercial AR & Statutory VAT Compliance
- **Commercial AR (Khata)**: Governed strictly by `SalesOrder.orderAmount` and `Payment.amount`. Tracks actual customer balances, payment agreements, and running ledger totals.
- **Statutory VAT (Tax Invoices / Annex 7)**: Governed strictly by `TaxInvoice.invoiceAmount` and `VatRegister` (13% VAT / PAN Annex 7). Represents legal tax filings under Inland Revenue Department (IRD Nepal) rules.
- **UI Compliance Banners**: Distinct visual notice callouts were added to both the Invoicing and VAT Register pages to ensure sales reps and accountants never confuse AR running balances with legal tax invoice outputs.

### 2. High-Density Invoicing Page (`InvoicingPage.tsx`)
- **KPI Summary Header**: Highlights real-time Taxable Subtotal, Output VAT (13%), Grand Total Invoiced, and Total Bills Count.
- **Multi-Faceted Filtering Bar**:
  - Full-text Search (Invoice Number, Party Name)
  - Invoice Type Filter (`VAT` कर बिजक, `PAN` बिजक, `ESTIMATE` अनुमानित बिल)
  - Status Filter (`DRAFT`, `SENT`, `PAID`)
  - Fiscal Year & BS Month Filter (`YearMonthFilter`)
- **Actionable Bill Register**: Instant slide-over inspection of invoice line items, party metadata, and download links.

### 3. Comprehensive Invoice Detail View (`TaxInvoiceDetailModal`)
- Modal component allowing single-click deep inspection of any tax bill.
- Renders itemized product names, quantities, unit prices, discounts, line totals, taxable value, and 13% VAT breakdown.
- Displays linked Commercial Sales Order reference and order amount.
- Single-click secure PDF export trigger.

### 4. IRD Annex 7 VAT Register (`VatRegisterPage.tsx`)
- **Statutory Sales Register (बिक्री खाता - अनुसूची ७)**: Displays official taxable sales, zero-rated exports, and output VAT.
- **Search & Filters**: Enables filtering by fiscal year, Nepali month (Baisakh to Chaitra), invoice number, buyer name, or PAN number.
- **Export CSV & Print Capabilities**: Single-click export of IRD Annex 7 CSV logs for direct accounting upload or filing.

### 5. Robust Error Handling & Security
- **Friendly Business Error Messages**: Transformed raw Prisma database error codes (`P2002`, `P2025`, `P2003`) into clear, user-friendly business explanations (e.g., *"This invoice number already exists. Please use a different invoice number."*).
- **Tenant Isolation & Secure Download Tokens**: PDF downloads require short-lived, purpose-bound JWT download tokens (`/auth/download-token`), ensuring multi-tenant isolation and secure authorization.

---

## Architecture & Data Flow

```
+-------------------------------------------------------------------------+
|                              Sales Order                                |
|                        (Commercial AR Source)                           |
+-------------------------------------------------------------------------+
       |                                                    |
       v (Payment/Khata)                                    v (Create Invoice)
+------------------------+                        +-----------------------+
|  AR Ledger & Payments  |                        |      Tax Invoice      |
| (Commercial AR Truth)  |                        |  (13% Tax Compliance) |
+------------------------+                        +-----------------------+
       |                                                    |
       v                                                    v
  Customer Running                                    VAT Register (Annex 7)
    AR Balance                                       (Statutory IRD Truth)
```

---

## Verification & Build Status
- **Client Build (`@myerp/client`)**: `tsc -b && vite build` &mdash; **0 errors**.
- **Server Build (`@myerp/server`)**: `tsc -p tsconfig.json` &mdash; **0 errors**.
- All invoicing and VAT features fully verified.
