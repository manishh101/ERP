import type { Request, Response, NextFunction, RequestHandler } from "express";

export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  async (request: Request, response: Response, next: NextFunction) => {
    try {
      await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };

