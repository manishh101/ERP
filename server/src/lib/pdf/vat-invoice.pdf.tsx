import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import path from "path";
import fs from "fs";
import { toEnglishWords } from "../../shared/number-words.util";

// Font registration with fallback
let fontLoaded = false;
try {
  const fontPath = path.join(__dirname, "../../assets/fonts/Inter-Regular.ttf");
  if (fs.existsSync(fontPath)) {
    Font.register({
      family: "Inter",
      src: fontPath,
    });
    fontLoaded = true;
  } else {
    console.warn("Font file not found at:", fontPath);
  }
} catch (e: any) {
  console.warn("Font registration failed:", e.message);
}

const fontFamily = fontLoaded ? "Inter" : "Helvetica";

const styles = StyleSheet.create({
  page: {
    fontFamily,
    fontSize: 9,
    padding: 30,
    color: "#333",
    lineHeight: 1.4,
  },

  // Header banner
  headerBanner: {
    padding: "15 20",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  subHeaderTitle: {
    fontSize: 8,
    marginTop: 4,
    opacity: 0.8,
  },

  // Estimate watermark
  estimateWatermark: {
    position: "absolute",
    top: "40%",
    left: "15%",
    fontSize: 60,
    color: "#e0e0e0",
    opacity: 0.15,
    transform: "rotate(-30deg)",
    fontWeight: "bold",
    letterSpacing: 8,
  },

  // Info Sections
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  infoBlock: {
    width: "30%",
  },
  infoLabel: {
    fontSize: 8,
    color: "#666",
    textTransform: "uppercase",
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#000",
  },
  infoSubValue: {
    fontSize: 9,
    color: "#444",
    marginTop: 2,
  },

  // Table Styles
  table: {
    marginTop: 10,
    borderWidth: 0,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    padding: "8 4",
    fontWeight: "bold",
    color: "#475569",
    fontSize: 8,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    padding: "8 4",
    alignItems: "center",
  },
  colNo: { width: "5%" },
  colDesc: { width: "32%" },
  colHS: { width: "12%", textAlign: "center" },
  colQty: { width: "8%", textAlign: "center" },
  colUnit: { width: "13%", textAlign: "right" },
  colDisc: { width: "10%", textAlign: "center" },
  colAmount: { width: "20%", textAlign: "right" },

  // Summary and Totals
  summarySection: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
  },
  summaryTable: {
    width: "40%",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "8 10",
    marginTop: 8,
    borderRadius: 4,
    fontWeight: "bold",
    fontSize: 12,
  },

  // Footer and Compliance
  footerSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  amountInWords: {
    width: "60%",
    fontSize: 9,
    fontStyle: "italic",
    color: "#4a5568",
  },
  paymentDetails: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  signatureArea: {
    marginTop: 40,
    width: "30%",
    alignItems: "center",
  },
  signatureLine: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#333",
    marginTop: 10,
    paddingTop: 5,
    textAlign: "center",
    fontSize: 8,
    textTransform: "uppercase",
  },
  complianceNotes: {
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  noteItem: {
    fontSize: 7,
    color: "#718096",
  },
  // Copy designation section (IRD requirement)
  copySection: {
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingTop: 8,
  },
  copyItem: {
    fontSize: 7,
    color: "#888",
    textAlign: "center",
  },
});

