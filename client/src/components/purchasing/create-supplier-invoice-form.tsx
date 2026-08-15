import { useMemo, useState, type ReactNode } from "react";
import { FileText, Link2, ReceiptText, Upload } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateSupplierInvoiceMutation,
  usePurchaseOrdersQuery,
  useUploadSupplierInvoiceAttachmentMutation,
  useSuppliersQuery,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NepaliDatePickerInput } from "@/components/ui/nepali-date-picker-input";

type CreateSupplierInvoiceFormProps = {
  onClose: () => void;
};

const today = () => new Date().toISOString().split("T")[0];

export function CreateSupplierInvoiceForm({ onClose }: CreateSupplierInvoiceFormProps) {
  const createInvoice = useCreateSupplierInvoiceMutation();
  const suppliers = useSuppliersQuery();
  const purchaseOrders = usePurchaseOrdersQuery();
  const uploadAttachment = useUploadSupplierInvoiceAttachmentMutation();
  const [document, setDocument] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    supplierId: "",
    purchaseOrderId: "",
    invoiceNumber: "",
    issueDate: today(),
    dueDate: "",
    subtotal: "",
    taxAmount: "0",
    notes: "",
  });

  const availableOrders = useMemo(
    () => purchaseOrders.data?.items.filter((order) => order.supplierId === formData.supplierId) ?? [],
    [purchaseOrders.data?.items, formData.supplierId],
  );

  const totalAmount = (Number(formData.subtotal) || 0) + (Number(formData.taxAmount) || 0);

  const setOrder = (purchaseOrderId: string) => {
    const order = purchaseOrders.data?.items.find((item) => item.id === purchaseOrderId);
    if (!order) {
      setFormData((current) => ({ ...current, purchaseOrderId }));
      return;
    }

    const taxAmount = order.lineItems.reduce((sum, item) => sum + (item.taxAmount ?? 0), 0);
    const subtotal = order.lineItems.reduce((sum, item) => sum + item.quantity * (item.unitCost ?? 0), 0);
    setFormData((current) => ({
      ...current,
      purchaseOrderId,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.supplierId || !formData.invoiceNumber.trim() || !formData.issueDate) {
      toast.error("Complete the required invoice details.");
      return;
    }

    if (Number(formData.subtotal) < 0 || Number(formData.taxAmount) < 0 || totalAmount <= 0) {
      toast.error("Enter a valid bill amount.");
      return;
    }

    try {
      const invoice = await createInvoice.mutateAsync({
        supplierId: formData.supplierId,
        purchaseOrderId: formData.purchaseOrderId || undefined,
        invoiceNumber: formData.invoiceNumber.trim(),
        issueDate: new Date(formData.issueDate).toISOString(),
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        subtotal: Number(formData.subtotal),
        taxAmount: Number(formData.taxAmount) || 0,
        totalAmount,
        notes: formData.notes.trim() || undefined,
      });

      if (document) {
        try {
          await uploadAttachment.mutateAsync({ invoiceId: invoice.id, file: document });
        } catch (uploadError) {
          toast.error("Invoice recorded, but its document was not uploaded", {
            description: getErrorMessage(uploadError),
          });
          onClose();
          return;
        }
      }

      toast.success("Supplier invoice recorded", {
        description: document
          ? `${formData.invoiceNumber.trim()} and its private document were saved.`
          : `${formData.invoiceNumber.trim()} is ready for payment tracking.`,
      });
      onClose();
    } catch (error) {
      toast.error("Invoice could not be recorded", { description: getErrorMessage(error) });
    }
  };

  return (
    <div className="space-y-6 p-6 pt-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Supplier" required>
          <select
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={formData.supplierId}
            onChange={(event) => setFormData((current) => ({
              ...current,
              supplierId: event.target.value,
              purchaseOrderId: "",
            }))}
          >
            <option value="">Select supplier</option>
            {suppliers.data?.items.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Supplier invoice number" required>
          <Input
            placeholder="e.g. VAT-2083-00124"
            value={formData.invoiceNumber}
            onChange={(event) => setFormData((current) => ({ ...current, invoiceNumber: event.target.value }))}
          />
        </Field>
      </div>

      <div className="rounded-md border bg-muted/30 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Purchase order link
        </div>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          value={formData.purchaseOrderId}
          disabled={!formData.supplierId}
          onChange={(event) => setOrder(event.target.value)}
        >
          <option value="">No purchase order (direct supplier bill)</option>
          {availableOrders.map((order) => (
            <option key={order.id} value={order.id}>
              PO #{order.id.slice(0, 8)} - {formatCurrency(order.totalAmount)}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted-foreground">
          Selecting a PO pre-fills its recorded value. You can adjust it to match the supplier bill.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bill date" required>
          <NepaliDatePickerInput
            value={formData.issueDate}
            onChange={(date) => setFormData((current) => ({ ...current, issueDate: date.toISOString().split("T")[0] }))}
          />
        </Field>
        <Field label="Payment due date">
          <NepaliDatePickerInput
            value={formData.dueDate}
            onChange={(date) => setFormData((current) => ({ ...current, dueDate: date.toISOString().split("T")[0] }))}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Taxable amount" required>
          <Input type="number" min="0" step="0.01" placeholder="0.00" value={formData.subtotal} onChange={(event) => setFormData((current) => ({ ...current, subtotal: event.target.value }))} />
        </Field>
        <Field label="VAT amount">
          <Input type="number" min="0" step="0.01" value={formData.taxAmount} onChange={(event) => setFormData((current) => ({ ...current, taxAmount: event.target.value }))} />
        </Field>
      </div>

      <div className="flex items-center justify-between rounded-md border bg-card px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-medium"><ReceiptText className="h-4 w-4 text-muted-foreground" /> Bill total</span>
        <span className="font-mono text-lg font-semibold tabular-nums">{formatCurrency(totalAmount)}</span>
      </div>

      <div className="rounded-md border border-dashed bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Original bill document</p>
            <p className="mt-1 text-xs text-muted-foreground">Optional PDF, JPG, PNG, or WebP up to 10 MB. Stored privately.</p>
          </div>
          <label className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-white/80 px-3 text-xs font-semibold hover:bg-secondary">
            <Upload className="mr-1.5 h-3.5 w-3.5" /> Choose file
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.size > 10 * 1024 * 1024) {
                  toast.error("Invoice document must be 10 MB or smaller.");
                  event.currentTarget.value = "";
                  return;
                }
                setDocument(file);
              }}
            />
          </label>
        </div>
        {document && <p className="mt-3 truncate text-xs font-medium text-foreground">{document.name}</p>}
      </div>

      <Field label="Internal notes">
        <Textarea
          className="min-h-20"
          placeholder="Payment terms, missing documents, or approval notes..."
          value={formData.notes}
          onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
        />
      </Field>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={onClose} disabled={createInvoice.isPending || uploadAttachment.isPending}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={createInvoice.isPending || uploadAttachment.isPending}>
          <FileText className="mr-2 h-4 w-4" />
          {createInvoice.isPending || uploadAttachment.isPending ? "Saving..." : "Record supplier invoice"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}{required ? " *" : ""}</span>
      {children}
    </label>
  );
}
