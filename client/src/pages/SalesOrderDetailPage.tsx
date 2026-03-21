import { useParams, Link } from "react-router-dom";
import { 
  useSalesOrdersQuery, 
  useConfirmSalesOrderMutation, 
  useCancelSalesOrderMutation,
  useRecordSalesOrderDepositMutation,
  useUpdateSalesOrderStatusMutation
} from "@/hooks/use-queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  Truck, 
  Printer, 
  FileText 
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { RecordDepositModal } from "@/components/sales/record-deposit-modal";

export function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: orders, isLoading } = useSalesOrdersQuery();
  const order = orders?.items.find((o) => o.id === id);

  const confirmMutation = useConfirmSalesOrderMutation();
  const cancelMutation = useCancelSalesOrderMutation();
  const depositMutation = useRecordSalesOrderDepositMutation();
  const statusMutation = useUpdateSalesOrderStatusMutation();

  const [depositModalOpen, setDepositModalOpen] = useState(false);

  if (isLoading) return <div className="p-8">Loading order details...</div>;
  if (!order) return <div className="p-8 text-destructive">Order not found.</div>;

  const handleConfirm = () => confirmMutation.mutate(order.id);
  const handleCancel = () => cancelMutation.mutate(order.id);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/sales">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order {order.id}</h1>
            <p className="text-muted-foreground">{order.customer}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {order.rawStatus === "DRAFT" && (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending}>
                <XCircle className="mr-2 h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={confirmMutation.isPending}>
                <CheckCircle className="mr-2 h-4 w-4" /> Confirm Order
              </Button>
            </>
          )}
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge tone={order.rawStatus === "CANCELLED" ? "red" : "amber"}>
                  {order.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivery Date</p>
                <p>{order.deliveryDate}</p>
              </div>
            </div>

            {order.isCustomOrder && (
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h3 className="font-semibold text-primary mb-2 flex items-center">
                  <FileText className="mr-2 h-4 w-4" /> Custom Furniture Order
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground">Expected Ready Date</p>
                    <p>{order.expectedReadyDate ?? "Not set"}</p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Floor</p>
                    <p>{order.deliveryFloor ?? "Ground"}</p>
                  </div>
                </div>
                {order.assemblyNotes && (
                  <div className="mt-2 text-sm">
                    <p className="font-medium text-muted-foreground">Assembly Notes</p>
                    <p>{order.assemblyNotes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-4 text-lg">Financial Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-md text-center">
                  <p className="text-xs text-muted-foreground uppercase">Total Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(order.total)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-md text-center">
                  <p className="text-xs text-green-600 uppercase">Paid Amount</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(order.paidAmount)}</p>
                </div>
                <div className="p-3 bg-red-50 rounded-md text-center">
                  <p className="text-xs text-red-600 uppercase">Balance Due</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(order.balanceDue)}</p>
                </div>
              </div>

              {order.balanceDue > 0 && (
                <div className="mt-6 flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                  <div>
                    <p className="text-sm font-medium">Capture Payment</p>
                    <p className="text-xs text-muted-foreground italic">Record deposits or full payments against balance.</p>
                  </div>
                  <Button onClick={() => setDepositModalOpen(true)}>
                    <DollarSign className="mr-2 h-4 w-4" /> Record Deposit
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-semibold text-lg">{order.customer}</p>
              <Button variant="link" className="px-0 h-auto" asChild>
                <Link to={`/sales`}>View Customer History</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button variant="outline" className="justify-start">
                <Truck className="mr-2 h-4 w-4" /> Schedule Delivery
              </Button>
              <Button variant="outline" className="justify-start">
                <FileText className="mr-2 h-4 w-4" /> Create Tax Invoice
              </Button>
              <Button variant="outline" className="justify-start text-destructive hover:bg-destructive/10 hover:text-destructive">
                <XCircle className="mr-2 h-4 w-4" /> Void Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {depositModalOpen && (
        <RecordDepositModal 
          orderId={order.id}
          orderNumber={order.id}
          onClose={() => setDepositModalOpen(false)}
        />
      )}
    </div>
  );
}
