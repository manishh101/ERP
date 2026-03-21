import jwt from "jsonwebtoken";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env";

export type JwtPayload = {
  sub: string;
  role: UserRole;
  email: string;
  name: string;
};

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

