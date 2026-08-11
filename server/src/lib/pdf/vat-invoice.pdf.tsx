import React from "react";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { toEnglishWords } from "../../shared/number-words.util";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string | Date | undefined) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "—";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
};

function getInvoiceTitle(invoiceType: string, isEstimate: boolean): string {
  if (isEstimate) return "Estimate Bill";
  if (invoiceType === "VAT") return "Tax Invoice";
  return "Invoice (PAN)";
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const LINE = "#222222";
const THIN = 0.6;

const S = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },

  /* ── Header ─────────────────────────────────────────────────────────── */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  companyName: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 1,
  },
  companyDetail: {
    fontSize: 8,
    color: "#444444",
    lineHeight: 1.45,
  },
  titleText: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textTransform: "uppercase",
    letterSpacing: 2,
  },

  dividerThick: {
    borderBottomWidth: 1.5,
    borderBottomColor: LINE,
    marginBottom: 14,
  },

  /* ── Bill-To & Meta ─────────────────────────────────────────────────── */
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  infoCol: {
    width: "52%",
  },
  metaCol: {
    width: "40%",
    alignItems: "flex-end",
  },
  sectionLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  partyName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 8.5,
    color: "#333333",
    lineHeight: 1.5,
  },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 8,
    color: "#777777",
    width: "48%",
    textAlign: "right",
  },
  metaValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    width: "50%",
    textAlign: "right",
  },

  /* ── Table ──────────────────────────────────────────────────────────── */
  table: {
    borderTopWidth: THIN,
    borderTopColor: LINE,
    borderBottomWidth: THIN,
    borderBottomColor: LINE,
    marginBottom: 6,
  },
  tableHead: {
    flexDirection: "row",
    borderBottomWidth: THIN,
    borderBottomColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  th: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#555555",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  tr: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderBottomWidth: THIN,
    borderBottomColor: "#dddddd",
    alignItems: "center",
  },
  trLast: {
    borderBottomWidth: 0,
  },
  td: {
    fontSize: 8.5,
    color: "#1a1a1a",
  },
  tdBold: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  tdSub: {
    fontSize: 7.5,
    color: "#888888",
    marginTop: 1,
  },

  // Column widths
  cNo:   { width: "5%", textAlign: "center" },
  cDesc: { width: "43%" },
  cQty:  { width: "9%", textAlign: "center" },
  cUnit: { width: "8%", textAlign: "center" },
  cRate: { width: "15%", textAlign: "right" },
  cAmt:  { width: "20%", textAlign: "right" },

  /* ── Totals ─────────────────────────────────────────────────────────── */
  totalsArea: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 10,
  },
  totalsBox: {
    width: "42%",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3.5,
    paddingHorizontal: 0,
  },
  totalsLabel: {
    fontSize: 8.5,
    color: "#555555",
  },
  totalsValue: {
    fontSize: 8.5,
    color: "#1a1a1a",
    textAlign: "right",
  },
  totalDivider: {
    borderTopWidth: THIN,
    borderTopColor: LINE,
    marginTop: 2,
    paddingTop: 4,
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textAlign: "right",
  },

  /* ── Words ──────────────────────────────────────────────────────────── */
  wordsBar: {
    borderTopWidth: THIN,
    borderTopColor: "#cccccc",
    borderBottomWidth: THIN,
    borderBottomColor: "#cccccc",
    paddingVertical: 6,
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  wordsPrefix: {
    fontSize: 7.5,
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  wordsText: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#222222",
  },

  /* ── Notes ──────────────────────────────────────────────────────────── */
  notesSection: {
    marginBottom: 30,
  },
  notesTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  noteLine: {
    fontSize: 7.5,
    color: "#666666",
    lineHeight: 1.45,
  },

  /* ── Signatures ─────────────────────────────────────────────────────── */
  sigArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  sigCol: {
    width: "38%",
    alignItems: "center",
  },
  sigLine: {
    width: "100%",
    borderTopWidth: THIN,
    borderTopColor: "#999999",
    marginBottom: 3,
  },
  sigRole: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#333333",
  },
  sigHint: {
    fontSize: 7,
    color: "#999999",
    marginTop: 1,
  },

  /* ── Fixed footer ───────────────────────────────────────────────────── */
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: THIN,
    borderTopColor: "#cccccc",
    paddingTop: 5,
  },
  footerText: {
    fontSize: 7,
    color: "#aaaaaa",
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────
interface RenderInvoiceOptions {
  invoice: any;
  companyProfile: any;
  template?: any;
  isEstimate?: boolean;
}

// ─── Document ─────────────────────────────────────────────────────────────────
function InvoiceDocument({
  invoice,
  companyProfile,
  isEstimate = false,
}: RenderInvoiceOptions) {
  const lineItems = isEstimate
    ? (invoice?.salesOrder?.lineItems || [])
    : (invoice?.lineItems || []);

  const invoiceType = invoice?.invoiceType || "PAN";
  const isVat = invoiceType === "VAT" && !isEstimate;
  const invoiceNumber = invoice?.invoiceNumber;

  const subtotal = lineItems.reduce((acc: number, item: any) => {
    const qty = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const lineGross = qty * unitPrice;
    const discAmt = item.discountAmount != null && Number(item.discountAmount) > 0
      ? Number(item.discountAmount)
      : lineGross * (Number(item.discountPct || 0) / 100);
    return acc + (lineGross - discAmt);
  }, 0);

  const taxableAmount = subtotal;
  const vatAmount = isVat ? taxableAmount * 0.13 : 0;
  const total = subtotal + vatAmount;
  const title = getInvoiceTitle(invoiceType, isEstimate);

  const customer = invoice?.salesOrder?.customer;

  return (
    <Document>
      <Page size="A4" style={S.page} wrap>

        {/* ── Header ──────────────────────────────────────────────── */}
        <View style={S.topBar}>
          <View>
            <Text style={S.companyName}>{companyProfile?.name}</Text>
            {companyProfile?.address && <Text style={S.companyDetail}>{companyProfile.address}</Text>}
            {companyProfile?.phone && <Text style={S.companyDetail}>Phone: {companyProfile.phone}</Text>}
            {companyProfile?.panNo && <Text style={S.companyDetail}>PAN: {companyProfile.panNo}</Text>}
            {companyProfile?.vatNo && <Text style={S.companyDetail}>VAT: {companyProfile.vatNo}</Text>}
          </View>
          <Text style={S.titleText}>{title}</Text>
        </View>
        <View style={S.dividerThick} />

        {/* ── Bill-To & Invoice Meta ──────────────────────────────── */}
        <View style={S.infoSection}>
          <View style={S.infoCol}>
            <Text style={S.sectionLabel}>Bill To</Text>
            <Text style={S.partyName}>{customer?.name || "—"}</Text>
            {customer?.address && <Text style={S.infoText}>{customer.address}</Text>}
            {customer?.phone && <Text style={S.infoText}>Phone: {customer.phone}</Text>}
            {customer?.panNo ? (
              <Text style={S.infoText}>PAN: {customer.panNo}</Text>
            ) : customer?.vatNo ? (
              <Text style={S.infoText}>VAT: {customer.vatNo}</Text>
            ) : null}
          </View>

          <View style={S.metaCol}>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Invoice No</Text>
              <Text style={S.metaValue}>{invoiceNumber}</Text>
            </View>
            {invoice?.bsDate && (
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>Miti (BS)</Text>
                <Text style={S.metaValue}>{invoice.bsDate}</Text>
              </View>
            )}
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Date</Text>
              <Text style={S.metaValue}>{fmtDate(invoice?.issueDate)}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Payment</Text>
              <Text style={S.metaValue}>
                {isEstimate ? (invoice?.paymentMode || "Cash/Credit") : "Cash/Credit"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Line Items Table ────────────────────────────────────── */}
        <View style={S.table}>
          <View style={S.tableHead}>
            <Text style={[S.th, S.cNo]}>#</Text>
            <Text style={[S.th, S.cDesc]}>Description</Text>
            <Text style={[S.th, S.cQty]}>Qty</Text>
            <Text style={[S.th, S.cUnit]}>Unit</Text>
            <Text style={[S.th, S.cRate]}>Rate</Text>
            <Text style={[S.th, S.cAmt]}>Amount</Text>
          </View>

          {lineItems.map((item: any, idx: number) => {
            const qty = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice || 0);
            const discountPct = Number(item.discountPct || 0);
            const lineGross = qty * unitPrice;
            const discAmt = item.discountAmount != null && Number(item.discountAmount) > 0
              ? Number(item.discountAmount)
              : lineGross * (discountPct / 100);
            const lineTotal = lineGross - discAmt;
            const unit = item.productVariant?.product?.unit || item.unit || "Pcs";
            const isLast = idx === lineItems.length - 1;

            return (
              <View style={[S.tr, isLast ? S.trLast : {}]} key={item.id || idx}>
                <Text style={[S.td, S.cNo]}>{idx + 1}</Text>
                <View style={S.cDesc}>
                  <Text style={S.tdBold}>
                    {item.productVariant?.product?.name ?? item.customProductName ?? "Item"}
                  </Text>
                  {item.productVariant?.variantName &&
                   item.productVariant.variantName !== "Default" &&
                   item.productVariant.variantName.toLowerCase() !== "standard" && (
                    <Text style={S.tdSub}>{item.productVariant.variantName}</Text>
                  )}
                </View>
                <Text style={[S.td, S.cQty]}>{qty}</Text>
                <Text style={[S.td, S.cUnit]}>{unit}</Text>
                <Text style={[S.td, S.cRate]}>{fmt(unitPrice)}</Text>
                <Text style={[S.tdBold, S.cAmt]}>{fmt(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: "auto" }}>
          {/* ── Totals ──────────────────────────────────────────────── */}
          <View style={S.totalsArea}>
            <View style={S.totalsBox}>
              <View style={S.totalsRow}>
                <Text style={S.totalsLabel}>Subtotal</Text>
                <Text style={S.totalsValue}>{fmt(subtotal)}</Text>
              </View>
              {isVat && (
                <>
                  <View style={S.totalsRow}>
                    <Text style={S.totalsLabel}>Taxable Amount</Text>
                    <Text style={S.totalsValue}>{fmt(taxableAmount)}</Text>
                  </View>
                  <View style={S.totalsRow}>
                    <Text style={S.totalsLabel}>VAT (13%)</Text>
                    <Text style={S.totalsValue}>{fmt(vatAmount)}</Text>
                  </View>
                </>
              )}
              <View style={[S.totalsRow, S.totalDivider]}>
                <Text style={S.grandTotalLabel}>Total (NPR)</Text>
                <Text style={S.grandTotalValue}>{fmt(total)}</Text>
              </View>
            </View>
          </View>

          {/* ── Amount in Words ─────────────────────────────────────── */}
          <View style={S.wordsBar}>
            <Text style={S.wordsPrefix}>In Words</Text>
            <Text style={S.wordsText}>{toEnglishWords(total)}</Text>
          </View>

          {/* ── Notes ───────────────────────────────────────────────── */}
          <View style={S.notesSection}>
            <Text style={S.notesTitle}>Terms & Conditions</Text>
            <Text style={S.noteLine}>1. Goods once sold will not be taken back.</Text>
            <Text style={S.noteLine}>2. E. & O.E.</Text>
          </View>

          {/* ── Signatures ──────────────────────────────────────────── */}
          <View style={S.sigArea}>
            <View style={S.sigCol}>
              <View style={S.sigLine} />
              <Text style={S.sigRole}>Customer&apos;s Signature</Text>
            </View>
            <View style={S.sigCol}>
              <View style={S.sigLine} />
              <Text style={S.sigRole}>Authorized Signatory</Text>
              <Text style={S.sigHint}>For {companyProfile?.name}</Text>
            </View>
          </View>
        </View>

        {/* ── Page Footer ─────────────────────────────────────────── */}
        <View style={S.pageFooter} fixed>
          <Text style={S.footerText}>Computer generated invoice</Text>
          <Text style={S.footerText}>Printed: {fmtDate(new Date())}</Text>
        </View>

      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(options: RenderInvoiceOptions) {
  const doc = <InvoiceDocument {...options} />;
  return await renderToBuffer(doc);
}
