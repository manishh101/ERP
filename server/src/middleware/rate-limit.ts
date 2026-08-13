import rateLimit from "express-rate-limit";

/**
 * Rate Limiting Middleware
 * 
 * Protects critical financial endpoints from:
 * 1. Accidental double-submissions (user clicking submit multiple times)
 * 2. Denial-of-service attacks
 * 3. Brute-force attempts
 * 
 * Strategy: Conservative limits for write operations, generous for read operations
 */

/**
 * Standard rate limiter for financial mutation endpoints
 * - 10 requests per minute per user
 * - Suitable for: payments, orders, invoices
 */
export const financialMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per window per IP
  message: {
    error: "Too many requests. Please wait a moment before trying again.",
    retryAfter: "60 seconds"
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  // Use user ID + IP for better accuracy (prevents one user affecting another)
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || "anonymous";
    const ip = req.ip || "unknown";
    return `${userId}-${ip}`;
  },
  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60000;
    const retryAfter = Math.ceil(resetTime / 1000 - Date.now() / 1000);
    const limit = (req as any).rateLimit?.limit || 10;
    const remaining = (req as any).rateLimit?.remaining || 0;
    
    res.status(429).json({
      error: "Rate limit exceeded",
      message: "Too many requests to this endpoint. Please wait before trying again.",
      retryAfter: Math.max(retryAfter, 0),
      limit: limit,
      remaining: remaining
    });
  }
});

/**
 * Strict rate limiter for highly sensitive operations
 * - 5 requests per minute per user
 * - Suitable for: user registration, password reset, bulk operations
 */
export const strictMutationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: {
    error: "Too many requests to sensitive endpoint. Please wait before trying again.",
    retryAfter: "60 seconds"
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || "anonymous";
    const ip = req.ip || "unknown";
    return `${userId}-${ip}`;
  },
  handler: (req, res) => {
    const resetTime = (req as any).rateLimit?.resetTime || Date.now() + 60000;
    const retryAfter = Math.ceil(resetTime / 1000 - Date.now() / 1000);
    const limit = (req as any).rateLimit?.limit || 5;
    
    res.status(429).json({
      error: "Rate limit exceeded",
      message: "This operation is rate-limited for security. Please wait before retrying.",
      retryAfter: Math.max(retryAfter, 0),
      limit: limit
    });
  }
});

/**
 * Generous rate limiter for read operations
 * - 100 requests per minute per user
 * - Suitable for: list queries, dashboard, reports
 */
export const readOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as any).user?.id || "anonymous";
    const ip = req.ip || "unknown";
    return `${userId}-${ip}`;
  },
  // Skip error handler to use default for read operations
});
