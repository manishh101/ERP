import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { ErrorBoundary } from "@/components/shared/error-boundary";

// #32 Fix: Lazy-load all pages for code splitting.
// Each page is loaded on demand, reducing the initial bundle size significantly.
const AccountingPage = lazy(() => import("@/pages/AccountingPage").then(m => ({ default: m.AccountingPage })));
const ArLedgerPage = lazy(() => import("@/pages/ArLedgerPage"));
const VatRegisterPage = lazy(() => import("@/pages/VatRegisterPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const DeliveryPage = lazy(() => import("@/pages/DeliveryPage").then(m => ({ default: m.DeliveryPage })));
const InventoryPage = lazy(() => import("@/pages/InventoryPage").then(m => ({ default: m.InventoryPage })));
const InvoicingPage = lazy(() => import("@/pages/InvoicingPage").then(m => ({ default: m.InvoicingPage })));
const EstimateBillsPage = lazy(() => import("@/pages/EstimateBillsPage").then(m => ({ default: m.EstimateBillsPage })));
const LoginPage = lazy(() => import("@/pages/LoginPage").then(m => ({ default: m.LoginPage })));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage").then(m => ({ default: m.NotFoundPage })));
const PaymentsPage = lazy(() => import("@/pages/PaymentsPage").then(m => ({ default: m.PaymentsPage })));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetailPage").then(m => ({ default: m.ProductDetailPage })));
const PartiesPage = lazy(() => import("@/pages/PartiesPage").then(m => ({ default: m.PartiesPage })));
const PartyProfilePage = lazy(() => import("@/pages/PartyProfilePage").then(m => ({ default: m.PartyProfilePage })));
const PurchasingPage = lazy(() => import("@/pages/PurchasingPage").then(m => ({ default: m.PurchasingPage })));
const PurchaseOrderDetailPage = lazy(() => import("@/pages/PurchaseOrderDetailPage").then(m => ({ default: m.PurchaseOrderDetailPage })));
const ReportingPage = lazy(() => import("@/pages/ReportingPage").then(m => ({ default: m.ReportingPage })));
const SalesOrderDetailPage = lazy(() => import("@/pages/SalesOrderDetailPage").then(m => ({ default: m.SalesOrderDetailPage })));
const SalesPage = lazy(() => import("@/pages/SalesPage").then(m => ({ default: m.SalesPage })));
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const SuppliersPage = lazy(() => import("@/pages/SuppliersPage").then(m => ({ default: m.SuppliersPage })));
const SupplierProfilePage = lazy(() => import("@/pages/SupplierProfilePage").then(m => ({ default: m.SupplierProfilePage })));
const UsersPage = lazy(() => import("@/pages/UsersPage").then(m => ({ default: m.UsersPage })));

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
