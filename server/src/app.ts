import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { registerRoutes } from "./routes";

export function createApp() {
  const app = express();

  // Security & Logging
  app.use(helmet());
  app.use(morgan("dev"));
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter as any);

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
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

