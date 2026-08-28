# ADR-011: Accounting & Financial Reports UX Transformation

## Status
Accepted

## Context
Prior to Phase 11, the accounting module consisted of disconnected views with basic summary statistics, while the AR ledger, VAT register, and general ledger reports lacked uniform numeric alignment (`tabular-nums font-mono`), standardized date filters, and clean print capabilities. Additionally, accounting domain concepts required strict isolation: Commercial AR customer balances, statutory IRD VAT sales registers, and double-entry General Ledger operations must never be merged.

## Decision
1. **Multi-Tab Accounting Workspace**: Upgraded `AccountingPage.tsx` into a central hub featuring tabs for Financial Overview, Chart of Accounts, Journal Entries & GL, and Bank Reconciliation.
2. **Chart of Accounts & Journal Entry Management**: Introduced `CreateAccountDialog` for dynamic Chart of Accounts management and detailed expandable journal entry line items in the General Ledger tab.
3. **Automated Bank Reconciliation Interface**: Built `BankReconcileModal` supporting statement CSV parsing and automated payment matching.
4. **Data Presentation & Print Standardization**: Standardized monetary figures across `ArLedgerPage.tsx` and `VatRegisterPage.tsx` with `font-mono tabular-nums` and `Rs.` currency formatting. Added `@media print` rules in `index.css` for clean document printing.
5. **Report Filtering**: Enhanced `ReportingPage.tsx` with Fiscal Year presets (FY 2080/81, FY 2081/82, This Month, Last Month) and quick reset triggers.
6. **Accounting Separation Invariant**: Preserved conceptual boundaries between Commercial AR (`/accounting/ledger`), Statutory Tax (`/accounting/vat`), and Double-Entry GL (`/accounting`).

## Consequences
- Single-page accessibility to all general ledger, chart of accounts, and bank reconciliation workflows.
- Improved readability and precision for financial figures across all screens.
- Zero regression in double-entry accounting logic, VAT annex rules, or customer AR tracking.
