import { prisma } from "../config/prisma";
import { Prisma } from "@prisma/client";

/**
 * Audit Service — PRD §7
 *
 * Maintains an immutable audit trail for all sensitive financial actions.
 * Captures: who acted, what changed, the exact before/after state, and when.
 *
 * Rules:
 * - AuditLog rows are INSERT-ONLY. Never update or delete.
 * - This service MUST NOT throw — a logging failure must never block business logic.
 * - Can run inside an existing transaction or open its own.
 */

export type AuditAction =
  | "CREATE_INVOICE"
  | "UPDATE_INVOICE"
  | "RECORD_PAYMENT"
  | "CREATE_SALES_ORDER"
  | "UPDATE_SALES_ORDER"
  | "CANCEL_SALES_ORDER"
  | "STOCK_ADJUSTMENT";

export interface LogAuditInput {
  tenantId: string;
  userId: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  ipAddress?: string;
  /** Optionally run inside an existing Prisma transaction */
  tx?: any;
}

export async function logAudit(input: LogAuditInput): Promise<void> {
  try {
    const client = input.tx ?? prisma;
    await client.auditLog.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        // Prisma requires InputJsonValue — go through JSON round-trip to satisfy the type
        previousState: input.previousState != null
          ? JSON.parse(JSON.stringify(input.previousState))
          : Prisma.JsonNull,
        newState: input.newState != null
          ? JSON.parse(JSON.stringify(input.newState))
          : Prisma.JsonNull,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit failures must NEVER block the primary business transaction.
    // Log to stderr only.
    console.error(`[AuditLog] Failed to write audit record for action=${input.action} entity=${input.entityType}:${input.entityId}`, err);
  }
}
