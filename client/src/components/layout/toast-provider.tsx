import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Toast = {
  id: number;
  title: string;
  description: string;
};

const ToastContext = createContext<{ push: (title: string, description: string) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const value = useMemo(
    () => ({
      push: (title: string, description: string) => {
        const id = Date.now();
        setToasts((current) => [...current, { id, title, description }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 3200);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex w-[340px] flex-col gap-3">
        {toasts.map((toast) => (
          <Card key={toast.id} className="border-stone-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{toast.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
              </div>
              <Button variant="ghost" className="h-auto px-2 py-1 text-xs" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))}>
                Close
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
