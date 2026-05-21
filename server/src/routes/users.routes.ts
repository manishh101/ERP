import bcrypt from "bcryptjs";
import { Router } from "express";
import { basePrisma, prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { idParamSchema, listQuerySchema, userSchema, userUpdateSchema } from "../schemas/domain";
import { ApiError } from "../utils/api-error";
import { normalizeEmail, normalizeName } from "../utils/identity";
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
    const email = normalizeEmail(body.email);
    const existingUser = await basePrisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new ApiError(400, "Email address is already registered.");
    }

    const user = await prisma.user.create({
      data: {
        tenantId: request.user!.tenantId,
        name: normalizeName(body.name),
        email,
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
    const normalizedBody = {
      ...body,
      ...(body.name ? { name: normalizeName(body.name) } : {}),
      ...(body.email ? { email: normalizeEmail(body.email) } : {}),
    };

    if (normalizedBody.email) {
      const existingUser = await basePrisma.user.findUnique({
        where: { email: normalizedBody.email },
        select: { id: true },
      });

      if (existingUser && existingUser.id !== params.id) {
        throw new ApiError(400, "Email address is already registered.");
      }
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: normalizedBody,
    });

    const { passwordHash: _, ...userWithoutPassword } = user;
    response.json(userWithoutPassword);
  }),
);

usersRouter.post(
  "/clear-database",
  asyncHandler(async (request, response) => {
    // Delete only active tenant's records using model deleteMany (which is auto-filtered by Prisma Client Extension)
    // We execute them in order of dependency to avoid foreign key violations
    await prisma.auditLog.deleteMany();
    await prisma.stockMovement.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.vatRegister.deleteMany();
    await prisma.arLedger.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.taxInvoiceLineItem.deleteMany();
    await prisma.taxInvoice.deleteMany();
    await prisma.salesOrderLineItem.deleteMany();
    await prisma.salesOrder.deleteMany();
    await prisma.goodsReceiptLine.deleteMany();
    await prisma.goodsReceipt.deleteMany();
    await prisma.supplierInvoice.deleteMany();
    await prisma.purchaseOrderLineItem.deleteMany();
    await prisma.purchaseOrder.deleteMany();
    await prisma.inventory.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.product.deleteMany();
    await prisma.bankStatementLine.deleteMany();
    await prisma.bankStatementImport.deleteMany();
    await prisma.journalEntryLine.deleteMany();
    await prisma.journalEntry.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.account.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.supplier.deleteMany();
    await prisma.warehouse.deleteMany();
    await prisma.taxRate.deleteMany();

    // Preserve the active user, delete all other users for this tenant
    await prisma.user.deleteMany({
      where: {
        id: { not: request.user!.id }
      }
    });

    response.json({
      status: "success",
      message: "Your workspace has been cleared successfully, preserving only your user profile.",
    });
  }),
);
