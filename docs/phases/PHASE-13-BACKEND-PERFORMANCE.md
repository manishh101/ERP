# Phase 13 — Backend + PostgreSQL + Redis Performance

## Overview

Phase 13 delivers an evidence-driven backend performance optimization across PostgreSQL query execution, Prisma relation loading, and Redis caching infrastructure. The primary objective is to maximize throughput and minimize latency for read-heavy operations while preserving strict tenant isolation, transaction integrity, and financial accounting accuracy.

---

## Performance Bottlenecks & Analysis

### 1. Multi-Tenant Query Indexing
- **Issue**: Multi-tenant queries filtering by `tenantId` in conjunction with status, dates, or foreign keys (e.g. `SalesOrder`, `TaxInvoice`, `GoodsReceipt`, `SupplierInvoice`, `Delivery`, `StockMovement`, `VatRegister`) relied on single-column or legacy indexes.
- **Resolution**: Added composite indexes to `schema.prisma` targeting compound filter conditions used in high-frequency queries.

### 2. Redis Cache Staleness & Invalidation Gaps
- **Issue**: Mutations in sales orders, payments, deliveries, and inventory properly invalidated the Redis dashboard cache (`invalidateDashboardCache`), but mutations in tax invoices, purchase orders, goods receipts, and manual journal entries lacked invalidation calls. This could cause dashboard metrics to reflect stale numbers under active Redis caching.
- **Resolution**: Integrated `invalidateDashboardCache(tenantId)` into `tax-invoices.routes.ts`, `purchase-orders.routes.ts`, and `accounting.routes.ts`.

---

## Indexing & Query Optimizations

### Composite PostgreSQL Indexes Added in Prisma Schema
| Model | Composite Index Definition | Access Pattern / Justification |
| :--- | :--- | :--- |
| `SalesOrder` | `@@index([tenantId, status, orderDate])`<br>`@@index([tenantId, customerId])` | Optimizes role-based dashboard aggregations and customer order history lookups. |
| `TaxInvoice` | `@@index([tenantId, status, issueDate])` | Speeds up multi-tenant tax invoice queries and revenue calculations. |
| `GoodsReceipt` | `@@index([tenantId, status])` | Accelerates pending receipt count checks in warehouse command center. |
| `SupplierInvoice` | `@@index([tenantId, status, issueDate])` | Optimizes AP aging and supplier invoice queries. |
| `Delivery` | `@@index([tenantId, status, scheduledDate])` | Accelerates driver workspace and dispatch delivery queue fetches. |
| `StockMovement` | `@@index([tenantId, occurredAt])` | Optimizes inventory audit and stock movement reporting queries. |
| `VatRegister` | `@@index([tenantId, fiscalYear])` | Accelerates statutory VAT summary and compliance report generation. |

---

## Redis Caching Policy & Financial Safety Invariants

### Caching Boundaries
1. **Aggregations & Overviews (Cached)**:
   - Dashboard overviews (`ADMIN`, `ACCOUNTANT`, `SALES`, `WAREHOUSE`)
   - AR aging buckets & top entities
   - Financial summaries (Today / Month / Year)
   - Showroom analytics per customer
2. **Financial Truth (Uncached / Live Queries)**:
   - `ArLedger` (AR ledger entries and running balances)
   - `Payment` records and allocations
   - `JournalEntry` and `Account` balances
   - `VatRegister` individual tax invoice records
   - `DRIVER` overview (per-driver queue computed live to avoid key explosion)

### Invalidation Strategy
- All mutation handlers affecting financial state, inventory stock, or order status invoke `invalidateDashboardCache(tenantId)`.
- Redis error handling operates with a fail-open pattern (`withCache` falls through to live PostgreSQL queries on network miss/timeout).

---

## Verification & Build Validation

- Generated updated Prisma client via `npx prisma generate`.
- Verified TypeScript compilation and monorepo bundling via `npm run build`. Zero type errors.
