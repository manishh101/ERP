import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { OAuth2Client } from "google-auth-library";
import { prisma, basePrisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { rateLimit } from "../middleware/rate-limit";
import { changePasswordSchema, loginSchema, registerSchema } from "../schemas/domain";
import { ApiError } from "../utils/api-error";
import { normalizeCurrencyCode } from "../utils/currency";
import { normalizeEmail, normalizeName } from "../utils/identity";
import { signToken } from "../utils/jwt";

export const authRouter = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "auth:login" });
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, keyPrefix: "auth:register" });
const googleLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "auth:google" });
const changePasswordLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyPrefix: "auth:change-password" });

// ---------------------------------------------------------------------------
// Google ID‑Token verification (industry‑standard)
// ---------------------------------------------------------------------------

const googleClient = new OAuth2Client();

/**
 * Verifies a Google ID token using the official google-auth-library.
 *
 * - In production: Cryptographically verifies the JWT signature against
 *   Google's public keys and validates the audience claim.
 * - In development: Accepts mock tokens prefixed with "mock-google-token:"
 *   so the full flow can be tested without a Google Cloud project.
 */
async function verifyGoogleToken(
  idToken: string,
): Promise<{ email: string; name: string; sub: string }> {
  // Development mock bypass
  if (
    process.env.NODE_ENV === "development" &&
    idToken.startsWith("mock-google-token:")
  ) {
    const parts = idToken.split(":");
    const email = normalizeEmail(parts[1] || "mock-user@example.com");
    const name = normalizeName(parts[2] || "Mock User");
    const sub = `google-mock-${email}`;
    return { email, name, sub };
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new ApiError(
      500,
      "Google Sign-In is not configured (GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID missing).",
    );
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new Error("Invalid Google token payload.");
    }

    if (!payload.email_verified) {
      throw new Error("Google email address is not verified.");
    }

    return {
      email: normalizeEmail(payload.email),
      name: normalizeName(payload.name || payload.email.split("@")[0]),
      sub: payload.sub,
    };
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(401, `Google authentication failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Tenant seed helper (DRY — shared by /register and /google)
// ---------------------------------------------------------------------------

/**
 * Seeds a brand‑new tenant with the standard ERP baseline configuration:
 * company profile, currency, notification & invoice settings, default
 * tax rates, a warehouse, and the chart of accounts.
 *
 * Must be called inside a Prisma interactive transaction (`tx`).
 */
async function seedTenantDefaults(
  tx: Parameters<Parameters<typeof basePrisma.$transaction>[0]>[0],
  tenantId: string,
  companyName: string,
  adminEmail: string,
) {
  await tx.companyProfile.create({
    data: {
      tenantId,
      name: companyName,
      address: "Your Company Address",
      bankDetails: "Default Bank Details",
      email: adminEmail,
      phone: "Add Phone Number",
    },
  });

  await tx.currencySetting.create({
    data: {
      tenantId,
      baseCurrency: "NPR",
      supportedCurrencies: ["NPR"],
      multiCurrencyEnabled: false,
    },
  });

  await tx.notificationSetting.create({
    data: {
      tenantId,
      overdueInvoiceDays: [7, 14, 30],
      lowStockEnabled: true,
      deliveryUpdatesEnabled: true,
      emailEnabled: true,
    },
  });

  await tx.invoiceTemplate.create({
    data: {
      tenantId,
      primaryColor: "#7c5c45",
      footerText: "Thank you for your business.",
      paymentTerms:
        "50% deposit on confirmation, balance due before delivery.",
    },
  });

  await tx.taxRate.createMany({
    data: [
      {
        tenantId,
        name: "Standard VAT",
        category: "General",
        rate: 13,
        isDefault: true,
      },
      {
        tenantId,
        name: "Outdoor VAT",
        category: "Outdoor",
        rate: 10,
        productCategory: "Outdoor",
        isDefault: false,
      },
    ],
  });

  await tx.warehouse.create({
    data: {
      tenantId,
      name: "Default Storage Depot",
      location: "Main Facility",
      type: "STORAGE",
      isActive: true,
    },
  });

  const accountDefinitions = [
    { code: "1000", name: "Cash at Bank", type: "ASSET" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET" },
    { code: "1200", name: "Inventory", type: "ASSET" },
    { code: "1300", name: "Input Tax Recoverable", type: "ASSET" },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY" },
    { code: "2100", name: "Output Tax Payable", type: "LIABILITY" },
    { code: "3000", name: "Owner's Equity", type: "EQUITY" },
    { code: "4000", name: "Sales Revenue", type: "INCOME" },
    { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE" },
    { code: "6100", name: "Operating Expense", type: "EXPENSE" },
    { code: "6200", name: "Delivery Expense", type: "EXPENSE" },
  ] as const;

  await tx.account.createMany({
    data: accountDefinitions.map((def) => ({
      tenantId,
      code: def.code,
      name: def.name,
      type: def.type,
      balance: 0,
    })),
  });
}

// ---------------------------------------------------------------------------
// Helper: build the standard JWT + response payload
// ---------------------------------------------------------------------------

async function buildAuthResponse(user: {
  id: string;
  tenantId: string;
  role: string;
  email: string;
  name: string;
  tenant?: { name: string } | null;
}) {
  const token = signToken({
    sub: user.id,
    tenantId: user.tenantId,
    role: user.role as any,
    email: user.email,
    name: user.name,
  });

  const currencySetting = await prisma.currencySetting.findFirst({
    where: { tenantId: user.tenantId },
    select: { baseCurrency: true },
  });

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      workspaceName: user.tenant?.name,
      currency: normalizeCurrencyCode(currencySetting?.baseCurrency),
    },
  };
}

async function createWorkspaceWithAdmin(input: {
  companyName: string;
  adminName: string;
  adminEmail: string;
  passwordHash?: string;
  googleId?: string;
}) {
  const companyName = normalizeName(input.companyName);
  const adminName = normalizeName(input.adminName);
  const adminEmail = normalizeEmail(input.adminEmail);

  return basePrisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: companyName },
    });

    const user = await tx.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        passwordHash: input.passwordHash,
        googleId: input.googleId,
        role: "ADMIN",
        isActive: true,
        tenantId: tenant.id,
      },
      include: { tenant: true },
    });

    await seedTenantDefaults(tx, tenant.id, companyName, adminEmail);

    return user;
  });
}

async function findAuthUserByEmail(email: string) {
  return basePrisma.user.findUnique({
    where: { email: normalizeEmail(email) },
    include: { tenant: true },
  });
}

async function findAuthUserByGoogleId(googleId: string) {
  return basePrisma.user.findUnique({
    where: { googleId },
    include: { tenant: true },
  });
}

// ---------------------------------------------------------------------------
// POST /register — email + password workspace registration
// ---------------------------------------------------------------------------

authRouter.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<
      typeof registerSchema.parse
    >;

    const email = normalizeEmail(body.email);
    const name = normalizeName(body.name);
    const companyName = normalizeName(body.companyName);

    const existingUser = await findAuthUserByEmail(email);

    if (existingUser) {
      throw new ApiError(400, "Email address is already registered.");
    }

    const user = await createWorkspaceWithAdmin({
      companyName,
      adminName: name,
      adminEmail: email,
      passwordHash: await bcrypt.hash(body.password, 10),
    });

    const authResponse = await buildAuthResponse(user);
    response.status(201).json(authResponse);
  }),
);

// ---------------------------------------------------------------------------
// POST /google — Google Sign-In or explicit workspace registration
// ---------------------------------------------------------------------------

const googleBodySchema = z.object({
  credential: z.string().min(1),
  intent: z.enum(["login", "register"]).default("login"),
  companyName: z.string().min(2).optional(),
});

authRouter.post(
  "/google",
  googleLimiter,
  validate(googleBodySchema),
  asyncHandler(async (request, response) => {
    const { credential, intent, companyName } = request.validated?.body as z.infer<
      typeof googleBodySchema
    >;

    const { email, name, sub } = await verifyGoogleToken(credential);

    const existingGoogleUser = await findAuthUserByGoogleId(sub);
    const existingEmailUser = await findAuthUserByEmail(email);
    let user = existingGoogleUser ?? existingEmailUser;

    if (intent === "register") {
      if (user) {
        throw new ApiError(
          400,
          "This Google account already belongs to a workspace. Please sign in instead.",
        );
      }

      const targetCompanyName = companyName?.trim() || name.trim() || email.split("@")[0];
      if (!targetCompanyName) {
        throw new ApiError(400, "Company name is required to create a workspace.");
      }

      const createdUser = await createWorkspaceWithAdmin({
        companyName: targetCompanyName,
        adminName: name,
        adminEmail: email,
        googleId: sub,
      });

      const authResponse = await buildAuthResponse(createdUser);
      response.status(201).json(authResponse);
      return;
    }

    if (!user) {
      throw new ApiError(
        404,
        "No workspace exists for this Google account. Please create a workspace first.",
      );
    }

    if (!user.isActive) {
      throw new ApiError(401, "Your account has been deactivated.");
    }

    if (!user.googleId) {
      user = await basePrisma.user.update({
        where: { id: user.id },
        data: { googleId: sub },
        include: { tenant: true },
      });
    } else if (user.googleId !== sub) {
      throw new ApiError(
        401,
        "This email is linked to a different Google account.",
      );
    }

    const authResponse = await buildAuthResponse(user);
    response.status(200).json(authResponse);
  }),
);

// ---------------------------------------------------------------------------
// POST /login — email + password login
// ---------------------------------------------------------------------------

authRouter.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as { email: string; password: string };

    const user = await findAuthUserByEmail(body.email);

    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid credentials");
    }

    if (!user.passwordHash) {
      throw new ApiError(
        401,
        "This account uses Google Sign-In. Please sign in with Google.",
      );
    }

    const passwordMatches = await bcrypt.compare(
      body.password,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new ApiError(401, "Invalid credentials");
    }

    const authResponse = await buildAuthResponse(user);
    response.json(authResponse);
  }),
);

// ---------------------------------------------------------------------------
// POST /change-password — requires current password
// ---------------------------------------------------------------------------

authRouter.post(
  "/change-password",
  changePasswordLimiter,
  requireAuth,
  validate(changePasswordSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof changePasswordSchema.parse>;

    const user = await basePrisma.user.findUnique({
      where: { id: request.user!.id },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid credentials");
    }

    if (!user.passwordHash) {
      throw new ApiError(
        400,
        "This account uses Google Sign-In. Please sign in with Google.",
      );
    }

    if (body.currentPassword === body.newPassword) {
      throw new ApiError(400, "New password must be different from the old password.");
    }

    const passwordMatches = await bcrypt.compare(
      body.currentPassword,
      user.passwordHash,
    );

    if (!passwordMatches) {
      throw new ApiError(401, "Current password is incorrect.");
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 10);

    await basePrisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    response.json({ status: "success" });
  }),
);

// ---------------------------------------------------------------------------
// GET /me — return the currently authenticated user
// ---------------------------------------------------------------------------

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (request, response) => {
    const [user, currencySetting] = await Promise.all([
      prisma.user.findUnique({
        where: {
          id: request.user!.id,
        },
        select: {
          id: true,
          tenantId: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          tenant: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.currencySetting.findFirst({
        where: { tenantId: request.user!.tenantId },
        select: { baseCurrency: true },
      }),
    ]);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    response.json({
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      workspaceName: user.tenant?.name,
      currency: normalizeCurrencyCode(currencySetting?.baseCurrency),
    });
  }),
);

// ---------------------------------------------------------------------------
// POST /download-token — short‑lived token for file downloads
// ---------------------------------------------------------------------------

authRouter.post(
  "/download-token",
  requireAuth,
  asyncHandler(async (request, response) => {
    const token = signToken(
      {
        sub: request.user!.id,
        tenantId: request.user!.tenantId,
        purpose: "download",
        role: request.user!.role,
        email: request.user!.email,
        name: request.user!.name,
      },
      "1m",
    );

    response.json({ token });
  }),
);
