import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { ApiError } from "../utils/api-error";
import { verifyToken } from "../utils/jwt";
import { tenantStorage, basePrisma } from "../config/prisma";

/**
 * Authentication middleware.
 *
 * Verifies the JWT, checks the user is still active in the database,
 * and runs downstream handlers inside the tenant's AsyncLocalStorage context.
 */
export function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  let token = "";

  if (header?.startsWith("Bearer ")) {
    token = header.slice("Bearer ".length);
  } else if (request.query.token && typeof request.query.token === "string") {
    token = request.query.token;
  }

  if (!token) {
    return next(new ApiError(401, "Missing or invalid authorization token"));
  }

  try {
    const payload = verifyToken(token);
    
    if (!payload.sub || !payload.tenantId || !payload.role || !payload.email || !payload.name) {
      return next(new ApiError(401, "Invalid token payload: missing required fields"));
    }

    // #5 Fix: Verify user is still active (prevents deactivated users from
    // continuing to use previously-issued JWTs until expiry)
    basePrisma.user
      .findUnique({ where: { id: payload.sub }, select: { isActive: true } })
      .then((user) => {
        if (!user || !user.isActive) {
          return next(new ApiError(401, "Account has been deactivated"));
        }

        request.user = {
          id: payload.sub,
          tenantId: payload.tenantId,
          role: payload.role as UserRole,
          email: payload.email as string,
          name: payload.name as string,
        };

        // Run the remaining middlewares/route-handlers in the context of the active tenantId
        return tenantStorage.run({ tenantId: payload.tenantId }, () => {
          next();
        });
      })
      .catch(() => {
        return next(new ApiError(500, "Failed to verify user status"));
      });
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireRole(roles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      return next(new ApiError(401, "Authentication required"));
    }

    if (!roles.includes(request.user.role)) {
      return next(new ApiError(403, "You do not have access to this resource"));
    }

    // Ensure we maintain the tenantStorage context inside requireRole as well (in case Express triggers it in a separate frame)
    const tenantId = request.user.tenantId;
    if (tenantId) {
      return tenantStorage.run({ tenantId }, () => {
        next();
      });
    }

    return next();
  };
}
