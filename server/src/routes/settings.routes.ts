import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
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
        prisma.companyProfile.findFirst(),
        prisma.taxRate.findMany({ orderBy: { category: "asc" } }),
        prisma.currencySetting.findFirst(),
        prisma.invoiceTemplate.findFirst(),
        prisma.notificationSetting.findFirst(),
        prisma.warehouse.findMany({ orderBy: { name: "asc" } }),
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
    const existing = await prisma.companyProfile.findFirst();

    const companyProfile = existing
      ? await prisma.companyProfile.update({
          where: { id: existing.id },
          data: body,
        })
      : await prisma.companyProfile.create({ data: body });

    response.json(companyProfile);
  }),
);

settingsRouter.post(
  "/tax-rates",
  validate(taxRateSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof taxRateSchema.parse>;
    const taxRate = await prisma.taxRate.create({ data: body });
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
    const existing = await prisma.currencySetting.findFirst();

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
    const existing = await prisma.invoiceTemplate.findFirst();

    const invoiceTemplate = existing
      ? await prisma.invoiceTemplate.update({
          where: { id: existing.id },
          data: body,
        })
      : await prisma.invoiceTemplate.create({ data: body });

    response.json(invoiceTemplate);
  }),
);

settingsRouter.patch(
  "/notifications",
  validate(notificationSettingSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof notificationSettingSchema.parse>;
    const existing = await prisma.notificationSetting.findFirst();

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
    const warehouse = await prisma.warehouse.create({ data: body });
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
    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role,
        isActive: body.isActive,
      },
    });

    response.status(201).json(user);
  }),
);