// Format number in Indian/Nepali style
function formatNPR(amount: number): string {
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Get invoice title based on type and mode
function getInvoiceTitle(invoiceType: string, isEstimate: boolean): string {
  if (isEstimate) {
    return "ESTIMATE BILL";
  }
  if (invoiceType === "VAT") {
    return "TAX INVOICE";
  }
  // PAN bill
  return "INVOICE (PAN)";
}

interface RenderInvoiceOptions {
  invoice: any;
  companyProfile: any;
  template?: any;
  isEstimate?: boolean;
}

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

  // Compute totals by summing line items to ensure mathematical consistency
  const subtotal = lineItems.reduce((acc: number, item: any) => {
    const qty = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const discountPct = Number(item.discountPct || 0);
    return acc + (qty * unitPrice * (1 - discountPct / 100));
  }, 0);
  const taxableAmount = subtotal;
  const vatAmount = isVat ? (taxableAmount * 0.13) : 0;
  const total = subtotal + vatAmount;

  // Title based on type
  const title = getInvoiceTitle(invoiceType, isEstimate);

  // Header colors
  const headerBg = "#ffffff";
  const headerColor = "#000000";
  const totalRowBg = isEstimate ? "#f1f5f9" : "#e2e8f0";
  const totalRowColor = "#000000";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Estimate watermark */}
        {isEstimate && (
          <Text style={styles.estimateWatermark}>ESTIMATE</Text>
        )}

        {/* Header */}
        <View style={{ ...styles.headerBanner, backgroundColor: headerBg, color: headerColor, borderBottomWidth: 2, borderBottomColor: "#1e293b", padding: "10 0", borderRadius: 0 }}>
          <View>
            <Text style={styles.headerTitle}>{companyProfile?.name ?? "Company Name"}</Text>
            <Text style={styles.subHeaderTitle}>
              {title}
            </Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={{ fontSize: 11 }}>
              {isEstimate ? `EST-${invoice?.invoiceNumber?.replace("INV-", "") || ""}` : invoice?.invoiceNumber}
            </Text>
            <Text style={{ fontSize: 8, marginTop: 4 }}>
              Date: {invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : ""}
            </Text>
            <Text style={{ fontSize: 8, marginTop: 2 }}>
              Fiscal Year: {invoice?.fiscalYear ?? ""}
            </Text>
          </View>
        </View>

        {/* Seller, Buyer, and Details Info */}
        <View style={styles.infoGrid}>
          {/* Seller */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>SELLER</Text>
            <Text style={styles.infoValue}>{companyProfile?.name}</Text>
            <Text style={styles.infoSubValue}>{companyProfile?.address}</Text>
            <Text style={styles.infoSubValue}>Tel: {companyProfile?.phone || "N/A"}</Text>
            <Text style={styles.infoSubValue}>Email: {companyProfile?.email || "N/A"}</Text>
            {/* IRD Compliance: Seller's VAT/PAN must be displayed */}
            {companyProfile?.vatNo && (
              <Text style={{ ...styles.infoSubValue, fontWeight: "bold", marginTop: 4 }}>
                VAT No: {companyProfile.vatNo}
              </Text>
            )}
            {companyProfile?.panNo && (
              <Text style={{ ...styles.infoSubValue, fontWeight: "bold", marginTop: companyProfile?.vatNo ? 0 : 4 }}>
                PAN No: {companyProfile.panNo}
              </Text>
            )}
          </View>

          {/* Buyer */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>BUYER</Text>
            <Text style={styles.infoValue}>{invoice?.salesOrder?.customer?.name}</Text>
            <Text style={styles.infoSubValue}>{invoice?.salesOrder?.customer?.address}</Text>
            {invoice?.salesOrder?.customer?.vatNo ? (
              <Text style={{ ...styles.infoSubValue, fontWeight: "bold", marginTop: 4 }}>
                VAT No: {invoice.salesOrder.customer.vatNo}
              </Text>
            ) : invoice?.salesOrder?.customer?.panNo ? (
              <Text style={{ ...styles.infoSubValue, fontWeight: "bold", marginTop: 4 }}>
                PAN No: {invoice.salesOrder.customer.panNo}
              </Text>
            ) : (
              <Text style={styles.infoSubValue}>VAT/PAN: Not applicable</Text>
            )}
          </View>

          {/* Document Details */}
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>DETAILS</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={{ color: "#666", fontSize: 8 }}>
                {isEstimate ? "Estimate No:" : "Invoice No:"}
              </Text>
              <Text style={{ fontWeight: "bold", fontSize: 9 }}>
                {isEstimate ? `EST-${invoice?.invoiceNumber?.replace("INV-", "") || ""}` : invoice?.invoiceNumber}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={{ color: "#666", fontSize: 8 }}>Date (BS):</Text>
              <Text style={{ fontSize: 9 }}>{invoice?.bsDate || "N/A"}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={{ color: "#666", fontSize: 8 }}>Date (AD):</Text>
              <Text style={{ fontSize: 9 }}>
                {invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : "N/A"}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
              <Text style={{ color: "#666", fontSize: 8 }}>Fiscal Year:</Text>
              <Text style={{ fontSize: 9 }}>{invoice?.fiscalYear || "N/A"}</Text>
            </View>
            {isEstimate && (
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 2 }}>
                <Text style={{ color: "#666", fontSize: 8 }}>Valid Until:</Text>
                <Text style={{ fontSize: 9, color: "#c53030" }}>30 days</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colNo}>#</Text>
            <Text style={styles.colDesc}>DESCRIPTION</Text>
            <Text style={styles.colHS}>HS CODE</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colUnit}>UNIT PRICE</Text>
            <Text style={styles.colDisc}>DISC %</Text>
            <Text style={styles.colAmount}>AMOUNT (NPR)</Text>
          </View>

          {lineItems.map((item: any, idx: number) => {
            const qty = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice || 0);
            const discountPct = Number(item.discountPct || 0);
            const lineTotal = qty * unitPrice * (1 - discountPct / 100);

            return (
              <View style={styles.tableRow} key={item.id || idx}>
                <Text style={styles.colNo}>{idx + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={{ fontWeight: "bold" }}>
                    {item.productVariant?.product?.name}
                  </Text>
                  <Text style={{ fontSize: 7, color: "#666", marginTop: 2 }}>
                    Variant: {item.productVariant?.variantName || "Standard"}
                  </Text>
                </View>
                <Text style={styles.colHS}>
                  {item.productVariant?.hsCode || "—"}
                </Text>
                <Text style={styles.colQty}>{qty}</Text>
                <Text style={styles.colUnit}>{formatNPR(unitPrice)}</Text>
                <Text style={styles.colDisc}>
                  {discountPct > 0 ? `${discountPct}%` : "—"}
                </Text>
                <Text style={styles.colAmount}>{formatNPR(lineTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Summary / Totals */}
        <View style={styles.summarySection}>
          <View style={styles.summaryTable}>
            <View style={styles.summaryRow}>
              <Text style={{ color: "#666" }}>Subtotal</Text>
              <Text>NPR {formatNPR(subtotal)}</Text>
            </View>

            {/* Show VAT breakdown only for VAT invoices, not estimates or PAN bills */}
            {isVat && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={{ color: "#666" }}>Taxable Amount</Text>
                  <Text>NPR {formatNPR(taxableAmount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={{ color: "#666" }}>VAT (13%)</Text>
                  <Text>NPR {formatNPR(vatAmount)}</Text>
                </View>
              </>
            )}

            <View style={{ ...styles.totalRow, backgroundColor: totalRowBg, color: totalRowColor }}>
              <Text>{isEstimate ? "Estimated Total" : "Total Amount"}</Text>
              <Text>NPR {formatNPR(total)}</Text>
            </View>
          </View>
        </View>

        {/* Amount in Words + Payment Details + Signature */}
        <View style={{ marginTop: 20 }}>
          <Text style={styles.amountInWords}>
            AMOUNT IN WORDS: {toEnglishWords(total)}
          </Text>

          <View style={styles.footerSection}>
            <View style={{ width: "60%" }}>
              {!isEstimate && (
                <View style={styles.paymentDetails}>
                  <Text style={{ fontWeight: "bold", fontSize: 8, color: "#475569", marginBottom: 4 }}>
                    PAYMENT DETAILS
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    Bank: {companyProfile?.bankName || companyProfile?.bankDetails || "N/A"}
                  </Text>
                  <Text style={{ fontSize: 9 }}>
                    A/C No: {companyProfile?.bankAccountNo || "N/A"}
                  </Text>
                </View>
              )}
              {isEstimate && (
                <View style={{ padding: 10, backgroundColor: "#fffbeb", borderRadius: 4, borderWidth: 1, borderColor: "#fbbf24" }}>
                  <Text style={{ fontWeight: "bold", fontSize: 8, color: "#92400e", marginBottom: 4 }}>
                    ESTIMATE DISCLAIMER
                  </Text>
                  <Text style={{ fontSize: 8, color: "#78350f" }}>
                    This is an estimate, not a tax document. Prices are subject to change.
                  </Text>
                  <Text style={{ fontSize: 8, color: "#78350f", marginTop: 2 }}>
                    Valid for 30 days from the date of issue. Contact us for a final quote.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.signatureArea}>
              <View style={styles.signatureLine}>
                <Text>Authorized Signature</Text>
                <Text style={{ fontSize: 6, opacity: 0.6, marginTop: 4 }}>Stamp & Signature</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Area removed as requested */}

        {/* Compliance Notes */}
        <View style={styles.complianceNotes}>
          {isEstimate ? (
            <>
              <Text style={styles.noteItem}>• This is not a tax document</Text>
              <Text style={styles.noteItem}>• Estimate valid for 30 days</Text>
              <Text style={styles.noteItem}>• Prices subject to change</Text>
            </>
          ) : (
            <>
              <Text style={styles.noteItem}>• IRD-compliant format</Text>
              <Text style={styles.noteItem}>• Serial no. starting from 001 per fiscal year</Text>
              <Text style={styles.noteItem}>
                {isVat ? "• Duplicate/triplicate copies required" : "• PAN invoice — no VAT applicable"}
              </Text>
            </>
          )}
        </View>
      </Page>
    </Document>
  );
}

/**
 * Render the invoice PDF to a Buffer.
 * Uses renderToBuffer (the correct server-side API for @react-pdf/renderer v3).
 */
export async function renderInvoicePdfBuffer(options: RenderInvoiceOptions) {
  const doc = <InvoiceDocument {...options} />;
  return await renderToBuffer(doc);
}
