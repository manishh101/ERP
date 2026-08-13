# Quick Reference: Critical Fixes

## What Changed?

### 🛡️ Fix #1: Stock Validation (REQUIRED)
**When confirming orders**, the system now:
- ✅ Checks ALL items have sufficient stock BEFORE making any changes
- ✅ Shows clear error listing which items are out of stock
- ✅ Uses accurate post-update values for inventory tracking

**Error Example:**
```
Insufficient stock for the following items:
Office Chair Standard / Black Leather (Required: 10, Available: 3)
Conference Table / Walnut Finish (Required: 5, Available: 2)
```

### 🔒 Fix #2: Paid Order Protection (REQUIRED)
**When cancelling orders**, the system now:
- ✅ BLOCKS cancellation if ANY payments exist
- ✅ Explains why and suggests proper refund process
- ✅ Prevents GL imbalance (cash collected but AR reversed)

**Error Example:**
```
Cannot cancel order with 2 payment(s) totaling Rs. 30,000.00.
Please issue a refund instead to maintain financial integrity.
```

### ⏱️ Fix #3: Rate Limiting (SECURITY)
**For financial operations**, the system now:
- ✅ Limits to 10 requests per minute per user
- ✅ Prevents accidental double-clicks
- ✅ Protects against DoS attacks
- ✅ Shows clear "retry after X seconds" messages

**Affected Endpoints:**
- `POST /api/payments`
- `POST /api/sales-orders`
- `POST /api/sales-orders/:id/deposit`

---

## For Frontend Developers

### Handle New Error Responses

**Stock Validation Error (400):**
```typescript
try {
  await confirmOrder(orderId);
} catch (error) {
  if (error.details?.insufficientItems) {
    // Show detailed list of out-of-stock items
    showStockErrorDialog(error.details.insufficientItems);
  }
}
```

**Paid Order Cancellation (400):**
```typescript
try {
  await cancelOrder(orderId);
} catch (error) {
  if (error.details?.paidAmount > 0) {
    // Redirect to refund flow instead
    showRefundDialog({
      orderId,
      paidAmount: error.details.paidAmount,
      paymentCount: error.details.paymentCount
    });
  }
}
```

**Rate Limit (429):**
```typescript
try {
  await createPayment(data);
} catch (error) {
  if (error.statusCode === 429) {
    // Show countdown timer
    showRetryTimer(error.retryAfter); // seconds
    disableSubmitButton(error.retryAfter);
  }
}
```

---

## For Backend Developers

### Using Rate Limiters

```typescript
import { 
  financialMutationLimiter,  // 10 req/min - payments, orders
  strictMutationLimiter,     // 5 req/min - sensitive ops
  readOperationLimiter       // 100 req/min - queries
} from "../middleware/rate-limit";

// Apply to route
router.post("/sensitive-operation",
  financialMutationLimiter,  // Add as first middleware
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => { ... })
);
```

### Stock Validation Pattern

```typescript
// ALWAYS pre-validate stock before updates
const insufficient = [];
for (const item of items) {
  const variant = await tx.productVariant.findUnique({ where: { id } });
  if (variant.stockQuantity < item.quantity) {
    insufficient.push(`${variant.name} (Need: ${item.quantity}, Have: ${variant.stockQuantity})`);
  }
}

if (insufficient.length > 0) {
  throw new ApiError(400, 
    `Insufficient stock:\n${insufficient.join('\n')}`,
    { insufficientItems: insufficient }
  );
}

// Only proceed if validation passed
const updated = await tx.productVariant.update({
  data: { stockQuantity: { decrement } }
});
```

### Paid Order Check Pattern

```typescript
// ALWAYS check for payments before cancellation
const order = await tx.salesOrder.findFirst({
  where: { id },
  include: { payments: true }  // Must include this!
});

if (order.paidAmount > 0 || order.payments.length > 0) {
  throw new ApiError(400,
    `Cannot cancel order with payments. Issue refund first.`,
    { 
      paidAmount: Number(order.paidAmount),
      paymentCount: order.payments.length 
    }
  );
}
```

---

## Testing Scenarios

### Test Stock Validation
```bash
# 1. Order with sufficient stock → Should succeed
POST /api/sales-orders
Body: { items: [{ variantId: "abc", quantity: 5 }] }
Expected: 201 Created

# 2. Confirm order with insufficient stock → Should fail
POST /api/sales-orders/:id/confirm
Expected: 400 with insufficientItems array

# 3. Custom order (no stock tracking) → Should succeed
POST /api/sales-orders
Body: { items: [{ customProductName: "Custom Desk", quantity: 1 }] }
Expected: 201 Created
```

