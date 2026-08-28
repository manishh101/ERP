# Changelog

All notable changes to this ERP project will be documented in this file.

## [Phase 11] - 2026-08-28

### Added
- Multi-tab Accounting Dashboard in `AccountingPage.tsx` covering Overview, Chart of Accounts, Journal Entries & GL, and Bank Reconciliation.
- Interactive Chart of Accounts management with category filter tabs (Asset, Liability, Equity, Income, Expense) and `CreateAccountDialog`.
- Detailed General Ledger entry logs with expandable line-by-line debit/credit accounts and references.
- Bank statement CSV reconciliation modal `BankReconcileModal` and backend API integration (`useBankImportMutation`).
- Fiscal Year presets (`FY 2080/81`, `FY 2081/82`, `This Month`, `Last Month`) and reset filters in `ReportingPage.tsx`.
- `@media print` CSS utility rules in `index.css` for report and tax register printing.

### Changed
- Standardized financial numbers across `ArLedgerPage.tsx` and `VatRegisterPage.tsx` with `font-mono tabular-nums` and NPR `Rs.` formatting.
- Enhanced reference badges and Bikram Sambat (BS) date displays across ledger tables.

### Security & Invariants
- Preserved conceptual separation between Commercial AR (`/accounting/ledger`), VAT Register (`/accounting/vat`), and General Accounting (`/accounting`).
