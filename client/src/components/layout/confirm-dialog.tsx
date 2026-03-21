import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/30 p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-2">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

