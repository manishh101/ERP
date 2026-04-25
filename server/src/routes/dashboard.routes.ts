import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import {
  getDashboardSummary,
  getFinancialSummary,
  getArAgingBuckets,
  getTopEntities,
  getShowroomAnalytics,
} from "../services/dashboard.service";
import { ApiError } from "../utils/api-error";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// Legacy endpoint — kept for backward compatibility with existing frontend
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/summary",
  asyncHandler(async (_request, response) => {
    response.json(await getDashboardSummary());
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
    response.json(await getFinancialSummary(period));
  })
);

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/ar-aging
// Outstanding debt bucketed: 0-30, 31-60, 61-90, 90+ days
// Redis cached, 15-min TTL
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/ar-aging",
  asyncHandler(async (_request, response) => {
    response.json(await getArAgingBuckets());
  })
);

// ---------------------------------------------------------------------------
// §8 — GET /dashboard/top-entities
// Top showrooms by revenue + top products by quantity dispatched
// Redis cached, 15-min TTL
// ---------------------------------------------------------------------------
dashboardRouter.get(
  "/top-entities",
  asyncHandler(async (_request, response) => {
    response.json(await getTopEntities());
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
      response.json(await getShowroomAnalytics(customerId));
    } catch (err: any) {
      if (err.message?.includes("not found")) {
        throw new ApiError(404, err.message);
      }
      throw err;
    }
  })
);
