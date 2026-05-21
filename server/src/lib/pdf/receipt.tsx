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

// ─── Styles — professional black & white receipt ────────────────────────────
const S = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 70,
    paddingHorizontal: 44,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#000000",
    backgroundColor: "#ffffff",
  },

  // Page header
  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 2,
  },
  companyMeta: {
    fontSize: 8,
    color: "#000000",
    lineHeight: 1.5,
  },
  docTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  docMeta: {
    fontSize: 8,
    color: "#000000",
    textAlign: "right",
    marginTop: 3,
    lineHeight: 1.6,
  },

  // Info grid (Received From / Payment Details)
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
    color: "#000000",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  infoName: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginBottom: 2,
  },
  infoText: {
    fontSize: 8.5,
    color: "#000000",
    lineHeight: 1.6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },

  // Table
  tableHeaderRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
    paddingVertical: 6,
    backgroundColor: "#ffffff",
  },
  thText: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
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
  tdText: { fontSize: 8.5, color: "#000000" },
  tdBold: { fontSize: 8.5, color: "#000000", fontFamily: "Helvetica-Bold" },
  tdMuted: { fontSize: 8, color: "#000000" },

  // Column widths
  cNo: { width: "8%" },
  cDesc: { width: "42%" },
  cQty: { width: "12%", textAlign: "center" },
  cRate: { width: "18%", textAlign: "right" },
  cAmt: { width: "20%", textAlign: "right" },

  // Summary / Totals
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
  summaryLabel: { fontSize: 8.5, color: "#000000" },
  summaryValue: { fontSize: 8.5, color: "#000000", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: "#000000",
    marginTop: 2,
  },
  totalLabel: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },
  totalValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    textAlign: "right",
  },

  // Amount in words
  wordsVal: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    marginTop: 16,
    textTransform: "uppercase",
  },

  // Note box
  noteBox: {
    marginTop: 16,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  noteLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  noteText: {
    fontSize: 8.5,
    color: "#000000",
    lineHeight: 1.5,
  },

  // Signature
  signatureArea: {
    marginTop: 60,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  signatureLine: {
    width: "35%",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 6,
    alignItems: "center",
  },
  signatureText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#000000",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "center",
  },
  footerText: { fontSize: 7.5, color: "#000000" },

  // Payment status badge
  statusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: "#000000",
    alignSelf: "flex-end",
    marginTop: 4,
  },
  statusText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});

