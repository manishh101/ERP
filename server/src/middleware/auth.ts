import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { ApiError } from "../utils/api-error";
import { verifyToken } from "../utils/jwt";

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
    
    if (!payload.sub || !payload.role || !payload.email || !payload.name) {
      return next(new ApiError(401, "Invalid token payload: missing required fields"));
    }

    request.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      name: payload.name,
    };

    return next();
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

    return next();
  };
}

