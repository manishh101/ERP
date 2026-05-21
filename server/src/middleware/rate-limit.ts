import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/api-error";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
};

type RateLimitState = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitState>();

function getClientKey(request: Request, keyPrefix: string) {
  const forwarded = request.headers["x-forwarded-for"];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim()
      : request.ip;

  return `${keyPrefix}:${ip || "unknown"}`;
}

export function rateLimit(options: RateLimitOptions) {
  return (request: Request, _response: Response, next: NextFunction) => {
    const key = getClientKey(request, options.keyPrefix);
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || entry.resetAt <= now) {
      store.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    entry.count += 1;
    store.set(key, entry);

    if (entry.count > options.max) {
      return next(
        new ApiError(429, "Too many requests. Please wait before trying again."),
      );
    }

    return next();
  };
}
