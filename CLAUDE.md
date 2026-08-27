# Manish Steel ERP — Development Rules

## Project

This is an existing ERP for a Nepal-based wholesale/manufacturing furniture business.

Do not treat this as a greenfield application.

## Source of Truth

Actual implementation > documentation > assumptions.

Inspect existing code before modifying it.

## Architecture

Preserve the existing:

- React
- TypeScript
- Vite
- Tailwind
- React Query
- Express
- Prisma
- PostgreSQL
- Zod
- JWT
- RBAC
- Redis

Do not introduce new frameworks unless there is a concrete reason.

## Accounting Invariants

Never confuse:

SalesOrder.orderAmount
with
TaxInvoice.invoiceAmount.

AR Ledger = commercial truth.

VAT Register = tax/compliance truth.

Payments belong to Sales Orders.

Customer statements use AR Ledger.

VAT reporting uses VAT Register.

Financial mutations must remain transactional.

Do not weaken:

- tenant isolation
- RBAC
- audit logging
- authentication
- transaction boundaries

## UX Principles

Optimize:

1. Clarity
2. Speed
3. Accuracy
4. Simplicity

Do not add complexity merely to expose functionality.

Prefer workflows that minimize:

- clicks
- page transitions
- unnecessary dialogs
- unnecessary decisions

## UI Direction

The ERP should feel:

- professional
- modern
- fast
- trustworthy
- calm
- premium
- business-oriented

Avoid:

- excessive gradients
- glassmorphism
- excessive shadows
- decorative animations
- oversized cards
- unnecessary colors

## Nepal Context

Use:

- NPR
- BS dates
- Nepal fiscal-year concepts

where appropriate.

Do not force users to manually convert dates unnecessarily.

## Performance

Do not optimize based on assumptions.

Inspect:

- React Query behavior
- API calls
- database queries
- rendering
- bundle size
- caching

Financial correctness takes priority over aggressive caching or optimistic updates.

## Development Rules

For meaningful changes:

1. Inspect existing code.
2. Trace dependencies.
3. Understand business consequences.
4. Implement the smallest robust change.
5. Run TypeScript checks.
6. Run lint.
7. Run tests.
8. Run production build.
9. Verify affected workflows.
10. Report what changed.

Never perform a giant speculative rewrite.

## Security

Never print secrets.

Never commit credentials.

Never weaken authentication, authorization or tenant isolation.

## Before Editing

Explain briefly:

- what you found
- which files you will change
- why those files need changing
- potential risks

Then implement.

## After Editing

Report:

- files changed
- behavior changed
- tests/checks run
- remaining issues
- potential regressions

# Manish Steel ERP — Development Rules

## Project

This is an existing ERP for a Nepal-based wholesale/manufacturing furniture business.

Do not treat this as a greenfield application.

## Source of Truth

Actual implementation > documentation > assumptions.

Inspect existing code before modifying it.

## Architecture

Preserve the existing:

- React
- TypeScript
- Vite
- Tailwind
- React Query
- Express
- Prisma
- PostgreSQL
- Zod
- JWT
- RBAC
- Redis

Do not introduce new frameworks unless there is a concrete reason.

## Accounting Invariants

Never confuse:

SalesOrder.orderAmount
with
TaxInvoice.invoiceAmount.

AR Ledger = commercial truth.

VAT Register = tax/compliance truth.

Payments belong to Sales Orders.

Customer statements use AR Ledger.

VAT reporting uses VAT Register.

Financial mutations must remain transactional.

Do not weaken:

- tenant isolation
- RBAC
- audit logging
- authentication
- transaction boundaries

## UX Principles

Optimize:

1. Clarity
2. Speed
3. Accuracy
4. Simplicity

Do not add complexity merely to expose functionality.

Prefer workflows that minimize:

- clicks
- page transitions
- unnecessary dialogs
- unnecessary decisions

## UI Direction

The ERP should feel:

- professional
- modern
- fast
- trustworthy
- calm
- premium
- business-oriented

Avoid:

- excessive gradients
- glassmorphism
- excessive shadows
- decorative animations
- oversized cards
- unnecessary colors

## Nepal Context

Use:

- NPR
- BS dates
- Nepal fiscal-year concepts

where appropriate.

Do not force users to manually convert dates unnecessarily.

## Performance

Do not optimize based on assumptions.

Inspect:

- React Query behavior
- API calls
- database queries
- rendering
- bundle size
- caching

Financial correctness takes priority over aggressive caching or optimistic updates.

## Development Rules

For meaningful changes:

1. Inspect existing code.
2. Trace dependencies.
3. Understand business consequences.
4. Implement the smallest robust change.
5. Run TypeScript checks.
6. Run lint.
7. Run tests.
8. Run production build.
9. Verify affected workflows.
10. Report what changed.

Never perform a giant speculative rewrite.

## Security

Never print secrets.

Never commit credentials.

Never weaken authentication, authorization or tenant isolation.

## Before Editing

Explain briefly:

- what you found
- which files you will change
- why those files need changing
- potential risks

Then implement.

## After Editing

Report:

- files changed
- behavior changed
- tests/checks run
- remaining issues
- potential regressions
