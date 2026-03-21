import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, pdf } from "@react-pdf/renderer";
import path from "path";

Font.register({ family: "Inter", src: path.resolve(process.cwd(), "src/assets/fonts/Inter-Regular.ttf") });
import { toEnglishWords } from "../../shared/number-words.util";

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, padding: 24, color: "#222" },
  header: { marginBottom: 12 },
  company: { fontSize: 14, fontWeight: 700 },
  invoiceTitle: { fontSize: 12, fontWeight: 700, marginTop: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  tableHeader: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#ddd", paddingBottom: 6, marginTop: 12 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#f0f0f0", paddingVertical: 6 },
  colDesc: { width: "50%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "20%", textAlign: "right" },
  colTotal: { width: "20%", textAlign: "right" },
  footer: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 },
});

export async function renderInvoicePdfBuffer({ invoice, companyProfile, template }: { invoice: any; companyProfile: any; template: any; }) {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>{companyProfile?.name ?? "Company"}</Text>
          <Text>{companyProfile?.address ?? ""}</Text>
          {companyProfile?.panNo ? <Text>PAN: {companyProfile.panNo}</Text> : null}
          {companyProfile?.vatNo ? <Text>VAT: {companyProfile.vatNo}</Text> : null}
          <Text style={styles.invoiceTitle}>
            {invoice?.invoiceType === "TAX" ? "Tax Invoice" : "Invoice"} {invoice?.invoiceNumber}
          </Text>
          <View style={styles.row}>
            <Text>Issue Date: {invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : ""} (AD) / {invoice?.bsDate || ""} (BS)</Text>
            <Text>Fiscal Year: {invoice?.fiscalYear || ""}</Text>
          </View>
        </View>

        <View>
          <Text style={{ fontWeight: 700, marginBottom: 6 }}>Bill To</Text>
          <Text>{invoice?.salesOrder?.customer?.name}</Text>
          <Text>{invoice?.salesOrder?.customer?.address}</Text>
          {invoice?.salesOrder?.customer?.panNo ? <Text>PAN/VAT No: {invoice?.salesOrder?.customer?.panNo}</Text> : null}
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        {invoice?.salesOrder?.lineItems?.map((line: any) => {
          const woodFinish = line.productVariant?.woodFinish ? ` | ${line.productVariant.woodFinish}` : "";
          const fabricColor = line.productVariant?.fabricColor ? ` | ${line.productVariant.fabricColor}` : "";
          const hsCode = line.productVariant?.hsCode ? ` (HS: ${line.productVariant.hsCode})` : "";
          
          const desc = `${line.productVariant?.product?.name ?? ""}${woodFinish}${fabricColor}${hsCode}`;
          const qty = line.quantity;
          const unit = Number(line.unitPrice).toFixed(2);
          const total = (Number(line.unitPrice) * line.quantity).toFixed(2);

          return (
            <View style={styles.tableRow} key={line.id}>
              <Text style={styles.colDesc}>{desc}</Text>
              <Text style={styles.colQty}>{qty}</Text>
              <Text style={styles.colUnit}>{unit}</Text>
              <Text style={styles.colTotal}>{total}</Text>
            </View>
          );
        })}

        <View style={{ marginTop: 8 }}>
          <View style={styles.row}>
            <Text>Subtotal</Text>
            <Text>{(Number(invoice?.total ?? 0) - Number(invoice?.taxAmount ?? 0)).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Tax</Text>
            <Text>{Number(invoice?.taxAmount ?? 0).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={{ fontWeight: 700 }}>Total Amount</Text>
            <Text style={{ fontWeight: 700 }}>NPR {Number(invoice?.invoiceAmount ?? 0).toFixed(2)}</Text>
          </View>
          <View style={{ marginTop: 12, fontStyle: "italic", fontSize: 9 }}>
            <Text>In Words: {toEnglishWords(Number(invoice?.invoiceAmount ?? 0))}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>{template?.footerText ?? "Thank you for your business."}</Text>
        </View>
      </Page>
    </Document>
  );

  const asPdf = pdf(doc);
  const buffer = await asPdf.toBuffer();
  return buffer;
}