// ─── Document ───────────────────────────────────────────────────────────────
function ReceiptDocument({ payments, companyProfile }: { payments: any[]; companyProfile: any }) {
  // Use the first payment for metadata (date, method, ref, customer info)
  const primaryPayment = payments[0];
  
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const method = primaryPayment?.method ?? "—";
  const reference = primaryPayment?.reference ?? "";
  const note = primaryPayment?.note ?? "";
  const paymentDate = fmtDate(primaryPayment?.paymentDate);
  const bsDate = primaryPayment?.bsDate ?? "";

  // Determine who the payment is from/to
  const isSalesPayment = Boolean(primaryPayment?.salesOrder);
  const isSupplierPayment = Boolean(primaryPayment?.supplierInvoice || primaryPayment?.purchaseOrder);

  const partyName = isSalesPayment
    ? primaryPayment?.salesOrder?.customer?.name ?? "—"
    : primaryPayment?.supplierInvoice?.supplier?.name ?? primaryPayment?.purchaseOrder?.supplier?.name ?? "—";

  const partyAddress = isSalesPayment
    ? primaryPayment?.salesOrder?.customer?.address ?? ""
    : "";

  const partyPhone = isSalesPayment
    ? primaryPayment?.salesOrder?.customer?.phone ?? ""
    : "";

  const partyVat = isSalesPayment
    ? primaryPayment?.salesOrder?.customer?.vatNo ?? ""
    : "";
  const partyPan = isSalesPayment
    ? primaryPayment?.salesOrder?.customer?.panNo ?? ""
    : "";

  // Collect unique sales orders involved in this payment batch
  const uniqueOrders = new Map();
  if (isSalesPayment) {
    payments.forEach(p => {
      if (p.salesOrder && !uniqueOrders.has(p.salesOrder.id)) {
        uniqueOrders.set(p.salesOrder.id, p.salesOrder);
      }
    });
  }
  const orders = Array.from(uniqueOrders.values());

  // Order reference label
  let orderRef = "";
  if (isSalesPayment) {
    if (orders.length === 1) {
      orderRef = orders[0].id;
    } else if (orders.length > 1) {
      orderRef = "Multiple Orders";
    }
  } else {
    orderRef = primaryPayment?.purchaseOrder?.id ?? primaryPayment?.supplierInvoice?.invoiceNumber ?? "";
  }

  // Combine line items from all affected sales orders
  const lineItems: any[] = [];
  orders.forEach(order => {
    if (order.lineItems && Array.isArray(order.lineItems)) {
      lineItems.push(...order.lineItems);
    }
  });
  const hasLineItems = lineItems.length > 0;

  // Global Order totals across all unique orders touched
  const unifiedOrderTotal = orders.reduce((sum, o) => sum + Number(o.orderAmount ?? 0), 0);
  const unifiedBalanceDue = orders.reduce((sum, o) => sum + Number(o.balanceDue ?? 0), 0);
  
  // Previously paid = Total of what was paid towards these orders MINUS this current payment batch
  const unifiedPaidBefore = orders.reduce((sum, o) => sum + Number(o.paidAmount ?? 0), 0) - totalAmount;

  return (
    <Document>
      <Page size="A4" style={S.page} wrap>
        {/* ── Fixed page header ───────────────────────────────────── */}
        <View style={S.pageHeader} fixed>
          <View>
            <Text style={S.companyName}>{companyProfile?.name ?? "Company"}</Text>
            <Text style={S.companyMeta}>{companyProfile?.address ?? ""}</Text>
            {companyProfile?.panNo ? <Text style={S.companyMeta}>PAN: {companyProfile.panNo}</Text> : null}
            {companyProfile?.vatNo ? <Text style={S.companyMeta}>VAT: {companyProfile.vatNo}</Text> : null}
            {companyProfile?.phone ? <Text style={S.companyMeta}>Tel: {companyProfile.phone}</Text> : null}
          </View>
          <View>
            <Text style={S.docTitle}>Payment Receipt</Text>
            <Text style={S.docMeta}>Receipt No: {primaryPayment?.id?.slice(0, 12)?.toUpperCase()}</Text>
            <View style={S.statusBadge}>
              <Text style={S.statusText}>{isSalesPayment ? "Received" : "Paid"}</Text>
            </View>
          </View>
        </View>

        {/* ── Received From / Payment Details ──────────────────── */}
        <View style={S.infoGrid}>
          <View style={S.infoBlock}>
            <Text style={S.infoLabel}>{isSalesPayment ? "Received From" : "Paid To"}</Text>
            <Text style={S.infoName}>{partyName}</Text>
            {partyAddress ? <Text style={S.infoText}>{partyAddress}</Text> : null}
            {partyPhone ? <Text style={S.infoText}>Tel: {partyPhone}</Text> : null}
            {partyVat ? (
              <Text style={S.infoText}>VAT No: {partyVat}</Text>
            ) : partyPan ? (
              <Text style={S.infoText}>PAN No: {partyPan}</Text>
            ) : null}
          </View>

          <View style={S.infoBlock}>
            <Text style={S.infoLabel}>Payment Details</Text>
            <View style={S.infoRow}>
              <Text style={S.infoText}>Date (AD):</Text>
              <Text style={S.infoText}>{paymentDate}</Text>
            </View>
            {bsDate ? (
              <View style={S.infoRow}>
                <Text style={S.infoText}>Miti (BS):</Text>
                <Text style={S.infoText}>{bsDate}</Text>
              </View>
            ) : null}
            <View style={S.infoRow}>
              <Text style={S.infoText}>Payment Mode:</Text>
              <Text style={S.infoText}>{method}</Text>
            </View>
            {reference ? (
              <View style={S.infoRow}>
                <Text style={S.infoText}>Reference:</Text>
                <Text style={S.infoText}>{reference}</Text>
              </View>
            ) : null}
            {orderRef ? (
              <View style={S.infoRow}>
                <Text style={S.infoText}>{isSalesPayment ? "Order No:" : "Ref No:"}</Text>
                <Text style={S.infoText}>{orderRef}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Orders Table (for sales order payments) ───────── */}
        {isSalesPayment && payments.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <View style={S.tableHeaderRow} fixed>
              <Text style={[S.thText, { width: "8%" }]}>No.</Text>
              <Text style={[S.thText, { width: "24%" }]}>Order No</Text>
              <Text style={[S.thText, { width: "15%" }]}>Date</Text>
              <Text style={[S.thText, { width: "10%", textAlign: "center" }]}>Qty</Text>
              <Text style={[S.thText, { width: "15%", textAlign: "right" }]}>Amount</Text>
              <Text style={[S.thText, { width: "14%", textAlign: "right" }]}>Paid</Text>
              <Text style={[S.thText, { width: "14%", textAlign: "right" }]}>Balance</Text>
            </View>

            {payments.map((p: any, idx: number) => {
              const order = p.salesOrder;
              if (!order) return null;
              
              const totalQty = order.lineItems?.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0) || 0;
              const orderAmount = Number(order.orderAmount || 0);
              const paidInThisTx = Number(p.amount || 0);
              const remainingBalance = Number(order.balanceDue || 0);
              
              return (
                <View style={[S.dataRow, idx % 2 === 1 ? S.dataRowAlt : {}]} key={order.id || idx}>
                  <Text style={[S.tdMuted, { width: "8%" }]}>{idx + 1}</Text>
                  <Text style={[S.tdBold, { width: "24%" }]}>{order.id.slice(0, 12).toUpperCase()}</Text>
                  <Text style={[S.tdText, { width: "15%" }]}>{order.bsDate || fmtDate(order.orderDate)}</Text>
                  <Text style={[S.tdText, { width: "10%", textAlign: "center" }]}>{totalQty}</Text>
                  <Text style={[S.tdText, { width: "15%", textAlign: "right" }]}>{fmt(orderAmount)}</Text>
                  <Text style={[S.tdBold, { width: "14%", textAlign: "right", color: "#16a34a" }]}>{fmt(paidInThisTx)}</Text>
                  <Text style={[S.tdBold, { width: "14%", textAlign: "right", color: remainingBalance > 0 ? "#dc2626" : "#111111" }]}>{fmt(remainingBalance)}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Totals ──────────────────────────────────────────── */}
        <View style={S.summarySection}>
          <View style={S.summaryTable}>
            {isSalesPayment && (
              <>
                <View style={S.summaryRow}>
                  <Text style={S.summaryLabel}>{orders.length > 1 ? "Combined Order Total" : "Order Total"}</Text>
                  <Text style={S.summaryValue}>{fmt(unifiedOrderTotal)}</Text>
                </View>
                <View style={S.summaryRow}>
                  <Text style={S.summaryLabel}>Previously Paid</Text>
                  <Text style={S.summaryValue}>{fmt(Math.max(0, unifiedPaidBefore))}</Text>
                </View>
              </>
            )}
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>Amount {isSalesPayment ? "Received" : "Paid"}</Text>
              <Text style={S.totalValue}>{fmt(totalAmount)}</Text>
            </View>
            {hasLineItems && unifiedBalanceDue > 0 && (
              <View style={S.summaryRow}>
                <Text style={S.summaryLabel}>Balance Due</Text>
                <Text style={[S.summaryValue, { fontFamily: "Helvetica-Bold" }]}>{fmt(unifiedBalanceDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Amount in Words ─────────────────────────────────── */}
        <Text style={S.wordsVal}>In Words: {toEnglishWords(totalAmount)}</Text>

        {/* ── Note ────────────────────────────────────────────── */}
        {note ? (
          <View style={S.noteBox}>
            <Text style={S.noteLabel}>Particulars / Note</Text>
            <Text style={S.noteText}>{note}</Text>
          </View>
        ) : null}

        {/* ── Signature ───────────────────────────────────────── */}
        <View style={S.signatureArea}>
          <View style={S.signatureLine}>
            <Text style={S.signatureText}>Authorized Signature</Text>
          </View>
        </View>

        {/* ── Fixed Footer ────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            This is a computer generated receipt. Thank you for your payment.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderReceiptPdfBuffer({ payments, companyProfile }: { payments: any[]; companyProfile: any }) {
  // If a single payment was passed (for older tests), wrap it in an array
  const paymentArray = Array.isArray(payments) ? payments : [payments];
  if (paymentArray.length === 0) throw new Error("No payments provided");
  
  const doc = <ReceiptDocument payments={paymentArray} companyProfile={companyProfile} />;
  return await renderToBuffer(doc);
}
