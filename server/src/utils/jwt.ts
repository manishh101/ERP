import jwt from "jsonwebtoken";
import { env } from "../config/env";

type UserRole = "ADMIN" | "ACCOUNTANT" | "SALES" | "WAREHOUSE" | "DRIVER";

export type JwtPayload = {
  sub: string;
  tenantId: string;
  role?: UserRole;
  email?: string;
  name?: string;
  purpose?: string;
};

export function signToken(payload: JwtPayload, expiresIn?: string | number) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: (expiresIn || env.JWT_EXPIRES_IN) as any,
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
