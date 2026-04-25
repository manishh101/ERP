import { Toaster } from "sonner";

export function SonnerProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        className: "border border-border bg-card text-foreground shadow-panel-lg",
        duration: 3500,
      }}
      richColors
      closeButton
    />
  );
}
