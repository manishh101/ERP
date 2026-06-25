import cors from "cors";
import compression from "compression";
import express, { type Express } from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env";
import { basePrisma } from "./config/prisma";
import { errorHandler } from "./middleware/error-handler";
import { registerRoutes } from "./routes";

async function checkDatabase() {
  await Promise.race([
    basePrisma.$queryRawUnsafe("SELECT 1"),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Database health check timed out")), 2_500);
    }),
  ]);
}

export function createApp(): Express {
  const app = express();
  const isVercel = Boolean(process.env.VERCEL);

  if (isVercel || env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

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

  // Support comma-separated CORS origins for production and preview deployments.
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

  app.use(
    cors({
      origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (isVercel) {
    app.get(["/uploads/*", "/api/uploads/*"], (_request, response) => {
      response.status(410).json({
        message: "Local uploaded files are not available on Vercel. Configure persistent object storage for product images.",
      });
    });
  } else {
    app.use("/uploads", express.static("uploads"));
  }

  app.get("/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "furniture-erp-api",
    });
  });

  app.get("/api/health", async (_request, response) => {
    try {
      await checkDatabase();
      response.json({
        status: "ok",
        service: "furniture-erp-api",
        database: "ok",
      });
    } catch (error) {
      console.error("[HealthCheck] Database unavailable", {
        message: (error as Error)?.message,
        name: (error as Error)?.name,
      });

      response.status(503).json({
        status: "error",
        service: "furniture-erp-api",
        database: "unavailable",
      });
    }
  });

  registerRoutes(app);
  app.use(errorHandler);

  return app;
}
