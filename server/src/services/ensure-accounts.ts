import { prisma } from "../config/prisma";
import type { AccountType } from "@prisma/client";

/**
 * Standard Chart of Accounts for a Nepalese manufacturing ERP.
 *
 * These accounts MUST exist for the double-entry GL to function.
 * The seed script calls this once, and tenant-creation flows should
 * call it as well so that new tenants are ready from day one.
 *
 * This function is fully idempotent — safe to call multiple times.
 */

interface AccountDef {
  code: string;
  name: string;
  type: AccountType;
}

const STANDARD_ACCOUNTS: AccountDef[] = [
  // ── ASSETS ──────────────────────────────────────────────────
  { code: "1000", name: "Cash & Bank",            type: "ASSET" },
  { code: "1100", name: "Accounts Receivable",     type: "ASSET" },
  { code: "1200", name: "Inventory",               type: "ASSET" },
  { code: "1300", name: "Prepaid Expenses",        type: "ASSET" },

  // ── LIABILITIES ─────────────────────────────────────────────
  { code: "2000", name: "Accounts Payable",        type: "LIABILITY" },
  { code: "2100", name: "VAT Payable",             type: "LIABILITY" },
  { code: "2200", name: "Other Current Liabilities", type: "LIABILITY" },

  // ── EQUITY ──────────────────────────────────────────────────
  { code: "3000", name: "Owner Equity",            type: "EQUITY" },
  { code: "3100", name: "Retained Earnings",       type: "EQUITY" },

  // ── INCOME ──────────────────────────────────────────────────
  { code: "4000", name: "Sales Revenue",           type: "INCOME" },
  { code: "4100", name: "Other Income",            type: "INCOME" },

  // ── EXPENSES ────────────────────────────────────────────────
  { code: "5000", name: "Cost of Goods Sold",      type: "EXPENSE" },
  { code: "6000", name: "Operating Expenses",      type: "EXPENSE" },
  { code: "6100", name: "Salaries & Wages",        type: "EXPENSE" },
  { code: "6200", name: "Rent & Utilities",        type: "EXPENSE" },
  { code: "6300", name: "Transport & Delivery",    type: "EXPENSE" },
];

/**
 * Ensures all standard Chart of Accounts entries exist for a tenant.
 * Uses upsert so it's safe to call repeatedly without duplicating rows.
 *
 * @param tenantId  The tenant to provision accounts for
 * @param tx        Optional Prisma transaction client
 */
export async function ensureStandardAccounts(
  tenantId: string,
  tx?: any,
): Promise<void> {
  const client = tx || prisma;

  for (const acct of STANDARD_ACCOUNTS) {
    await client.account.upsert({
      where: {
        code_tenantId: {
          code: acct.code,
          tenantId,
        },
      },
      update: {}, // no-op if it already exists
      create: {
        tenantId,
        code: acct.code,
        name: acct.name,
        type: acct.type,
        balance: 0,
      },
    });
  }
}

export { STANDARD_ACCOUNTS };
