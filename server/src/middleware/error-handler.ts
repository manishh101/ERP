import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
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

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (["P1001", "P1002", "P1017", "P2024"].includes(error.code)) {
      return response.status(503).json({
        message: "Database connection error. Check DATABASE_URL, pooling, and database availability.",
        code: error.code,
      });
    }

    if (["P2021", "P2022"].includes(error.code)) {
      return response.status(500).json({
        message: "Database schema error. Run Prisma migrations against the production database.",
        code: error.code,
      });
    }

    if (error.code === "P2002") {
      const targetStr = Array.isArray(error.meta?.target) ? error.meta?.target.join(", ") : String(error.meta?.target || "");
      if (targetStr.includes("invoice_number") || targetStr.includes("invoiceNumber")) {
        return response.status(409).json({
          message: "This invoice number already exists. Please use a different invoice number.",
          code: error.code,
        });
      }
      return response.status(409).json({
        message: "A record with this unique value already exists. Please check your inputs.",
        code: error.code,
      });
    }

    if (error.code === "P2025") {
      return response.status(404).json({
        message: "The requested record was not found.",
        code: error.code,
      });
    }

    if (error.code === "P2003") {
      return response.status(400).json({
        message: "Cannot proceed because referenced records exist or are missing.",
        code: error.code,
      });
    }

    return response.status(500).json({
      message: "Database query failed. Check server logs for details.",
      code: error.code,
    });
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    return response.status(503).json({
      message: "Database connection error. Check DATABASE_URL, pooling, and network connectivity.",
    });
  }

  // Detect network-related database issues that may not be wrapped by Prisma.
  const errMsg = (error as Error)?.message ?? "";
  if (
    errMsg.includes("ECONNREFUSED") ||
    errMsg.includes("ETIMEDOUT") ||
    errMsg.includes("ENOTFOUND") ||
    errMsg.includes("Connection terminated")
  ) {
    return response.status(503).json({
      message: "Database connection error. Check DATABASE_URL and network connectivity.",
    });
  }

  return response.status(500).json({
    message: "Internal server error",
  });
}

