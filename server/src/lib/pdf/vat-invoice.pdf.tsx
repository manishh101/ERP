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
  if (isEstimate || invoiceType === "ESTIMATE") return "ESTIMATE BILL";
  if (invoiceType === "VAT") return "TAX INVOICE";
  return "INVOICE (PAN)";
}

// ─── Precise Classic Grid Styles matching reference screenshot ──────────────
const S = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 35,
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
    backgroundColor: "#ffffff",
  },

  /* ── Header Section ──────────────────────────────────────────────────── */
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  
  companySection: {
    maxWidth: "60%",
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Times-Bold",
    color: "#000000",
    marginBottom: 3,
  },
  companyDetail: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
    lineHeight: 1.35,
  },
  
  titleSection: {
    alignItems: "flex-end",
  },
  titleText: {
    fontSize: 18,
    fontFamily: "Times-Bold",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  titleUnderline: {
    borderBottomWidth: 1.5,
    borderBottomColor: "#000000",
    marginTop: 2,
    width: "100%",
  },

  headerRule: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    marginTop: 8,
    marginBottom: 14,
  },

  /* ── Bill-To & Meta Section ─────────────────────────────────────────── */
  infoSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  
  infoCol: {
    width: "55%",
  },
  
  metaCol: {
    width: "42%",
  },
  
  billToLabel: {
    fontSize: 10,
    fontFamily: "Times-BoldItalic",
    color: "#000000",
    marginBottom: 4,
  },
  
  partyName: {
    fontSize: 10,
    fontFamily: "Times-Bold",
    color: "#000000",
    marginBottom: 3,
  },
  
  infoText: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
    lineHeight: 1.35,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },
  
  metaLabel: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
    width: "42%",
  },
  
  metaColon: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
    width: "8%",
    textAlign: "center",
  },

  metaValue: {
    fontSize: 9.5,
    fontFamily: "Times-Bold",
    color: "#000000",
    width: "50%",
  },

  /* ── Full Grid Table Section ────────────────────────────────────────── */
  table: {
    borderWidth: 1,
    borderColor: "#000000",
    marginBottom: 14,
  },
  
  tableHead: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    minHeight: 22,
    backgroundColor: "#ffffff",
  },
  
  thCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
  },

  thText: {
    fontSize: 8.5,
    fontFamily: "Times-Bold",
    color: "#000000",
    textTransform: "uppercase",
  },
  
  tr: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    minHeight: 22,
  },
  
  trLast: {
    borderBottomWidth: 0,
  },
  
  tdCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
  },
  
  tdText: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
    lineHeight: 1.3,
  },
  
  tdSub: {
    fontSize: 7.5,
    fontFamily: "Times-Italic",
    color: "#444444",
    marginTop: 1,
  },

  cellLast: {
    borderRightWidth: 0,
  },

  // Exact Column widths
  cNo:   { width: "6%" },
  cDesc: { width: "44%" },
  cQty:  { width: "10%" },
  cUnit: { width: "10%" },
  cRate: { width: "15%" },
  cAmt:  { width: "15%" },

  /* ── Totals Table Section ───────────────────────────────────────────── */
  totalsArea: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 14,
  },
  
  totalsBox: {
    width: "48%",
    borderWidth: 1,
    borderColor: "#000000",
  },
  
  totalsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    minHeight: 20,
  },
  
  totalsRowLast: {
    borderBottomWidth: 0,
  },
  
  totalsLabelCell: {
    width: "52%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRightWidth: 1,
    borderRightColor: "#000000",
    justifyContent: "center",
  },

  totalsValueCell: {
    width: "48%",
    paddingVertical: 4,
    paddingHorizontal: 6,
    justifyContent: "center",
  },

  totalsLabelText: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
  },

  totalsLabelBoldText: {
    fontSize: 9.5,
    fontFamily: "Times-Bold",
    color: "#000000",
  },
  
  totalsValueText: {
    fontSize: 9,
    fontFamily: "Times-Roman",
    color: "#000000",
    textAlign: "right",
  },

  totalsValueBoldText: {
    fontSize: 9.5,
    fontFamily: "Times-Bold",
    color: "#000000",
    textAlign: "right",
  },

  /* ── Amount in Words ────────────────────────────────────────────────── */
  wordsContainer: {
    marginBottom: 16,
  },
  
  wordsLabel: {
    fontSize: 9.5,
    fontFamily: "Times-Bold",
    color: "#000000",
    marginBottom: 2,
  },
  
  wordsText: {
    fontSize: 9.5,
    fontFamily: "Times-Italic",
    color: "#000000",
  },

  /* ── Terms & Conditions Box ─────────────────────────────────────────── */
  termsBox: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 8,
    marginBottom: 24,
  },
  
  termsTitle: {
    fontSize: 9,
    fontFamily: "Times-Bold",
    color: "#000000",
    marginBottom: 4,
  },
  
  termLine: {
    fontSize: 8.5,
    fontFamily: "Times-Roman",
    color: "#000000",
    lineHeight: 1.35,
    marginBottom: 1,
  },

  /* ── Signatures Section ─────────────────────────────────────────────── */
  sigArea: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  
  sigCol: {
    width: "40%",
    alignItems: "center",
  },
  
  sigTitle: {
    fontSize: 9.5,
    fontFamily: "Times-Bold",
    color: "#000000",
    marginBottom: 35,
  },
  
  sigLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    marginBottom: 4,
  },
  
  sigSubtext: {
    fontSize: 8.5,
    fontFamily: "Times-Roman",
    color: "#000000",
  },

  /* ── Footer ─────────────────────────────────────────────────────────── */
  pageFooter: {
    position: "absolute",
    bottom: 20,
    left: 35,
    right: 35,
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  
  footerLeft: {
    fontSize: 7.5,
    fontFamily: "Times-Roman",
    color: "#000000",
  },
  
  footerCompany: {
    fontSize: 7.5,
    fontFamily: "Times-Bold",
    color: "#000000",
    textTransform: "uppercase",
    marginTop: 1,
  },

  footerRight: {
    fontSize: 7.5,
    fontFamily: "Times-Roman",
    color: "#000000",
    textAlign: "right",
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

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={S.topBar}>
          <View style={S.companySection}>
            <Text style={S.companyName}>{companyProfile?.name || "Shree Manish Steel Furniture Udhyog Pvt. Ltd."}</Text>
            {companyProfile?.address && (
              <Text style={S.companyDetail}>{companyProfile.address}</Text>
            )}
            {companyProfile?.phone && (
              <Text style={S.companyDetail}>Tel: {companyProfile.phone}</Text>
            )}
            {companyProfile?.email && (
              <Text style={S.companyDetail}>Email: {companyProfile.email}</Text>
            )}
            {companyProfile?.panNo && (
              <Text style={S.companyDetail}>PAN: {companyProfile.panNo}</Text>
            )}
            {companyProfile?.vatNo && (
              <Text style={S.companyDetail}>VAT: {companyProfile.vatNo}</Text>
            )}
          </View>
          
          <View style={S.titleSection}>
            <Text style={S.titleText}>{title}</Text>
            <View style={S.titleUnderline} />
          </View>
        </View>

        {/* Full-width divider rule under header */}
        <View style={S.headerRule} />

        {/* ── Bill-To & Invoice Meta Section ─────────────────────── */}
        <View style={S.infoSection}>
          <View style={S.infoCol}>
            <Text style={S.billToLabel}>Bill To :</Text>
            <Text style={S.partyName}>{customer?.name || "—"}</Text>
            {customer?.address && (
              <Text style={S.infoText}>{customer.address}</Text>
            )}
            {customer?.panNo ? (
              <Text style={S.infoText}>PAN: {customer.panNo}</Text>
            ) : customer?.vatNo ? (
              <Text style={S.infoText}>VAT: {customer.vatNo}</Text>
            ) : null}
          </View>

          <View style={S.metaCol}>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>{isEstimate ? "Estimate No." : "Invoice No."}</Text>
              <Text style={S.metaColon}>:</Text>
              <Text style={S.metaValue}>{invoiceNumber || "—"}</Text>
            </View>
            {invoice?.bsDate && (
              <View style={S.metaRow}>
                <Text style={S.metaLabel}>M.S. (BS)</Text>
                <Text style={S.metaColon}>:</Text>
                <Text style={S.metaValue}>{invoice.bsDate}</Text>
              </View>
            )}
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Issue Date</Text>
              <Text style={S.metaColon}>:</Text>
              <Text style={S.metaValue}>{fmtDate(invoice?.issueDate)}</Text>
            </View>
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Payment Terms</Text>
              <Text style={S.metaColon}>:</Text>
              <Text style={S.metaValue}>
                {invoice?.paymentMode || "Cash/Credit"}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Line Items Table ───────────────────────────────────── */}
        <View style={S.table}>
          <View style={S.tableHead}>
            <View style={[S.thCell, S.cNo]}>
              <Text style={[S.thText, { textAlign: "center" }]}>S.N.</Text>
            </View>
            <View style={[S.thCell, S.cDesc]}>
              <Text style={[S.thText, { textAlign: "left" }]}>DESCRIPTION</Text>
            </View>
            <View style={[S.thCell, S.cQty]}>
              <Text style={[S.thText, { textAlign: "center" }]}>QTY</Text>
            </View>
            <View style={[S.thCell, S.cUnit]}>
              <Text style={[S.thText, { textAlign: "center" }]}>UNIT</Text>
            </View>
            <View style={[S.thCell, S.cRate]}>
              <Text style={[S.thText, { textAlign: "right" }]}>RATE (NPR)</Text>
            </View>
            <View style={[S.thCell, S.cAmt, S.cellLast]}>
              <Text style={[S.thText, { textAlign: "right" }]}>AMOUNT (NPR)</Text>
            </View>
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
              <View 
                style={[
                  S.tr, 
                  isLast ? S.trLast : {}
                ]} 
                key={item.id || idx}
              >
                <View style={[S.tdCell, S.cNo]}>
                  <Text style={[S.tdText, { textAlign: "center" }]}>{idx + 1}</Text>
                </View>
                <View style={[S.tdCell, S.cDesc]}>
                  <Text style={S.tdText}>
                    {item.productVariant?.product?.name ?? item.customProductName ?? "Item"}
                  </Text>
                  {item.productVariant?.variantName &&
                   item.productVariant.variantName !== "Default" &&
                   item.productVariant.variantName.toLowerCase() !== "standard" && (
                    <Text style={S.tdSub}>
                      Variant: {item.productVariant.variantName}
                    </Text>
                  )}
                  {discAmt > 0 && (
                    <Text style={S.tdSub}>
                      Discount: {discountPct > 0 ? `${discountPct}%` : `NPR ${fmt(discAmt)}`}
                    </Text>
                  )}
                </View>
                <View style={[S.tdCell, S.cQty]}>
                  <Text style={[S.tdText, { textAlign: "center" }]}>{qty}</Text>
                </View>
                <View style={[S.tdCell, S.cUnit]}>
                  <Text style={[S.tdText, { textAlign: "center" }]}>{unit}</Text>
                </View>
                <View style={[S.tdCell, S.cRate]}>
                  <Text style={[S.tdText, { textAlign: "right" }]}>{fmt(unitPrice)}</Text>
                </View>
                <View style={[S.tdCell, S.cAmt, S.cellLast]}>
                  <Text style={[S.tdText, { textAlign: "right" }]}>{fmt(lineTotal)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <View style={{ marginTop: "auto" }}>
          {/* ── Totals Box ────────────────────────────────────────── */}
          <View style={S.totalsArea}>
            <View style={S.totalsBox}>
              <View style={S.totalsRow}>
                <View style={S.totalsLabelCell}>
                  <Text style={S.totalsLabelText}>Subtotal</Text>
                </View>
                <View style={S.totalsValueCell}>
                  <Text style={S.totalsValueText}>NPR {fmt(subtotal)}</Text>
                </View>
              </View>
              {isVat && (
                <>
                  <View style={S.totalsRow}>
                    <View style={S.totalsLabelCell}>
                      <Text style={S.totalsLabelText}>Taxable Amount</Text>
                    </View>
                    <View style={S.totalsValueCell}>
                      <Text style={S.totalsValueText}>NPR {fmt(taxableAmount)}</Text>
                    </View>
                  </View>
                  <View style={S.totalsRow}>
                    <View style={S.totalsLabelCell}>
                      <Text style={S.totalsLabelText}>VAT @ 13%</Text>
                    </View>
                    <View style={S.totalsValueCell}>
                      <Text style={S.totalsValueText}>NPR {fmt(vatAmount)}</Text>
                    </View>
                  </View>
                </>
              )}
              <View style={[S.totalsRow, S.totalsRowLast]}>
                <View style={S.totalsLabelCell}>
                  <Text style={S.totalsLabelBoldText}>Grand Total</Text>
                </View>
                <View style={S.totalsValueCell}>
                  <Text style={S.totalsValueBoldText}>NPR {fmt(total)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Amount in Words ──────────────────────────────────── */}
          <View style={S.wordsContainer}>
            <Text style={S.wordsLabel}>Amount in Words:</Text>
            <Text style={S.wordsText}>{toEnglishWords(total)}</Text>
          </View>

          {/* ── Terms & Conditions Box ────────────────────────────── */}
          <View style={S.termsBox}>
            <Text style={S.termsTitle}>Terms & Conditions:</Text>
            <Text style={S.termLine}>• Goods once sold will not be taken back or exchanged.</Text>
            <Text style={S.termLine}>• Payment is due as per agreed terms.</Text>
            <Text style={S.termLine}>• E. & O.E. – Errors & Omissions Excepted.</Text>
            {isEstimate && (
              <Text style={S.termLine}>• This is an estimate only. Final invoice may vary.</Text>
            )}
          </View>

          {/* ── Signatures ───────────────────────────────────────── */}
          <View style={S.sigArea}>
            <View style={S.sigCol}>
              <Text style={S.sigTitle}>Customer's Signature</Text>
              <View style={S.sigLine} />
              <Text style={S.sigSubtext}>Date: ___________________</Text>
            </View>
            <View style={S.sigCol}>
              <Text style={S.sigTitle}>Authorized Signatory</Text>
              <View style={S.sigLine} />
              <Text style={S.sigSubtext}>For {companyProfile?.name || "Shree Manish Steel Furniture Udhyog Pvt. Ltd."}</Text>
            </View>
          </View>
        </View>

        {/* ── Footer ────────────────────────────────────────────── */}
        <View style={S.pageFooter} fixed>
          <View>
            <Text style={S.footerLeft}>Computer generated {title.toLowerCase()}.</Text>
            <Text style={S.footerCompany}>{(companyProfile?.name || "SHREE MANISH STEEL FURNITURE UDHYOG PVT. LTD.").toUpperCase()}</Text>
          </View>
          <View>
            <Text style={S.footerRight}>Printed: {fmtDate(new Date())}</Text>
            <Text style={S.footerRight}>Page 1 of 1</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}

export async function renderInvoicePdfBuffer(options: RenderInvoiceOptions) {
  const doc = <InvoiceDocument {...options} />;
  return await renderToBuffer(doc);
}


