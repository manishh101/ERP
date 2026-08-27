import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import {
  getDashboardOverview,
  getFinancialSummary,
  getArAgingBuckets,
  getTopEntities,
  getShowroomAnalytics,
} from "../services/dashboard.service";
import { ApiError } from "../utils/api-error";
import { withCache, CACHE_KEYS } from "../config/redis";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// GET /dashboard/overview — role-aware command center (single request per load)
// Role is taken from the verified JWT; the service shapes/scopes data by role.
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/overview",
  asyncHandler(async (request, response) => {
    const data = await getDashboardOverview(
      request.user!.tenantId,
      request.user!.role,
      request.user!.id,
    );
    response.json(data);
  })
);

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/financial-summary?period=today|month|year
// Amount Received vs Amount Pending (AR), filterable by period
// Redis cached, 15-min TTL
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/financial-summary",
  asyncHandler(async (request, response) => {
    const period = (request.query.period as "today" | "month" | "year") || "month";
    if (!["today", "month", "year"].includes(period)) {
      throw new ApiError(400, "period must be one of: today, month, year");
    }
    const cacheKey = 
      period === "today" ? CACHE_KEYS.FINANCIAL_SUMMARY_TODAY(request.user!.tenantId) :
      period === "month" ? CACHE_KEYS.FINANCIAL_SUMMARY_MONTH(request.user!.tenantId) : 
      CACHE_KEYS.FINANCIAL_SUMMARY_YEAR(request.user!.tenantId);
    
    const data = await withCache(cacheKey, 900, () => getFinancialSummary(request.user!.tenantId, period));
    response.json(data);
  })
);

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/ar-aging
// Outstanding debt bucketed: 0-30, 31-60, 61-90, 90+ days
// Redis cached, 15-min TTL
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/ar-aging",
  asyncHandler(async (request, response) => {
    const data = await withCache(CACHE_KEYS.AR_AGING(request.user!.tenantId), 900, () => getArAgingBuckets(request.user!.tenantId));
    response.json(data);
  })
);

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/top-entities
// Top showrooms by revenue + top products by quantity dispatched
// Redis cached, 15-min TTL
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/top-entities",
  asyncHandler(async (request, response) => {
    const data = await withCache(CACHE_KEYS.TOP_ENTITIES(request.user!.tenantId), 900, () => getTopEntities(request.user!.tenantId));
    response.json(data);
  })
);

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/showroom-analytics/:customerId
// Volume + value for Current Month, Previous Month, and YTD per showroom
// Redis cached, 15-min TTL
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/showroom-analytics/:customerId",
  requireRole(["ADMIN", "ACCOUNTANT", "SALES"]),
  asyncHandler(async (request, response) => {
    const { customerId } = request.params;
    if (!customerId) throw new ApiError(400, "customerId is required");
    try {
      const data = await withCache(CACHE_KEYS.SHOWROOM_ANALYTICS(request.user!.tenantId, customerId), 900, () => getShowroomAnalytics(request.user!.tenantId, customerId));
      response.json(data);
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        throw new ApiError(404, err.message);
      }
      throw err;
    }
  })
);
