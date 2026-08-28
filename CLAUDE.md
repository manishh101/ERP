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


Documentation & Engineering Record

Documentation is part of the implementation and Definition of Done.

The repository must remain understandable, maintainable, and auditable months or years after development.

Do not rely on chat history as the permanent record of implementation decisions.

Documentation Source of Truth

Actual implementation > documentation > assumptions.

Documentation must describe what is ACTUALLY implemented.

Never document planned or intended behavior as if it already exists.

If documentation and implementation disagree:

Inspect the implementation.
Determine which is correct.
Fix the documentation if the implementation is correct.
Fix the implementation if the implementation is incorrect.
Document the resolution when the discrepancy is meaningful.
Documentation Structure

Maintain project documentation under:

docs/

Use these areas where appropriate:

docs/
├── architecture/
├── business/
├── decisions/
├── phases/
├── qa/
└── CHANGELOG.md

Do not create unnecessary documentation files.

Prefer updating an existing relevant document rather than creating duplicates.

Phase Documentation

Every major development phase MUST have a corresponding document:

docs/phases/PHASE-XX-<NAME>.md

Each phase document should record:

objective
starting state
problems discovered
files/components affected
frontend changes
backend/API changes
database changes
React Query changes
UX decisions
business-rule implications
accounting implications
security implications
performance implications
tests/checks performed
workflows verified
measurable before/after improvements where available
known limitations
remaining issues
potential regressions
future improvements

Do not write vague documentation such as:

"Improved sales order UX."

Instead document the actual implementation and measurable behavior where possible.

Architectural Decision Records

For meaningful architectural, business, UX, security, database, or performance decisions, create an ADR under:

docs/decisions/

Use:

ADR-XXX-short-description.md

Each ADR should contain:

Context

What problem existed?

Decision

What was decided?

Reason

Why was this approach selected?

Alternatives Considered

What alternatives were considered and rejected?

Consequences

What does this decision affect?

Verification

How can a future developer verify that this decision is still correctly implemented?

Do NOT create ADRs for trivial code changes.

Business Rules Documentation

Maintain explicit documentation for critical business rules.

At minimum, document:

Sales Order amount semantics
Payment allocation
AR Ledger semantics
VAT Register semantics
Inventory movement rules
Stock reservation rules
Purchase workflow
Goods Receipt rules
Delivery workflow
tenant isolation
RBAC
audit logging

Critical accounting invariants must remain explicit.

For example:

SalesOrder.orderAmount = commercial/order amount used by AR.

TaxInvoice.invoiceAmount = tax invoice amount used by VAT.

Payments belong to Sales Orders.

AR and VAT are separate systems.

Never silently change these semantics.

Change Log

Maintain:

docs/CHANGELOG.md

Every completed major phase should add a concise entry containing:

date
phase
major changes
important fixes
affected workflows
verification status

Never include secrets or sensitive credentials.

Verification Records

When a workflow is tested, record:

workflow
scenario
expected result
actual result
status
date
relevant test/check

Use:

PASS
FAIL
BLOCKED

Never claim PASS without actually verifying it.

Documentation During Development

Do not wait until the end of a phase to reconstruct what happened.

For meaningful changes, update the relevant phase documentation as implementation progresses or immediately after each logical unit of work.

Record important discoveries while they are fresh.

Definition of Done

A major phase is NOT complete until:

Implementation is complete.
Relevant tests/checks have been run.
Affected workflows have been verified.
Phase documentation is updated.
docs/CHANGELOG.md is updated.
Relevant architecture/business documentation is updated.
Important decisions have ADRs.
Known limitations are documented.
Remaining issues are documented.
Documentation accurately matches the actual code.
Documentation Quality

Documentation should help a future developer answer:

What does this system do?
Why was it designed this way?
Which files implement it?
Which business rules must not be broken?
How does the data flow?
How can I verify it?
What changed?
Why did it change?
What is still incomplete?

Do not document trivial implementation details that are already obvious from clean code.

Document decisions, behavior, workflows, invariants, risks, and verification.

AI Development Rule

AI agents must treat repository documentation as part of the engineering work.

Before making a significant change:

Read the relevant documentation.
Inspect the actual implementation.
Understand dependencies and business consequences.
Implement the smallest robust change.
Test it.
Update the documentation.
Report what changed and how it was verified.

Never make large undocumented changes.