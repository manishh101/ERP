import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/api-error";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: "Validation failed",
      issues: error.flatten(),
    });
  }

  if (error instanceof ApiError) {
    return response.status(error.statusCode).json({
      message: error.message,
      details: error.details,
    });
  }

  // Log full error details for server-side debugging
  console.error("[ErrorHandler]", {
    message: (error as Error)?.message,
    name: (error as Error)?.name,
    stack: (error as Error)?.stack,
  });

  // Detect Prisma connection / query errors or network-related database issues to give a clearer signal
  const errName = (error as Error)?.name ?? "";
  const errMsg = (error as Error)?.message ?? "";
  if (
    errName.includes("Prisma") ||
    errName.includes("PrismaClient") ||
    errMsg.includes("Prisma") ||
    errMsg.includes("database") ||
    errMsg.includes("connection") ||
    errMsg.includes("ECONNREFUSED") ||
    errMsg.includes("ETIMEDOUT")
  ) {
    return response.status(503).json({
      message: "Database connection error — please check DATABASE_URL and network connectivity",
    });
  }

  return response.status(500).json({
    message: "Internal server error",
  });
}

