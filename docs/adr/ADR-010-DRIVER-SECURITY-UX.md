# ADR-010: Driver Security Authorization Scoping & Mobile-First UX

## Status
Accepted

## Date
2026-08-28

## Context
The ERP system previously handled dispatches solely through an administrative table interface (`DeliveryPage.tsx`). When drivers logged into the system, they were exposed to complex administrative tables, accounting records, revenue dispatches, and print dialogs that were unnecessary and poorly suited for mobile devices. Furthermore, single-delivery API routes (`GET /deliveries/:id`, `PATCH /deliveries/:id`, and `POST /deliveries/:id/fail`) only filtered by `tenantId`, allowing drivers to potentially access or alter deliveries assigned to other drivers within the tenant if route hiding failed.

## Decision
1. **Server-Side Security Scoping**: Single-resource delivery endpoints now strictly validate driver ownership:
   - For users with the `DRIVER` role, queries automatically enforce `driverId === request.user.id`.
   - Any attempt by a driver to query, update, or fail a delivery assigned to another driver yields a `403 Forbidden` error.
2. **Dedicated Mobile Driver Workspace (`/driver`)**:
   - Implemented a clutter-free, mobile-optimized workspace specifically for drivers.
   - Answers the 5 core driver questions directly:
     1. *Where am I going?* (Address + One-touch Google Maps direct link)
     2. *Which customer?* (Customer Name + One-touch `tel:` direct dial)
     3. *Which order?* (Order & Challan Reference)
     4. *What am I delivering?* (Clean product item breakdown with quantities)
     5. *What should I do next?* (Prominent 48px touch buttons for status transitions)
3. **Proof of Delivery (POD) & Issue Capture**:
   - Enabled driver notes, proof photo attachment references, and instant timestamped delivery completion (`DELIVERED`).
   - Enabled standardized issue reporting (`FAILED_ATTEMPT`) with reasons (e.g. Customer Not Available, Incorrect Address, Refused) and optional reschedule date capture.
4. **Role-Based Home Navigation**:
   - Users with the `DRIVER` role are automatically routed from the root `/` URL to `/driver`.

## Consequences
- **Positive**: Drivers enjoy a streamlined, high-contrast, touch-friendly mobile interface without accounting noise.
- **Positive**: Strict API-level authorization guarantees data isolation across drivers.
- **Negative**: Drivers cannot view unassigned deliveries unless reassigned by a warehouse administrator.
