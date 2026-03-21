import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";

type Target = "body" | "query" | "params";

export function validate(schema: ZodTypeAny, target: Target = "body") {
  return (request: Request, _response: Response, next: NextFunction) => {
    const parsed = schema.parse(request[target]);

    request.validated = {
      ...request.validated,
      [target]: parsed,
    };

    next();
  };
}

