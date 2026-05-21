import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { bankImportSchema, idParamSchema, listQuerySchema } from "../schemas/domain";
import { ApiError } from "../utils/api-error";
import { getPagination } from "../utils/pagination";

export const bankRouter = Router();

bankRouter.use(requireAuth);

// Import bank statement CSV content and attempt to auto-match to payments
bankRouter.post(
  "/import",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  validate(bankImportSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof bankImportSchema.parse>;

    // Very small CSV parser for expected columns: transaction_date,description,reference,amount
    const lines: Array<{ transactionDate: Date; description: string; reference?: string; amount: number }> = [];
    const raw = body.csvContent.trim();
    if (!raw) {
      throw new ApiError(400, "CSV content is empty");
    }

    const rows = raw.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);

    const header = rows.shift();
    if (!header) {
      throw new ApiError(400, "CSV header missing");
    }

    const headers = header.split(",").map((h) => h.trim().toLowerCase());
    const idx = {
      date: headers.indexOf("date") !== -1 ? headers.indexOf("date") : headers.indexOf("transaction_date"),
      description: headers.indexOf("description"),
      reference: headers.indexOf("reference"),
      amount: headers.indexOf("amount"),
    };

    if (idx.date === -1 || idx.amount === -1 || idx.description === -1) {
      throw new ApiError(400, "CSV must include date, description and amount columns");
    }

    for (const row of rows) {
      const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const dateStr = cols[idx.date];
      const amountStr = cols[idx.amount];
      const desc = idx.description !== -1 ? cols[idx.description] : "";
      const ref = idx.reference !== -1 ? cols[idx.reference] : undefined;

      const parsedDate = new Date(dateStr);
      if (Number.isNaN(parsedDate.getTime())) {
        throw new ApiError(400, `Invalid date in CSV row: ${dateStr}`);
      }

      const amount = Number(amountStr.replace(/[^0-9.-]+/g, ""));
      if (Number.isNaN(amount)) {
        throw new ApiError(400, `Invalid amount in CSV row: ${amountStr}`);
      }

      lines.push({ transactionDate: parsedDate, description: desc, reference: ref, amount });
    }

    const result = await prisma.$transaction(async (tx) => {
      const importRecord = await tx.bankStatementImport.create({
        data: {
          tenantId: request.user!.tenantId,
          fileName: body.fileName,
          totalLines: lines.length,
        },
      });

      let unmatchedCount = 0;

      for (const r of lines) {
        let matchedPaymentId: string | null = null;
        // Try match by reference first
        if (r.reference) {
          const paymentByRef = await tx.payment.findFirst({
            where: { reference: r.reference, tenantId: request.user!.tenantId },
          });

          if (paymentByRef) matchedPaymentId = paymentByRef.id;
        }

        // If not found, try by amount to an unmatched payment
        if (!matchedPaymentId) {
          const paymentByAmount = await tx.payment.findFirst({
            where: {
              amount: r.amount,
              matchedBankLines: { none: {} },
              tenantId: request.user!.tenantId,
            },
          });

          if (paymentByAmount) matchedPaymentId = paymentByAmount.id;
        }

        const createdLine = await tx.bankStatementLine.create({
          data: {
            tenantId: request.user!.tenantId,
            importId: importRecord.id,
            transactionDate: r.transactionDate,
            description: r.description,
            reference: r.reference,
            amount: r.amount,
            isMatched: Boolean(matchedPaymentId),
            matchedPaymentId: matchedPaymentId ?? undefined,
          },
        });

        if (!matchedPaymentId) unmatchedCount += 1;
      }

      // update import unmatchedLines
      await tx.bankStatementImport.update({
        where: { id: importRecord.id },
        data: { unmatchedLines: unmatchedCount },
      });

      return await tx.bankStatementImport.findUnique({
        where: { id: importRecord.id, tenantId: request.user!.tenantId },
        include: { lines: true },
      });
    });

    response.status(201).json(result);
  }),
);

bankRouter.get(
  "/imports",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { page: number; pageSize: number };

    const [items, total] = await Promise.all([
      prisma.bankStatementImport.findMany({
        where: { tenantId: request.user!.tenantId },
        include: { lines: true },
        orderBy: { importedAt: "desc" },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.bankStatementImport.count({
        where: { tenantId: request.user!.tenantId },
      }),
    ]);

    response.json({ items, total });
  }),
);

