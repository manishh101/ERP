# Change Log

## [2026-08-28] - Phase Delivery Sync: Sales Order & Delivery Workflow Alignment

### Phase
Phase Delivery Sync — Sales Order & Delivery Workflow Alignment

### Major Changes
- **Atomic Two-Way State Synchronization**:
  - `POST /deliveries`: Creating a delivery automatically advances linked `SalesOrder.status` from `CONFIRMED` to `IN_WAREHOUSE`.
  - `PATCH /deliveries/:id`: Updating delivery status to `OUT_FOR_DELIVERY` or `DELIVERED` automatically updates linked `SalesOrder.status`.
  - `PATCH /sales-orders/:id`: Updating sales order status to `DELIVERED` or `OUT_FOR_DELIVERY` atomically updates linked `Delivery.status` within a single `prisma.$transaction` block.
  - `cancelOrder`: Order cancellation automatically sets linked active `Delivery` records to `CANCELLED` within the transaction, eliminating orphaned dispatches.
- **Frontend Guardrails & Workflow Stepper**:
  - `SalesOrderDetailPage.tsx`: Visual OTC Stepper accurately maps `IN_WAREHOUSE`, `DISPATCHED` (`OUT_FOR_DELIVERY`), and `DELIVERED` steps.
  - Disabled illegal status jumps (e.g. marking `DELIVERED` directly from `IN_WAREHOUSE` without vehicle dispatch).
- **Cache Synchronization**:
  - React Query invalidation in `use-queries.ts` ensures instant synchronization between Sales, Delivery Challan Register, and Driver Workspaces.

## [2026-08-28] - Phase 18: Final Production Readiness Audit

### Phase
Phase 18 — Final Production Readiness Audit

### Production Audit Verdict: READY
- **Monorepo Build Health**: Both `@myerp/server` and `@myerp/client` compiled with zero TypeScript errors (`npm run lint` & `npm run build`).
- **Accounting Invariants Confirmed**: Commercial `SalesOrder.orderAmount` (AR statement source) and tax compliance `TaxInvoice.invoiceAmount` (VAT Register source) remain strictly separated.
- **Tenant Isolation & RBAC**: Confirmed AsyncLocalStorage tenant context injection across all Prisma queries and backend role-based access control.
- **Phase Documentation**: Published `docs/phases/PHASE-18-PRODUCTION-READINESS.md`.

## [2026-08-28] - Phase 17: Final UX + UI Polish

### Phase
Phase 17 — Final UX + UI Polish

### Major Polish & Improvements
- **Global UI Component Standardization**: Unified button variants, badges, card layouts, table column headers, and modal structures across all ERP workspaces.
- **Visual Hierarchy & Information Density**: Enforced right-aligned numeric fields (`tabular-nums text-right`), clear primary/secondary action positioning, and clean NPR currency formatting.
- **Financial Clarity Preserved**: Preserved strict distinction between commercial `SalesOrder.orderAmount` and tax compliance `TaxInvoice.invoiceAmount`.
- **Persona Usability**: Refined experience for Owner, Accountant, Salesperson, Warehouse Manager, and Delivery Driver personas.
- **Phase Documentation**: Published `docs/phases/PHASE-17-FINAL-UX-POLISH.md`.

## [2026-08-28] - Phase 16: Full ERP End-to-End QA + Regression Verification

### Phase
Phase 16 — Full ERP End-to-End QA + Regression

### Major Changes & Verification Results
- **Full Monorepo Build Health**: Clean compilation across `@myerp/server` and `@myerp/client` with zero TypeScript errors (`npm run lint` & `npm run build`).
- **End-to-End Workflow Audit**: Validated all 13 core business journeys (Sales, Customer/AR, VAT, Inventory, Purchasing, Delivery, Accounting, RBAC, Tenant Isolation, Error Handling, React Query Sync, and Responsive Layouts).
- **Accounting Invariants Preserved**: Re-confirmed strict separation between commercial `SalesOrder.orderAmount` (AR Ledger source) and compliance `TaxInvoice.invoiceAmount` (VAT Register source).
- **Phase Documentation**: Published `docs/phases/PHASE-16-FULL-QA.md`.

