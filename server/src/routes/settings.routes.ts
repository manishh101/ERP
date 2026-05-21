import bcrypt from "bcryptjs";
import { Router } from "express";
import { basePrisma, prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { ApiError } from "../utils/api-error";
import { normalizeEmail, normalizeName } from "../utils/identity";
import {
  companyProfileSchema,
  currencySettingSchema,
  idParamSchema,
  invoiceTemplateSchema,
  notificationSettingSchema,
  taxRateSchema,
  userSchema,
  warehouseSchema,
} from "../schemas/domain";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);
settingsRouter.use(requireRole(["ADMIN"]));

settingsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const [companyProfile, taxRates, currencySetting, invoiceTemplate, notificationSetting, warehouses] =
      await Promise.all([
        prisma.companyProfile.findFirst({ where: { tenantId: _request.user!.tenantId } }),
        prisma.taxRate.findMany({ where: { tenantId: _request.user!.tenantId }, orderBy: { category: "asc" } }),
        prisma.currencySetting.findFirst({ where: { tenantId: _request.user!.tenantId } }),
        prisma.invoiceTemplate.findFirst({ where: { tenantId: _request.user!.tenantId } }),
        prisma.notificationSetting.findFirst({ where: { tenantId: _request.user!.tenantId } }),
        prisma.warehouse.findMany({ where: { tenantId: _request.user!.tenantId }, orderBy: { name: "asc" } }),
      ]);

    response.json({
      companyProfile,
      taxRates,
      currencySetting,
      invoiceTemplate,
      notificationSetting,
      warehouses,
    });
  }),
);

settingsRouter.patch(
  "/company-profile",
  validate(companyProfileSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof companyProfileSchema.parse>;
    const existing = await prisma.companyProfile.findFirst({ where: { tenantId: request.user!.tenantId } });

    const companyProfile = existing
      ? await prisma.companyProfile.update({
          where: { id: existing.id },
          data: body,
        })
      : await prisma.companyProfile.create({
          data: {
            ...body,
            tenantId: request.user!.tenantId,
          },
        });

    response.json(companyProfile);
  }),
);

settingsRouter.post(
  "/tax-rates",
  validate(taxRateSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof taxRateSchema.parse>;
    const taxRate = await prisma.taxRate.create({
      data: {
        ...body,
        tenantId: request.user!.tenantId,
      },
    });
    response.status(201).json(taxRate);
  }),
);

settingsRouter.patch(
  "/tax-rates/:id",
  validate(idParamSchema, "params"),
  validate(taxRateSchema.partial()),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as Partial<ReturnType<typeof taxRateSchema.parse>>;
    
    const existing = await prisma.taxRate.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existing) throw new ApiError(404, "Tax rate not found");

    const taxRate = await prisma.taxRate.update({
      where: { id: params.id },
      data: body,
    });

    response.json(taxRate);
  }),
);

settingsRouter.patch(
  "/currency",
  validate(currencySettingSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof currencySettingSchema.parse>;
    const existing = await prisma.currencySetting.findFirst({ where: { tenantId: request.user!.tenantId } });

    const currencySetting = existing
      ? await prisma.currencySetting.update({
          where: { id: existing.id },
          data: {
            ...body,
            supportedCurrencies: body.supportedCurrencies,
          },
        })
      : await prisma.currencySetting.create({
          data: {
            ...body,
            supportedCurrencies: body.supportedCurrencies,
            tenantId: request.user!.tenantId,
          },
        });

    response.json(currencySetting);
  }),
);

settingsRouter.patch(
  "/invoice-template",
  validate(invoiceTemplateSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof invoiceTemplateSchema.parse>;
    const existing = await prisma.invoiceTemplate.findFirst({ where: { tenantId: request.user!.tenantId } });

    const invoiceTemplate = existing
      ? await prisma.invoiceTemplate.update({
          where: { id: existing.id },
          data: body,
        })
      : await prisma.invoiceTemplate.create({
          data: {
            ...body,
            tenantId: request.user!.tenantId,
          },
        });

    response.json(invoiceTemplate);
  }),
);

settingsRouter.patch(
  "/notifications",
  validate(notificationSettingSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof notificationSettingSchema.parse>;
    const existing = await prisma.notificationSetting.findFirst({ where: { tenantId: request.user!.tenantId } });

    const notificationSetting = existing
      ? await prisma.notificationSetting.update({
          where: { id: existing.id },
          data: {
            ...body,
            overdueInvoiceDays: body.overdueInvoiceDays,
          },
        })
      : await prisma.notificationSetting.create({
          data: {
            ...body,
            overdueInvoiceDays: body.overdueInvoiceDays,
            tenantId: request.user!.tenantId,
          },
        });

    response.json(notificationSetting);
  }),
);

settingsRouter.post(
  "/warehouses",
  validate(warehouseSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof warehouseSchema.parse>;
    const warehouse = await prisma.warehouse.create({
      data: {
        ...body,
        tenantId: request.user!.tenantId,
      },
    });
    response.status(201).json(warehouse);
  }),
);

settingsRouter.patch(
  "/warehouses/:id",
  validate(idParamSchema, "params"),
  validate(warehouseSchema.partial()),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const body = request.validated?.body as Partial<ReturnType<typeof warehouseSchema.parse>>;
    
    const existing = await prisma.warehouse.findFirst({
      where: { id: params.id, tenantId: request.user!.tenantId },
    });
    if (!existing) throw new ApiError(404, "Warehouse not found");

    const warehouse = await prisma.warehouse.update({
      where: { id: params.id },
      data: body,
    });

    response.json(warehouse);
  }),
);

settingsRouter.post(
  "/users/invite",
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

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: normalizeName(body.name),
        email,
        passwordHash,
        role: body.role,
        isActive: body.isActive,
        tenantId: request.user!.tenantId,
      },
    });

    response.status(201).json(user);
  }),
);
