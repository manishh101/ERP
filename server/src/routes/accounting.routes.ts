import { parse } from "csv-parse/sync";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  accountSchema,
  bankImportSchema,
  idParamSchema,
  journalEntrySchema,
  listQuerySchema,
  reportQuerySchema,
} from "../schemas/domain";

import { createBalancedJournalEntry } from "../services/accounting.service";
import { getCustomerLedger } from "../modules/ar-ledger/ar-ledger.service";
import { getEntries, getMonthlySummary } from "../modules/vat-register/vat-register.service";
import {
  getBalanceSheet,

  getCashFlow,
  getProfitAndLoss,
  getTaxSummary,
  getTrialBalance,
} from "../services/report.service";
import { getPagination } from "../utils/pagination";
import { invalidateDashboardCache } from "../config/redis";

export const accountingRouter = Router();

accountingRouter.use(requireAuth);
accountingRouter.use(requireRole(["ADMIN", "ACCOUNTANT"]));

accountingRouter.get(
  "/accounts",
  asyncHandler(async (request, response) => {
    const accounts = await prisma.account.findMany({
      where: { tenantId: request.user!.tenantId },
      orderBy: [{ type: "asc" }, { code: "asc" }],
    });

    response.json(accounts);
  }),
);

accountingRouter.post(
  "/accounts",
  validate(accountSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof accountSchema.parse>;
    const account = await prisma.account.create({
      data: {
        ...body,
        tenantId: request.user!.tenantId,
      },
    });
    response.status(201).json(account);
  }),
);

accountingRouter.get(
  "/journal-entries",
  validate(listQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { page: number; pageSize: number };
    const [items, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where: { tenantId: request.user!.tenantId },
        include: {
          lines: {
            include: {
              account: true,
            },
          },
          createdBy: true,
        },
        orderBy: {
          date: "desc",
        },
        ...getPagination(query.page, query.pageSize),
      }),
      prisma.journalEntry.count({
        where: { tenantId: request.user!.tenantId },
      }),
    ]);

    response.json({ items, total });
  }),
);

accountingRouter.post(
  "/journal-entries",
  validate(journalEntrySchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof journalEntrySchema.parse>;
    const entry = await createBalancedJournalEntry({
      ...body,
      tenantId: request.user!.tenantId,
      createdById: body.createdById ?? request.user?.id,
    });

    await invalidateDashboardCache(request.user!.tenantId);

    response.status(201).json(entry);
  }),
);

accountingRouter.post(
  "/reconcile/import",
  validate(bankImportSchema),
  asyncHandler(async (request, response) => {
    const body = request.validated?.body as ReturnType<typeof bankImportSchema.parse>;

    const rows = parse(body.csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, string>>;

    const matchedPayments = await prisma.payment.findMany({
      where: { tenantId: request.user!.tenantId },
    });

    const result = await prisma.$transaction(async (tx) => {
      const imported = await tx.bankStatementImport.create({
        data: {
          tenantId: request.user!.tenantId,
          fileName: body.fileName,
          totalLines: rows.length,
          unmatchedLines: rows.length,
        },
      });

      let unmatchedLines = 0;

      for (const row of rows) {
        const amount = Number(row.amount ?? row.Amount ?? 0);
        const reference = row.reference ?? row.Reference ?? "";
        const description = row.description ?? row.Description ?? "";
        const transactionDate = new Date(row.date ?? row.Date ?? new Date());

        const matchedPayment = matchedPayments.find((payment) => {
          const sameAmount = Number(payment.amount) === amount;
          const sameReference = reference
            ? (payment.reference ?? "").toLowerCase().includes(reference.toLowerCase())
            : false;
          return sameAmount && sameReference;
        });

        if (!matchedPayment) {
          unmatchedLines += 1;
        }

        await tx.bankStatementLine.create({
          data: {
            tenantId: request.user!.tenantId,
            importId: imported.id,
            matchedPaymentId: matchedPayment?.id,
            transactionDate,
            description,
            reference,
            amount,
            isMatched: Boolean(matchedPayment),
          },
        });
      }

      await tx.bankStatementImport.update({
        where: { id: imported.id },
        data: {
          unmatchedLines,
        },
      });

      return tx.bankStatementImport.findUnique({
        where: { id: imported.id },
        include: {
          lines: true,
        },
      });
    });

    response.status(201).json(result);
  }),
);

accountingRouter.get(
  "/reports/profit-loss",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    response.json(await getProfitAndLoss(request.user!.tenantId, query.startDate, query.endDate));
  }),
);

accountingRouter.get(
  "/reports/balance-sheet",
  asyncHandler(async (request, response) => {
    response.json(await getBalanceSheet(request.user!.tenantId));
  }),
);

accountingRouter.get(
  "/reports/cash-flow",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    response.json(await getCashFlow(request.user!.tenantId, query.startDate, query.endDate));
  }),
);

accountingRouter.get(
  "/reports/trial-balance",
  asyncHandler(async (request, response) => {
    response.json(await getTrialBalance(request.user!.tenantId));
  }),
);

accountingRouter.get(
  "/reports/tax-summary",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    response.json(await getTaxSummary(request.user!.tenantId, query.startDate, query.endDate));
  }),
);

accountingRouter.get(
  "/customers/:id/ledger",
  asyncHandler(async (request, response) => {
    const { id } = idParamSchema.parse(request.params);
    const { startDate, endDate } = listQuerySchema.parse(request.query);
    const ledger = await getCustomerLedger(request.user!.tenantId, id, startDate, endDate);
    response.json(ledger);
  }),
);

// ---------------------------------------------------------------------------
// GET /accounting/vat-register — Full VAT Sales Register (Annex 7)
// ---------------------------------------------------------------------------

accountingRouter.get(
  "/vat-register",
  asyncHandler(async (request, response) => {
    const fiscalYear = (request.query.fiscalYear as string) || "";
    if (!fiscalYear) {
      return response.status(400).json({ error: "fiscalYear query parameter is required" });
    }
    const month = request.query.month as string | undefined;
    const [entries, monthlySummary] = await Promise.all([
      getEntries(request.user!.tenantId, fiscalYear, month),
      getMonthlySummary(request.user!.tenantId, fiscalYear),
    ]);
    const totals = entries.reduce(
      (acc, e) => {
        acc.taxableAmount += e.taxableAmount;
        acc.outputVat += e.outputVat;
        acc.totalWithVat += e.totalWithVat;
        return acc;
      },
      { taxableAmount: 0, outputVat: 0, totalWithVat: 0 },
    );
    return response.json({ entries, totals, monthlySummary });
  }),
);
