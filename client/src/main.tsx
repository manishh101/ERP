import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/components/auth/auth-provider";
import { queryClient } from "@/lib/query-client";
import { App } from "@/app/App";
import { SonnerProvider } from "@/components/layout/sonner-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "@/styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <TooltipProvider delayDuration={300}>
          <AuthProvider>
            <App />
            <SonnerProvider />
          </AuthProvider>
        </TooltipProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
