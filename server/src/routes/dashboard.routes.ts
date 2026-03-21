import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { getDashboardSummary } from "../services/dashboard.service";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (_request, response) => {
    response.json(await getDashboardSummary());
  }),
);

