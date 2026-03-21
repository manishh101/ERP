import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { registerRoutes } from "./routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

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

