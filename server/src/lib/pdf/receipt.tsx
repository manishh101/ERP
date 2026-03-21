import React from "react";
import { Document, Page, View, Text, StyleSheet, Font, pdf } from "@react-pdf/renderer";

Font.register({ family: "Inter", src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3i9gJ8REA.ttf" });

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, padding: 24, color: "#222" },
  header: { marginBottom: 12 },
  company: { fontSize: 14, fontWeight: 700 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  footer: { marginTop: 16, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 8 },
});

export async function renderReceiptPdfBuffer({ payment, companyProfile }: { payment: any; companyProfile: any; }) {
  const doc = (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>{companyProfile?.name ?? "Company"}</Text>
          <Text>{companyProfile?.address ?? ""}</Text>
          <Text>Receipt: {payment?.id}</Text>
        </View>

        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontWeight: 700 }}>Paid By</Text>
          <Text>{payment?.salesOrder?.customer?.name ?? payment?.supplierInvoice?.supplier?.name}</Text>
        </View>

        <View style={{ marginBottom: 8 }}>
          <View style={styles.row}>
            <Text>Amount</Text>
            <Text>{Number(payment?.amount ?? 0).toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text>Method</Text>
            <Text>{payment?.method}</Text>
          </View>
          {payment?.reference ? (
            <View style={styles.row}>
              <Text>Reference</Text>
              <Text>{payment.reference}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <Text>Processed on {payment?.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : ""}</Text>
          <Text>Thank you for your payment.</Text>
        </View>
      </Page>
    </Document>
  );

  const asPdf = pdf(doc);
  const buffer = await asPdf.toBuffer();
  return buffer;
}