### Test Paid Order Protection
```bash
# 1. Cancel unpaid order → Should succeed
POST /api/sales-orders/:id/cancel
Expected: 200 OK, status: "CANCELLED"

# 2. Cancel order with payments → Should fail
POST /api/sales-orders/:id/cancel
Expected: 400 with paidAmount and paymentCount

# 3. Cancel delivered order → Should fail (existing logic)
POST /api/sales-orders/:id/cancel
Expected: 400 "Cannot cancel order in status DELIVERED"
```

### Test Rate Limiting
```bash
# 1. 10 requests in 1 minute → All succeed
for i in {1..10}; do
  curl -X POST /api/payments -H "Authorization: Bearer $TOKEN"
done
Expected: 10 x 200/201

# 2. 11th request → Rate limited
curl -X POST /api/payments -H "Authorization: Bearer $TOKEN"
Expected: 429 with retryAfter

# 3. Wait 60 seconds, retry → Should succeed
sleep 60
curl -X POST /api/payments -H "Authorization: Bearer $TOKEN"
Expected: 200/201
```

---

## Deployment Commands

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if needed)
npm install

# 3. Build TypeScript
npm run build

# 4. Restart server
pm2 restart erp-server

# 5. Check logs
pm2 logs erp-server --lines 50
```

---

## Monitoring

### Key Metrics to Track

```bash
# Rate limit hits (should be non-zero if working)
grep -c "Rate limit exceeded" /var/log/erp/app.log

# Stock validation blocks (should prevent negative inventory)
grep -c "Insufficient stock" /var/log/erp/app.log

# Paid order cancellation attempts (should be blocked)
grep -c "Cannot cancel order.*payment" /var/log/erp/app.log

# Check for negative inventory (should be ZERO)
psql -d erp_db -c "SELECT COUNT(*) FROM product_variants WHERE stock_quantity < 0;"
```

### Health Check

```bash
# All should return 0
psql -d erp_db -c "
  SELECT COUNT(*) as negative_stock 
  FROM product_variants 
  WHERE stock_quantity < 0;
"

psql -d erp_db -c "
  SELECT COUNT(*) as cancelled_with_payments
  FROM sales_orders 
  WHERE status = 'CANCELLED' AND paid_amount > 0;
"
```

---

## Troubleshooting

### Issue: Rate limit blocking legitimate users

**Symptom:** Users report "Too many requests" during normal usage

**Solution:**
```typescript
// Increase limit in rate-limit.ts
export const financialMutationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,  // Increased from 10
  // ...
});
```

### Issue: Stock validation rejecting valid orders

**Symptom:** "Insufficient stock" error but inventory shows available

**Check:**
```sql
-- Verify actual stock quantity
SELECT pv.sku_variant, pv.stock_quantity, p.name
FROM product_variants pv
JOIN products p ON pv.product_id = p.id
WHERE pv.id = '<variant-id>';

-- Check pending reservations
SELECT COUNT(*), SUM(quantity)
FROM stock_movements
WHERE product_variant_id = '<variant-id>' 
  AND type = 'RESERVATION'
  AND occurred_at > NOW() - INTERVAL '1 hour';
```

### Issue: Cannot cancel any orders

**Symptom:** All cancellations fail with payment error

**Check:**
```sql
-- Verify order payment status
SELECT so.id, so.status, so.paid_amount, COUNT(p.id) as payment_count
FROM sales_orders so
LEFT JOIN payments p ON p.sales_order_id = so.id
WHERE so.id = '<order-id>'
GROUP BY so.id;
```

---

## Rollback (Emergency Only)

```bash
# 1. Revert code
git revert HEAD~3  # Reverts last 3 commits (the fixes)
npm run build
pm2 restart erp-server

# 2. Verify rollback
curl http://localhost:4000/health
pm2 logs erp-server --lines 20

# 3. Notify team
echo "Rolled back fixes at $(date)" | mail -s "ERP Rollback" team@company.com
```

---

## Additional Resources

- **Full Documentation:** `/CRITICAL_FIXES_CHANGELOG.md`
- **Audit Report:** `/QUALITY_AUDIT_REPORT.md`
- **PRD:** `/detailed.prd`
- **API Docs:** `/server/src/routes/*.routes.ts`

---

**Last Updated:** August 13, 2026  
**Version:** 1.0  
**Contact:** Development Team
