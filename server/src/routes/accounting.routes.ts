import { parse } from "csv-parse/sync";
import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  accountSchema,
  bankImportSchema,
  journalEntrySchema,
  listQuerySchema,
  reportQuerySchema,
} from "../schemas/domain";
import { createBalancedJournalEntry } from "../services/accounting.service";
import {
  getBalanceSheet,
  getCashFlow,
  getProfitAndLoss,
  getTaxSummary,
  getTrialBalance,
} from "../services/report.service";
import { getPagination } from "../utils/pagination";

export const accountingRouter = Router();

accountingRouter.use(requireAuth);
accountingRouter.use(requireRole(["ADMIN", "ACCOUNTANT"]));

accountingRouter.get(
  "/accounts",
  asyncHandler(async (_request, response) => {
    const accounts = await prisma.account.findMany({
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
    const account = await prisma.account.create({ data: body });
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
      prisma.journalEntry.count(),
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
      createdById: body.createdById ?? request.user?.id,
    });

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

    const matchedPayments = await prisma.payment.findMany();

    const result = await prisma.$transaction(async (tx) => {
      const imported = await tx.bankStatementImport.create({
        data: {
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
    response.json(await getProfitAndLoss(query.startDate, query.endDate));
  }),
);

accountingRouter.get(
  "/reports/balance-sheet",
  asyncHandler(async (_request, response) => {
    response.json(await getBalanceSheet());
  }),
);

accountingRouter.get(
  "/reports/cash-flow",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    response.json(await getCashFlow(query.startDate, query.endDate));
  }),
);

accountingRouter.get(
  "/reports/trial-balance",
  asyncHandler(async (_request, response) => {
    response.json(await getTrialBalance());
  }),
);

accountingRouter.get(
  "/reports/tax-summary",
  validate(reportQuerySchema, "query"),
  asyncHandler(async (request, response) => {
    const query = request.validated?.query as { startDate?: Date; endDate?: Date };
    response.json(await getTaxSummary(query.startDate, query.endDate));
  }),
);

