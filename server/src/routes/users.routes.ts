import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { idParamSchema, listQuerySchema, userSchema, userUpdateSchema } from "../schemas/domain";
import { getPagination } from "../utils/pagination";

export const usersRouter = Router();

usersRouter.use(requireAuth);
usersRouter.use(requireRole(["ADMIN"]));

usersRouter.get(
  "/",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { page: number; pageSize: number; search?: string };
    const where: any = {
      OR: query.search
        ? [
            {
              name: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: query.search,
                mode: "insensitive" as const,
              },
            },
          ]
        : undefined,
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.user.count({ where }),
    ]);

    response.json({ items, total });
  }),
);

usersRouter.post(
  "/invite",
  validate(userSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof userSchema.parse>;
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash: await bcrypt.hash(body.password, 10),
        role: body.role,
        isActive: body.isActive,
      },
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    response.status(201).json(userWithoutPassword);
  }),
);

usersRouter.patch(
  "/:id",
  validate(idParamSchema, "params"),
  validate(userUpdateSchema),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as ReturnType<typeof userUpdateSchema.parse>;
    const user = await prisma.user.update({
      where: { id: params.id },
      data: body,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    response.json(userWithoutPassword);
  }),
);

usersRouter.post(
  "/clear-database",
  asyncHandler(async (request, response) => {
    // Fetch all tables in the public schema except 'users' and migrations
    const tables: { table_name: string }[] = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name != 'users' 
        AND table_name != '_prisma_migrations';
    `;

    const tableNames = tables.map((t) => `"${t.table_name}"`).join(", ");

    if (tableNames.length > 0) {
      // Truncate all tables using RESTART IDENTITY and CASCADE
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`);
    }

    response.json({
      status: "success",
      message: "Database cleared successfully, preserving only users.",
    });
  }),
);
