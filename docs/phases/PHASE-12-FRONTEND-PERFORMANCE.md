# Phase 12 — React Query & Frontend Performance Optimization

## Overview
Phase 12 executed an evidence-driven performance overhaul across the ERP frontend. By standardizing React Query default options, implementing intelligent stale-time configurations on reference data, tuning cross-domain mutation invalidation, and adding targeted component memoization, frontend rendering efficiency and data synchronization have been optimized.

## Key Changes

### 1. Global React Query Configuration (`query-client.ts`)
- **Stale Time (`staleTime`)**: Set to **30 seconds** globally to prevent immediate background refetches on component remounts.
- **Garbage Collection (`gcTime`)**: Standardized to **5 minutes** for keeping inactive queries in cache memory.
- **Retry Strategy**: Fixed to **1 retry**, reducing request floods during transient network failures.
- **Window Focus Polling**: Set `refetchOnWindowFocus: false` to eliminate aggressive background re-fetching on browser tab switches.

### 2. Strategic Reference Data Caching (`use-queries.ts`)
Extended `staleTime` to **2 minutes (120,000 ms)** for high-frequency reference lookups:
- `useProductsQuery` & `useAllProductsQuery`
- `useSuppliersQuery`
- `useCustomersQuery`
- `useWarehousesQuery`

This eliminates unnecessary network queries when opening drop-down select controls across forms and pages.

### 3. Precise Cross-Domain Mutation Invalidation (`use-queries.ts`)
Standardized mutation hooks to trigger precise, cross-domain invalidations upon mutation success without requiring full-application refetches:
- **`useCreateInvoiceMutation`**: Invalidates `["tax-invoices"]`, `["estimate-bills"]`, `["sales-orders"]`, `["sales-order"]`, `["dashboard"]`, `["ar-ledger"]`, `["vat-register"]`, `["customer-workspace"]`, `["customer-ledger"]`, `["customers"]`, `["customer"]`, `["accounting-summary"]`, `["journal-entries"]`.
- **`useRecordPaymentMutation`**: Updated legacy `["invoices"]` key to `["tax-invoices"]`, and invalidates `["sales-orders"]`, `["sales-order"]`, `["purchase-orders"]`, `["purchase-order"]`, `["payments"]`, `["supplier-invoices"]`, `["suppliers"]`, `["customers"]`, `["customer"]`, `["customer-workspace"]`, `["customer-ledger"]`, `["ar-ledger"]`, `["dashboard"]`, `["accounting-summary"]`, `["journal-entries"]`.

### 4. Component Rendering Optimizations (`CustomerWorkspacePage.tsx`)
- Wrapped customer orders, payment calculations, and aggregate financial metrics (sales volume, payments received, credit utilization, available balance) in `useMemo`.
- Wrapped `orderColumns` and `paymentColumns` table definitions in `useMemo` to eliminate re-creating React Table column arrays on every tab switch or state update.

## Verification
- Executed full production build (`npm run build`), passing TypeScript compilation and Vite bundling with zero type or build errors.
