import { renderInvoicePdfBuffer } from "./src/lib/pdf/vat-invoice.pdf";
import fs from "fs";
import path from "path";

async function test() {
  const mockInvoice = {
    invoiceNumber: "INV-2080-001",
    bsDate: "2080-12-08",
    issueDate: new Date(),
    fiscalYear: "2080/81",
    taxAmount: 9100,
    invoiceAmount: 79100,
    salesOrder: {
      customer: {
        name: "Test Customer Pvt. Ltd.",
        address: "Kathmandu, Nepal",
        vatNo: "601234567"
      },
      lineItems: [
        {
          id: "1",
          quantity: 2,
          unitPrice: 35000,
          productVariant: {
            variantName: "Standard",
            hsCode: "8523.51.00",
            product: {
              name: "Solid State Drive (SSD) 1TB"
            }
          }
        }
      ]
    }
  };

  const mockCompany = {
    name: "Atlas ERP Solutions",
    address: "Baneshwor, Kathmandu",
    phone: "01-4455667",
    email: "info@atlaserp.com",
    vatNo: "302456789",
    panNo: "302456789",
    bankName: "Global IME Bank Ltd.",
    bankAccountNo: "001002003004005"
  };

  try {
    console.log("Generating Tax Invoice...");
    const taxInvoiceBuffer = await renderInvoicePdfBuffer({ 
      invoice: mockInvoice, 
      companyProfile: mockCompany,
      isEstimate: false 
    });
    fs.writeFileSync("premium-tax-invoice.pdf", taxInvoiceBuffer);
    console.log("Tax Invoice generated: premium-tax-invoice.pdf");

    console.log("Generating Estimate Bill...");
    const estimateBuffer = await renderInvoicePdfBuffer({ 
      invoice: mockInvoice, 
      companyProfile: mockCompany,
      isEstimate: true 
    });
    fs.writeFileSync("premium-estimate-bill.pdf", estimateBuffer);
    console.log("Estimate Bill generated: premium-estimate-bill.pdf");
    
    process.exit(0);
  } catch (error) {
    console.error("FATAL ERROR DURING PDF GENERATION:");
    console.error(error);
    process.exit(1);
  }
}

test();
