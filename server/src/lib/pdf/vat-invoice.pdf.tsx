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
  if (isEstimate) return "ESTIMATE BILL";
  if (invoiceType === "VAT") return "TAX INVOICE";
  return "INVOICE (PAN)";
}

// ─── Styles — purely black, white, and grey ─────────────────────────────────
const S = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 70, // room for fixed footer
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
    fontSize: 14,
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
    fontSize: 18,
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

  // ── Seller / Buyer Section ───────────────────────────────────────────
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  infoBlock: {
    width: "48%",
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#777777",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 2,
  },
  infoText: {
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
  tdText: { fontSize: 8.5, color: "#111111" },
  tdBold: { fontSize: 8.5, color: "#111111", fontFamily: "Helvetica-Bold" },
  tdMuted: { fontSize: 8, color: "#666666" },

  // Column widths
  cNo: { width: "5%" },
  cDesc: { width: "38%" },
  cQty: { width: "10%", textAlign: "center" },
  cRate: { width: "15%", textAlign: "right" },
  cDisc: { width: "12%", textAlign: "right" },
  cAmt: { width: "20%", textAlign: "right" },

  // ── Summary / Totals ──────────────────────────────────────────────────
  summarySection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  summaryTable: {
    width: "50%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eeeeee",
  },
  summaryLabel: { fontSize: 8.5, color: "#555555" },
  summaryValue: { fontSize: 8.5, color: "#111111", textAlign: "right" },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: "#111111",
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  totalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    textAlign: "right",
  },

  // ── Amount in Words & Extras ──────────────────────────────────────────
  wordsVal: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginTop: 16,
    textTransform: "uppercase",
  },



  signatureArea: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureLine: {
    width: "35%",
    borderTopWidth: 1,
    borderTopColor: "#111111",
    paddingTop: 6,
    alignItems: "center",
  },
  signatureText: {
    fontSize: 8,
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

  // Maths
  const subtotal = lineItems.reduce((acc: number, item: any) => {
    const qty = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const discountPct = Number(item.discountPct || 0);
    return acc + (qty * unitPrice * (1 - discountPct / 100));
  }, 0);

  const taxableAmount = subtotal;
  const vatAmount = isVat ? (taxableAmount * 0.13) : 0;
  // If the invoice already has a manual amount (Rule #3), we should try to rely on it.
  // But for rendering we use computed if they match or if this is an estimate.
  const total = subtotal + vatAmount;

  const title = getInvoiceTitle(invoiceType, isEstimate);

  const TableHeader = () => (
    <View style={S.tableHeaderRow} fixed>
      <Text style={[S.thText, S.cNo]}>No.</Text>
      <Text style={[S.thText, S.cDesc]}>Description</Text>
      <Text style={[S.thText, S.cQty]}>Qty</Text>
      <Text style={[S.thText, S.cRate]}>Unit Price</Text>
      <Text style={[S.thText, S.cDisc]}>Disc %</Text>
      <Text style={[S.thText, S.cAmt]}>Amount (NPR)</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={S.page} wrap>

        {/* ── Fixed page header ───────────────────────────────────────── */}
        <View style={S.pageHeader} fixed>
          <View>
            <Text style={S.companyName}>{companyProfile?.name}</Text>
            <Text style={S.companyMeta}>{companyProfile?.address}</Text>
            {companyProfile?.panNo ? <Text style={S.companyMeta}>PAN: {companyProfile.panNo}</Text> : null}
            {companyProfile?.vatNo ? <Text style={S.companyMeta}>VAT: {companyProfile.vatNo}</Text> : null}
            {companyProfile?.phone ? <Text style={S.companyMeta}>Tel: {companyProfile.phone}</Text> : null}
          </View>
          <View>
            <Text style={S.docTitle}>{title}</Text>
          </View>
        </View>

        {/* ── Bill To & Details ───────────────────────────────────────── */}
        <View style={S.infoGrid}>
          {/* Buyer */}
          <View style={S.infoBlock}>
            <Text style={S.infoLabel}>Bill To</Text>
            <Text style={S.infoName}>{invoice?.salesOrder?.customer?.name}</Text>
            {invoice?.salesOrder?.customer?.address && (
              <Text style={S.infoText}>{invoice.salesOrder.customer.address}</Text>
            )}
            {invoice?.salesOrder?.customer?.phone && (
              <Text style={S.infoText}>Tel: {invoice.salesOrder.customer.phone}</Text>
            )}
            {invoice?.salesOrder?.customer?.vatNo ? (
              <Text style={S.infoText}>VAT No: {invoice.salesOrder.customer.vatNo}</Text>
            ) : invoice?.salesOrder?.customer?.panNo ? (
              <Text style={S.infoText}>PAN No: {invoice.salesOrder.customer.panNo}</Text>
            ) : null}
          </View>

          {/* Invoice / Estimate details */}
          <View style={S.infoBlock}>
            <Text style={S.infoLabel}>Details</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={S.infoText}>{isEstimate ? "Estimate No:" : "Invoice No:"}</Text>
              <Text style={S.infoText}>{invoiceNumber}</Text>
            </View>
            {/* <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={S.infoText}>Fiscal Year:</Text>
              <Text style={S.infoText}>{invoice?.fiscalYear || "—"}</Text>
            </View> */}
            {invoice?.bsDate && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={S.infoText}>Miti:</Text>
                <Text style={S.infoText}>{invoice.bsDate}</Text>
              </View>
            )}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={S.infoText}>Date:</Text>
              <Text style={S.infoText}>{fmtDate(invoice?.issueDate)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={S.infoText}>Payment Mode:</Text>
              <Text style={S.infoText}>{isEstimate ? (invoice?.paymentMode || "—") : "Cash/Credit"}</Text>
            </View>
          </View>
        </View>

        {/* ── Table ───────────────────────────────────────────────────── */}
        <View style={{ minHeight: 280 }}>
          <TableHeader />

          {lineItems.map((item: any, idx: number) => {
            const qty = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice || 0);
            const discountPct = Number(item.discountPct || 0);
            const lineTotal = qty * unitPrice * (1 - discountPct / 100);

            return (
              <View style={[S.dataRow, idx % 2 === 1 ? S.dataRowAlt : {}]} key={item.id || idx}>
                <Text style={[S.tdMuted, S.cNo]}>{idx + 1}</Text>
                <View style={S.cDesc}>
                  <Text style={S.tdBold}>{item.productVariant?.product?.name}</Text>
                  {item.productVariant?.variantName && (
                    <Text style={[S.tdMuted, { marginTop: 2 }]}>
                      {item.productVariant.variantName}
                    </Text>
                  )}
                </View>
                <Text style={[S.tdText, S.cQty]}>{qty}</Text>
                <Text style={[S.tdText, S.cRate]}>{fmt(unitPrice)}</Text>
                <Text style={[S.tdMuted, S.cDisc]}>{discountPct > 0 ? `${discountPct}%` : "—"}</Text>
                <Text style={[S.tdBold, S.cAmt]}>{fmt(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* ── Totals ──────────────────────────────────────────────────── */}
        <View style={S.summarySection}>
          <View style={S.summaryTable}>
            <View style={S.summaryRow}>
              <Text style={S.summaryLabel}>Subtotal</Text>
              <Text style={S.summaryValue}>{fmt(subtotal)}</Text>
            </View>

            {isVat && (
              <>
                <View style={S.summaryRow}>
                  <Text style={S.summaryLabel}>Taxable Amount</Text>
                  <Text style={S.summaryValue}>{fmt(taxableAmount)}</Text>
                </View>
                <View style={S.summaryRow}>
                  <Text style={S.summaryLabel}>VAT (13%)</Text>
                  <Text style={S.summaryValue}>{fmt(vatAmount)}</Text>
                </View>
              </>
            )}

            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Total Amount</Text>
              <Text style={S.totalValue}>{fmt(total)}</Text>
            </View>
          </View>
        </View>

        {/* ── Words & Disclaimers ─────────────────────────────────────── */}
        <Text style={S.wordsVal}>In Words: {toEnglishWords(total)} Rupees Only</Text>



        <View style={S.signatureArea}>
          <View style={S.signatureLine}>
            <Text style={S.signatureText}>Authorized Signature</Text>
          </View>
        </View>

        {/* ── Fixed footer with page numbers ──────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            {isEstimate ? "Estimate Bill" : "Tax Document"}
          </Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `${companyProfile?.name || "Company"}  ·  Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(options: RenderInvoiceOptions) {
  const doc = <InvoiceDocument {...options} />;
  return await renderToBuffer(doc);
}
