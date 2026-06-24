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

/**
 * Periodic cleanup sweep — removes expired entries to prevent memory leak.
 * Runs every 60 seconds.
 */
const CLEANUP_INTERVAL_MS = 60_000;

let cleanupTimerStarted = false;

function startCleanupTimer() {
  if (cleanupTimerStarted) return;
  cleanupTimerStarted = true;

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Don't prevent Node from shutting down
  timer.unref();
}

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
  // Start cleanup timer on first use
  startCleanupTimer();

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
