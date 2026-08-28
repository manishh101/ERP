# Phase Documentation: Sales Order & Delivery Workflow Alignment

## Overview
This phase synchronizes the Sales Order (`SalesOrder`) and Delivery (`Delivery`) business processes in the ERP, enforcing a strict sequential state machine while maintaining zero backend data drift between the two models.

## Key Changes

### 1. State Machine Standardization
- Life Cycle Enforced:
  `IN_WAREHOUSE` → `OUT_FOR_DELIVERY` → `DELIVERED`
- Sales Order Stepper steps:
  0. `Draft / Quote`
  1. `Order Confirmed`
  2. `In Warehouse`
  3. `Dispatched` (`OUT_FOR_DELIVERY` / `DISPATCHED`)
  4. `Delivered` (`DELIVERED`)

### 2. Atomic Backend Synchronization
- **Delivery Creation (`POST /deliveries`)**:
  - Automatically advances linked `SalesOrder.status` from `CONFIRMED`, `DEPOSIT_PAID`, or `PAID` to `IN_WAREHOUSE` upon challan creation (`SCHEDULED`).
  - Sets `SalesOrder.status` to `OUT_FOR_DELIVERY` or `DELIVERED` if initial delivery status is dispatch/completed.
- **Delivery Update (`PATCH /deliveries/:id`)**:
  - Synchronizes `SalesOrder.status` to `OUT_FOR_DELIVERY` or `DELIVERED` when delivery status transitions.
  - Reverts linked `SalesOrder.status` back to `IN_WAREHOUSE` if a delivery status is reset to `SCHEDULED`.
  - Updates `completedAt` timestamp on full delivery.
- **Delivery Failure Attempt (`POST /deliveries/:id/fail`)**:
  - Marks delivery status as `FAILED_ATTEMPT` with the failure reason and atomically returns `SalesOrder.status` to `IN_WAREHOUSE` inside a `prisma.$transaction`, enabling warehouse staff to re-schedule or re-assign dispatch.
- **Sales Order Update (`PATCH /sales-orders/:id`)**:
  - Updates linked `Delivery.status` atomically within a single `prisma.$transaction` block when status moves to `OUT_FOR_DELIVERY` or `DELIVERED`.
  - Reverts `OUT_FOR_DELIVERY` deliveries to `SCHEDULED` if order status moves back to `IN_WAREHOUSE`.
- **Sales Order Cancellation (`cancelOrder`)**:
  - Cancels linked active `Delivery` records within the cancellation transaction (`status: "CANCELLED"`), releasing stock allocations and reversing accounting GL entries without leaving orphaned dispatches.

### 3. Frontend UX Guardrails (`SalesOrderDetailPage.tsx`)
- Action buttons now enforce the sequential workflow:
  - `Mark Delivered & Complete` button is disabled until the order/delivery transitions to `OUT_FOR_DELIVERY` or `DISPATCHED`.
  - Display tooltips explaining that vehicle dispatch must occur before completing delivery.

### 4. Cache Invalidation
- React Query hooks (`useUpdateDeliveryMutation`, `useUpdateSalesOrderStatusMutation`, `useConfirmSalesOrderMutation`, `useCancelSalesOrderMutation`) invalidate `["sales-orders"]`, `["sales-order"]`, and `["deliveries"]` queries to ensure instant UI responsiveness across all dashboards.
