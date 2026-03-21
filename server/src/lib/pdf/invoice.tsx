import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, pdf } from "@react-pdf/renderer";

Font.register({ family: "Inter", src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3i9gJ8REA.ttf" });

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
          {companyProfile?.taxNumber ? <Text>Tax: {companyProfile.taxNumber}</Text> : null}
          <Text style={styles.invoiceTitle}>Invoice {invoice?.invoiceNumber}</Text>
          <View style={styles.row}>
            <Text>Issue: {invoice?.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : ""}</Text>
            <Text>Due: {invoice?.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : ""}</Text>
          </View>
        </View>

        <View>
          <Text style={{ fontWeight: 700, marginBottom: 6 }}>Bill To</Text>
          <Text>{invoice?.salesOrder?.customer?.name}</Text>
          <Text>{invoice?.salesOrder?.customer?.address}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>Description</Text>
          <Text style={styles.colQty}>Qty</Text>
          <Text style={styles.colUnit}>Unit</Text>
          <Text style={styles.colTotal}>Total</Text>
        </View>

        {invoice?.salesOrder?.lineItems?.map((line: any) => {
          const desc = `${line.productVariant?.product?.name ?? ""} / ${line.productVariant?.variantName ?? ""}`;
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
            <Text style={{ fontWeight: 700 }}>Total</Text>
            <Text style={{ fontWeight: 700 }}>{Number(invoice?.total ?? 0).toFixed(2)}</Text>
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
