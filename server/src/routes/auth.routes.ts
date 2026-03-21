import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { loginSchema } from "../schemas/domain";
import { ApiError } from "../utils/api-error";
import { signToken } from "../utils/jwt";

export const authRouter = Router();

authRouter.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as { email: string; password: string };

    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid credentials");
    }

    const passwordMatches = await bcrypt.compare(body.password, user.passwordHash);

    if (!passwordMatches) {
      throw new ApiError(401, "Invalid credentials");
    }

    const token = signToken({
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    });

    response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: {
        id: request.user!.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    response.json(user);
  }),
);

