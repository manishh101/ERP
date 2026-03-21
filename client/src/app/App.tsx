import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { AccountingPage } from "@/pages/AccountingPage";
import ArLedgerPage from "@/pages/ArLedgerPage";
import VatRegisterPage from "@/pages/VatRegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DeliveryPage } from "@/pages/DeliveryPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { InvoicingPage } from "@/pages/InvoicingPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { PurchasingPage } from "@/pages/PurchasingPage";
import { ReportingPage } from "@/pages/ReportingPage";
import { SalesOrderDetailPage } from "@/pages/SalesOrderDetailPage";
import { SalesPage } from "@/pages/SalesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UsersPage } from "@/pages/UsersPage";

function ProtectedAppShell() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/30 px-4">
        <div className="rounded-3xl border border-border bg-white px-6 py-5 text-center shadow-panel">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Atlas ERP</p>
          <p className="mt-3 font-display text-2xl">Restoring your session...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedAppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/products/:productId" element={<ProductDetailPage />} />
        <Route path="/purchasing" element={<PurchasingPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/sales/:id" element={<SalesOrderDetailPage />} />
        <Route path="/invoicing" element={<InvoicingPage />} />
        <Route path="/accounting" element={<AccountingPage />} />
        <Route path="/accounting/ledger" element={<ArLedgerPage />} />
        <Route path="/accounting/vat" element={<VatRegisterPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/reporting" element={<ReportingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
