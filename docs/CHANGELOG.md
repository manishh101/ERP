# Change Log

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
