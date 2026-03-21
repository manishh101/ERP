import type { Express } from "express";
import { Router } from "express";
import { accountingRouter } from "./accounting.routes";
import { authRouter } from "./auth.routes";
import { dashboardRouter } from "./dashboard.routes";
import { customersRouter } from "./customers.routes";
import { deliveriesRouter } from "./deliveries.routes";
import { inventoryRouter } from "./inventory.routes";
import { taxInvoicesRouter } from "./tax-invoices.routes";
import { paymentsRouter } from "./payments.routes";
import { productsRouter } from "./products.routes";
import { purchaseOrdersRouter } from "./purchase-orders.routes";
import { reportsRouter } from "./reports.routes";
import { salesOrdersRouter } from "./sales-orders.routes";
import { searchRouter } from "./search.routes";
import { settingsRouter } from "./settings.routes";
import { suppliersRouter } from "./suppliers.routes";
import { usersRouter } from "./users.routes";
import { bankRouter } from "./bank.routes";

export function registerRoutes(app: Express) {
  const router = Router();

  router.use("/auth", authRouter);
  router.use("/dashboard", dashboardRouter);
  router.use("/products", productsRouter);
  router.use("/inventory", inventoryRouter);
  router.use("/suppliers", suppliersRouter);
  router.use("/purchase-orders", purchaseOrdersRouter);
  router.use("/customers", customersRouter);
  router.use("/sales-orders", salesOrdersRouter);
  router.use("/tax-invoices", taxInvoicesRouter);
  router.use("/payments", paymentsRouter);
  router.use("/accounting", accountingRouter);
  router.use("/deliveries", deliveriesRouter);
  router.use("/reports", reportsRouter);
  router.use("/settings", settingsRouter);
  router.use("/users", usersRouter);
  router.use("/search", searchRouter);
  router.use("/bank", bankRouter);

  app.use("/api", router);
}
