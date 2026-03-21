import { useCustomerLedgerQuery } from "@/hooks/use-queries";
import { useAuth } from "@/components/auth/auth-provider";
import { formatCurrency, formatEnumLabel, formatDate } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/shared/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

type CustomerLedgerModalProps = {
  customerId: string;
  customerName: string;
  onClose: () => void;
};

export function CustomerLedgerModal({ customerId, customerName, onClose }: CustomerLedgerModalProps) {
  const { token } = useAuth();
  const { data: ledger, isLoading } = useCustomerLedgerQuery(customerId);

  const handleDownloadPdf = () => {
    if (!token) return;
    // Use absolute URL with token in query for window.open
    const baseUrl = API_BASE_URL.replace(/\/$/, "");
    const url = `${baseUrl}/reports/customer-ledger/${customerId}/pdf?token=${token}`;
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-6 backdrop-blur-sm">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-[2rem]">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-6">
          <div>
            <CardTitle>Customer Statement</CardTitle>
            <CardDescription>{customerName}</CardDescription>
          </div>
          <Button variant="ghost" onClick={onClose} className="rounded-full h-8 w-8 p-0">
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[40px] w-full" />
              <Skeleton className="h-[40px] w-full" />
              <Skeleton className="h-[40px] w-full" />
            </div>
          ) : ledger && ledger.length > 0 ? (
            <div className="space-y-6">
              <DataTable
                rows={ledger}
                columns={[
                  { 
                    key: "date", 
                    header: "Date",
                    render: (row) => formatDate(row.date) 
                  },
                  { 
                    key: "type", 
                    header: "Type",
                    render: (row) => formatEnumLabel(row.type)
                  },
                  { key: "reference", header: "Reference" },
                  { 
                    key: "debit", 
                    header: "Debit", 
                    className: "text-right",
                    render: (row) => row.debit > 0 ? formatCurrency(row.debit) : "-" 
                  },
                  { 
                    key: "credit", 
                    header: "Credit", 
                    className: "text-right",
                    render: (row) => row.credit > 0 ? formatCurrency(row.credit) : "-" 
                  },
                  { 
                    key: "balance", 
                    header: "Balance", 
                    className: "text-right font-semibold",
                    render: (row) => formatCurrency(row.balance) 
                  },
                ]}
              />
              
              <div className="flex justify-end pt-4">
                <div className="text-right">
                  <p className="text-sm text-stone-500 uppercase tracking-wider">Closing Balance</p>
                  <p className="text-2xl font-display mt-1">
                    {formatCurrency(ledger[ledger.length - 1].balance)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center">
              <p className="text-stone-500">No transactions found for this customer.</p>
            </div>
          )}
        </CardContent>

        <CardHeader className="border-t pt-4 flex gap-3 flex-row justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleDownloadPdf} disabled={!ledger || ledger.length === 0}>
            Download PDF Statement
          </Button>
        </CardHeader>
      </Card>
    </div>
  );
}
