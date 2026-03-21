import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToStream, Font } from "@react-pdf/renderer";

const formatDate = (date: Date) => {
  return date.toISOString().split("T")[0];
};

// Register fonts if needed, but standard ones are usually enough for simple reports
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#333",
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 10,
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    marginBottom: 10,
    color: "#000",
    fontWeight: "bold",
  },
  companyInfo: {
    marginBottom: 20,
  },
  customerInfo: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    backgroundColor: "#f9f9f9",
    padding: 5,
  },
  table: {
    display: "flex",
    width: "auto",
    marginTop: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 5,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
  },
  col1: { width: "15%" }, // Date
  col2: { width: "15%" }, // Type
  col3: { width: "25%" }, // Reference
  col4: { width: "15%", textAlign: "right" }, // Debit
  col5: { width: "15%", textAlign: "right" }, // Credit
  col6: { width: "15%", textAlign: "right" }, // Balance
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
});

interface LedgerItem {
  date: Date;
  type: string;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
}

interface LedgerPdfProps {
  customer: any;
  ledger: LedgerItem[];
  company: any;
  period: {
    start?: Date;
    end?: Date;
  };
}

const LedgerDocument = ({ customer, ledger, company, period }: LedgerPdfProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Customer Statement</Text>
          <Text>{company.name}</Text>
          <Text>{company.address}</Text>
          <Text>VAT/PAN: {company.taxNumber}</Text>
        </View>
        <View style={{ textAlign: "right" }}>
          <Text>Date: {formatDate(new Date())}</Text>
          {period.start && period.end && (
            <Text>Period: {formatDate(period.start)} to {formatDate(period.end)}</Text>
          )}
        </View>
      </View>

      <View style={styles.customerInfo}>
        <Text style={styles.sectionTitle}>Bill To:</Text>
        <Text style={{ fontWeight: "bold" }}>{customer.name}</Text>
        <Text>{customer.address}</Text>
        <Text>Email: {customer.email || "N/A"}</Text>
        <Text>Phone: {customer.phone || "N/A"}</Text>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.col1}>Date</Text>
          <Text style={styles.col2}>Type</Text>
          <Text style={styles.col3}>Reference</Text>
          <Text style={styles.col4}>Debit (NPR)</Text>
          <Text style={styles.col5}>Credit (NPR)</Text>
          <Text style={styles.col6}>Balance (NPR)</Text>
        </View>

        {ledger.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={styles.col1}>{formatDate(item.date)}</Text>
            <Text style={styles.col2}>{item.type}</Text>
            <Text style={styles.col3}>{item.reference}</Text>
            <Text style={styles.col4}>{item.debit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.col5}>{item.credit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.col6}>{item.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: 20, textAlign: "right", borderTopWidth: 2, borderTopColor: "#333", paddingTop: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: "bold" }}>
          Closing Balance: NPR {ledger.length > 0 ? ledger[ledger.length - 1].balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00"}
        </Text>
      </View>

      <Text style={styles.footer}>
        This is a computer generated statement. For any queries, please contact {company.name}.
      </Text>
    </Page>
  </Document>
);

export async function renderLedgerPdf(props: LedgerPdfProps) {
  return await renderToStream(<LedgerDocument {...props} />);
}