bankRouter.get(
  "/imports/:id",
  validate(idParamSchema, "params"),
  asyncHandler(async (request, response) => {
    const params = request.validated?.params as { id: string };
    const record = await prisma.bankStatementImport.findUnique({
      where: { id: params.id, tenantId: request.user!.tenantId },
      include: { lines: true },
    });

    if (!record) throw new ApiError(404, "Import not found");

    response.json(record);
  }),
);

bankRouter.post(
  "/imports/:importId/lines/:lineId/match",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  asyncHandler(async (request, response) => {
    const importId = String(request.params.importId ?? "");
    const lineId = String(request.params.lineId ?? "");
    const { paymentId } = request.body as { paymentId?: string };

    if (!paymentId) {
      throw new ApiError(400, "paymentId is required");
    }

    const [bankImport, line, payment] = await Promise.all([
      prisma.bankStatementImport.findUnique({ where: { id: importId, tenantId: request.user!.tenantId } }),
      prisma.bankStatementLine.findUnique({ where: { id: lineId, tenantId: request.user!.tenantId } }),
      prisma.payment.findUnique({ where: { id: paymentId, tenantId: request.user!.tenantId } }),
    ]);

    if (!bankImport) throw new ApiError(404, "Import not found");
    if (!line) throw new ApiError(404, "Bank statement line not found");
    if (!payment) throw new ApiError(404, "Payment not found");

    if (line.matchedPaymentId) {
      throw new ApiError(400, "Line is already matched");
    }

    await prisma.$transaction(async (tx) => {
      await tx.bankStatementLine.update({ where: { id: lineId, tenantId: request.user!.tenantId }, data: { matchedPaymentId: paymentId, isMatched: true } });
      await tx.bankStatementImport.update({ where: { id: importId, tenantId: request.user!.tenantId }, data: { unmatchedLines: { decrement: 1 } } });
    });

    response.json({ success: true });
  }),
);

bankRouter.post(
  "/imports/:importId/lines/:lineId/unmatch",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  asyncHandler(async (request, response) => {
    const importId = String(request.params.importId ?? "");
    const lineId = String(request.params.lineId ?? "");

    const line = await prisma.bankStatementLine.findUnique({ where: { id: lineId, tenantId: request.user!.tenantId } });
    if (!line) throw new ApiError(404, "Bank statement line not found");

    if (!line.matchedPaymentId) {
      throw new ApiError(400, "Line is not matched");
    }

    await prisma.$transaction(async (tx) => {
      await tx.bankStatementLine.update({ where: { id: lineId, tenantId: request.user!.tenantId }, data: { matchedPaymentId: null, isMatched: false } });
      await tx.bankStatementImport.update({ where: { id: importId, tenantId: request.user!.tenantId }, data: { unmatchedLines: { increment: 1 } } });
    });

    response.json({ success: true });
  }),
);

bankRouter.post(
  "/imports/:importId/lines/:lineId/suggest",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  asyncHandler(async (request, response) => {
    const lineId = String(request.params.lineId ?? "");
    const line = await prisma.bankStatementLine.findUnique({ where: { id: lineId, tenantId: request.user!.tenantId } });
    if (!line) throw new ApiError(404, "Bank statement line not found");

    const suggestions = await prisma.payment.findMany({
      where: {
        tenantId: request.user!.tenantId,
        OR: [
          { reference: line.reference },
          { amount: line.amount, matchedBankLines: { none: {} } },
        ],
      },
      take: 5,
    });

    response.json(suggestions);
  }),
);

bankRouter.post(
  "/imports/:importId/delete",
  requireRole(["ADMIN", "ACCOUNTANT"]),
  asyncHandler(async (request, response) => {
    const importId = String(request.params.importId ?? "");
    const importRecord = await prisma.bankStatementImport.findUnique({
      where: { id: importId, tenantId: request.user!.tenantId },
    });
    if (!importRecord) throw new ApiError(404, "Import not found");
    await prisma.bankStatementImport.delete({ where: { id: importId } });
    response.status(204).send();
  }),
);
