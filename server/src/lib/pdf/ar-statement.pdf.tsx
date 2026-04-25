import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToStream,
} from "@react-pdf/renderer";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: Date) => {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

const humanType = (t: string) =>
  t.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60, // room for fixed footer
    paddingHorizontal: 44,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#111111",
    backgroundColor: "#ffffff",
  },

  // ── Fixed page header (repeats on every page) ─────────────────────────
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
  },
  companyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 2,
  },
  companyMeta: {
    fontSize: 8,
    color: "#555555",
    lineHeight: 1.5,
  },
  docTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  docMeta: {
    fontSize: 8,
    color: "#555555",
    textAlign: "right",
    marginTop: 3,
    lineHeight: 1.6,
  },

  // ── Bill-to (first page only, not fixed) ─────────────────────────────
  billToBlock: {
    marginBottom: 20,
  },
  billToLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#777777",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  billToName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 2,
  },
  billToMeta: {
    fontSize: 8.5,
    color: "#444444",
    lineHeight: 1.6,
  },

  // ── Table ─────────────────────────────────────────────────────────────
  // Table column header repeats on every page via fixed prop
  tableHeaderRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#111111",
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  thText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Regular data rows
  dataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 5,
    alignItems: "center",
  },
  dataRowAlt: {
    backgroundColor: "#fafafa",
  },
  openingRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#bbbbbb",
    paddingVertical: 5,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  tdText: { fontSize: 8.5, color: "#111111" },
  tdBold: { fontSize: 8.5, color: "#111111", fontFamily: "Helvetica-Bold" },
  tdMuted: { fontSize: 8, color: "#666666" },

  // Column widths
  cDate: { width: "13%" },
  cType: { width: "20%" },
  cRef:  { width: "25%" },
  cDr:   { width: "14%", textAlign: "right" },
  cCr:   { width: "14%", textAlign: "right" },
  cBal:  { width: "14%", textAlign: "right" },

  // ── Totals row ────────────────────────────────────────────────────────
  totalsRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: "#111111",
    marginTop: 2,
  },
  totalsLabel: {
    width: "58%",
    textAlign: "right",
    paddingRight: 8,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },
  totalsAmt: {
    width: "14%",
    textAlign: "right",
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
  },

  // ── Closing balance ───────────────────────────────────────────────────
  closingRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
  },
  closingLabel: {
    fontSize: 8.5,
    color: "#555555",
    marginRight: 12,
  },
  closingAmount: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },

  // ── Fixed page footer (repeats on every page) ─────────────────────────
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7.5, color: "#888888" },
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface LedgerItem {
  entryDate: Date;
  entryType: string;
  referenceId: string;
  narration?: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface LedgerPdfProps {
  customer: any;
  ledger: LedgerItem[];
  company: any;
  period: { start?: Date; end?: Date };
  openingBalance?: number; // carry-forward balance before period start
}

// ─── Document ─────────────────────────────────────────────────────────────────
const LedgerDocument = ({
  customer,
  ledger,
  company,
  period,
  openingBalance = 0,
}: LedgerPdfProps) => {
  const totalDebit    = ledger.reduce((s, r) => s + r.debit,  0);
  const totalCredit   = ledger.reduce((s, r) => s + r.credit, 0);
  const closingBalance =
    ledger.length > 0 ? ledger[ledger.length - 1].runningBalance : openingBalance;

  const hasPeriod = Boolean(period.start || period.end);
  const periodLabel = hasPeriod
    ? `${period.start ? fmtDate(period.start) : "—"} to ${period.end ? fmtDate(period.end) : "—"}`
    : "All dates";

  const TableHeader = () => (
    <View style={S.tableHeaderRow} fixed>
      <Text style={[S.thText, S.cDate]}>Date</Text>
      <Text style={[S.thText, S.cType]}>Particulars</Text>
      <Text style={[S.thText, S.cRef]}>Reference</Text>
      <Text style={[S.thText, S.cDr]}>Debit</Text>
      <Text style={[S.thText, S.cCr]}>Credit</Text>
      <Text style={[S.thText, S.cBal]}>Balance</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={S.page} wrap>

        {/* ── Fixed page header — repeats on every page ─────────────── */}
        <View style={S.pageHeader} fixed>
          <View>
            <Text style={S.companyName}>{company.name}</Text>
            <Text style={S.companyMeta}>{company.address}</Text>
            {company.panNo ? <Text style={S.companyMeta}>PAN: {company.panNo}</Text> : null}
            {company.phone ? <Text style={S.companyMeta}>Tel: {company.phone}</Text> : null}
          </View>
          <View>
            <Text style={S.docTitle}>Statement</Text>
            <Text style={S.docMeta}>Date: {fmtDate(new Date())}</Text>
            <Text style={S.docMeta}>Period: {periodLabel}</Text>
            <Text style={S.docMeta}>Currency: NPR</Text>
          </View>
        </View>

        {/* ── Bill To — first page only ─────────────────────────────── */}
        <View style={S.billToBlock}>
          <Text style={S.billToLabel}>Bill To</Text>
          <Text style={S.billToName}>{customer.name}</Text>
          {customer.address ? <Text style={S.billToMeta}>{customer.address}</Text> : null}
          {customer.email   ? <Text style={S.billToMeta}>{customer.email}</Text>   : null}
          {customer.phone   ? <Text style={S.billToMeta}>{customer.phone}</Text>   : null}
          {customer.panNo   ? <Text style={S.billToMeta}>PAN: {customer.panNo}</Text> : null}
        </View>

        {/* ── Table ─────────────────────────────────────────────────── */}
        <View>
          {/* Column headers — fixed so they repeat on each page */}
          <TableHeader />

          {/* Opening balance carry-forward row (only when filtering by date) */}
          {hasPeriod && (
            <View style={S.openingRow}>
              <Text style={[S.tdMuted, S.cDate]}>
                {period.start ? fmtDate(period.start) : "—"}
              </Text>
              <Text style={[S.tdBold, S.cType]}>Opening Balance</Text>
              <Text style={[S.tdMuted, S.cRef]}>B/F</Text>
              <Text style={[S.tdMuted, S.cDr]}>—</Text>
              <Text style={[S.tdMuted, S.cCr]}>—</Text>
              <Text style={[S.tdBold, S.cBal]}>{fmt(openingBalance)}</Text>
            </View>
          )}

          {/* Data rows */}
          {ledger.map((item, i) => (
            <View key={i} style={[S.dataRow, i % 2 === 1 ? S.dataRowAlt : {}]}>
              <Text style={[S.tdMuted, S.cDate]}>{fmtDate(item.entryDate)}</Text>
              <Text style={[S.tdText, S.cType]}>
                {humanType(item.narration || item.entryType)}
              </Text>
              <Text style={[S.tdMuted, S.cRef]}>{item.referenceId || "—"}</Text>
              <Text style={[S.tdText, S.cDr]}>
                {item.debit > 0 ? fmt(item.debit) : "—"}
              </Text>
              <Text style={[S.tdText, S.cCr]}>
                {item.credit > 0 ? fmt(item.credit) : "—"}
              </Text>
              <Text style={[S.tdBold, S.cBal]}>{fmt(item.runningBalance)}</Text>
            </View>
          ))}

          {/* Totals */}
          <View style={S.totalsRow}>
            <Text style={S.totalsLabel}>Total</Text>
            <Text style={S.totalsAmt}>{fmt(totalDebit)}</Text>
            <Text style={S.totalsAmt}>{fmt(totalCredit)}</Text>
            <Text style={S.totalsAmt}>{fmt(closingBalance)}</Text>
          </View>
        </View>

        {/* ── Closing balance ───────────────────────────────────────── */}
        <View style={S.closingRow}>
          <Text style={S.closingLabel}>Closing Balance Due</Text>
          <Text style={S.closingAmount}>NPR {fmt(closingBalance)}</Text>
        </View>

        {/* ── Fixed footer with page numbers — repeats on every page ── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            Computer-generated statement. No signature required.
          </Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `${company.name}  ·  Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
};

export async function renderLedgerPdf(props: LedgerPdfProps) {
  return await renderToStream(<LedgerDocument {...props} />);
}