## [2026-08-28] - Phase 10: Delivery + Driver UX Transformation

### Phase
Phase 10 — Delivery + Driver UX Transformation

### Major Changes
- **Mobile Driver Workspace (`DriverWorkspacePage.tsx`)**: Built a mobile-first interface designed for drivers, featuring large touch targets, direct map navigation links, direct customer calling (`tel:`), product item summaries, and quick status action buttons.
- **Proof of Delivery (POD) Modal**: Added support for driver notes/particulars and proof photo attachment references with instant timestamped delivery completion.
- **Delivery Issue & Failure Reporting**: Added modal for standard failure reasons ("Customer Not Available", "Incorrect Address", "Customer Refused", "Vehicle Breakdown") with optional reschedule date capture.
- **Role-Based Driver Routing**: Added automatic redirect for `DRIVER` role users from root `/` to `/driver`.

### Important Fixes
- **Backend Authorization Scoping**: Enforced `driverId === request.user.id` on single-delivery endpoints (`GET /deliveries/:id`, `PATCH /deliveries/:id`, and `POST /deliveries/:id/fail`) for `DRIVER` role users to prevent unauthorized access or modification of other drivers' dispatches.
- **Flexible Photo Verification**: Relaxed `proofPhotoUrl` schema validation to allow attachment strings and data URLs without rigid URL format failure.

### Affected Workflows
- **Warehouse Dispatch & Delivery**: Sales Order → Warehouse Dispatch → Driver Route Execution → Proof of Delivery / Issue Reporting.

### Verification Status
- **Build Status**: `PASS` (Client & Server TypeScript check `0` errors; Vite production build completed successfully).
- **Security Verification**: `PASS` (Backend enforced driver resource ownership).

## [2026-08-28] - Phase 9: Purchasing Workflow Transformation

### Phase
Phase 9 — Purchasing Workflow Transformation (Connected Document Hub)

### Major Changes
- **Connected Procurement Document Hub**: Transformed `PurchaseOrderDetailPage.tsx` into a central hub linking Purchase Orders, Goods Receipts, Supplier Invoices, and Payments.
- **Executive Financial Metrics Card**: Real-time KPI breakdown surfacing Agreed PO Amount, Goods Received Value, Supplier Invoiced Total, Paid Amount, and Outstanding Balance Payable.
- **Dual-Mode Payments Ledger**: Extended `PaymentsPage.tsx` to support **Supplier Payment (AP Outflow)** recording alongside Customer Payment (AR Receipt).
- **Line-by-Line Partial Receiving**: Enhanced `receive-goods-modal.tsx` with clear quantity comparison (`Ordered`, `Received`, `Current`, `Remaining`) and over-receive validation.

### Important Fixes
- Added `supplierInvoiceId` handling in `payments.routes.ts` and frontend mutations to update invoice balances, statuses, and post GL journal entries atomically.
- Ensured invalidation of `purchase-order`, `supplier-invoices`, `payments`, and `suppliers` queries on payment submission for instant UI synchronization.
- Resolved TypeScript build errors in product variant property access and stepper index calculations.

### Affected Workflows
- **Procurement & Goods Receiving**: PO Creation → Order Approval → Partial/Full Receiving → Supplier Invoice Entry → Supplier Payment Settlement.
- **Accounts Payable (AP)**: Supplier Invoice balance tracking and payment outflow ledger.

### Verification Status
- **Build Status**: `PASS` (Client & Server TypeScript check `0` errors; Vite production build completed in 21.63s).
- **Accounting Invariants**: `PASS` (GL journal entry posted inside atomic transactions; no over-receiving permitted).
