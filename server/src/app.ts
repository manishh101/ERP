import cors from "cors";
import compression from "compression";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { registerRoutes } from "./routes";

export function createApp(): Express {
  const app = express();

  // Security & Logging
  app.use(helmet());
  app.use(compression() as any);
  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter as any);

  // Support comma-separated CORS origins for split deployments (e.g. Vercel + Render)
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use("/uploads", express.static("uploads"));

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "furniture-erp-api",
    });
  });

  registerRoutes(app);
  app.use(errorHandler);

  return app;
}

