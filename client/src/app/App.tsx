import { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/shared/error-boundary";

import { AccountingPage } from "@/pages/AccountingPage";
import ArLedgerPage from "@/pages/ArLedgerPage";
import VatRegisterPage from "@/pages/VatRegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { DeliveryPage } from "@/pages/DeliveryPage";
import { InventoryPage } from "@/pages/InventoryPage";
import { InvoicingPage } from "@/pages/InvoicingPage";
import { EstimateBillsPage } from "@/pages/EstimateBillsPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PaymentsPage } from "@/pages/PaymentsPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { PartiesPage } from "@/pages/PartiesPage";
import { PartyProfilePage } from "@/pages/PartyProfilePage";
import { PurchasingPage } from "@/pages/PurchasingPage";
import { PurchaseOrderDetailPage } from "@/pages/PurchaseOrderDetailPage";
import { ReportingPage } from "@/pages/ReportingPage";
import { SalesOrderDetailPage } from "@/pages/SalesOrderDetailPage";
import { SalesPage } from "@/pages/SalesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SuppliersPage } from "@/pages/SuppliersPage";
import { SupplierProfilePage } from "@/pages/SupplierProfilePage";
import { UsersPage } from "@/pages/UsersPage";

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedAppShell() {
  const { status } = useAuth();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Restoring your session...</p>
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
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedAppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/products/:productId" element={<ProductDetailPage />} />
            <Route path="/purchasing" element={<PurchasingPage />} />
            <Route path="/purchasing/:id" element={<PurchaseOrderDetailPage />} />
            {/* Parties directory */}
            <Route path="/parties" element={<PartiesPage />} />
            <Route path="/parties/:id" element={<PartyProfilePage />} />
            <Route path="/suppliers" element={<SuppliersPage />} />
            <Route path="/suppliers/:id" element={<SupplierProfilePage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/sales/:id" element={<SalesOrderDetailPage />} />
            <Route path="/invoicing" element={<InvoicingPage />} />
            <Route path="/estimates" element={<EstimateBillsPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
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
      </Suspense>
    </ErrorBoundary>
  );
}
