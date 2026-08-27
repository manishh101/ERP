import { Boxes, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import type { AdminOverview } from "@/types/domain";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Section } from "./section";
import { SalesTrendChart } from "./sales-trend-chart";
import { AgingSummary } from "./aging-summary";
import { TopCustomersList } from "./top-customers-list";
import { RecentPaymentsTable } from "./recent-payments-table";
import { ActivityFeed } from "./activity-feed";

/**
 * Owner / Admin command center: money in, money owed, what's selling, what
 * needs stock attention, and the latest commercial activity. AR figures are
 * strictly commercial (SalesOrder balance + customer receipts) — never mixed
 * with VAT, which lives on the accountant view.
 */
export function AdminDashboard({ data }: { data: AdminOverview }) {
  const { finance, lowStock } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Sales This Month"
          value={formatCurrency(finance.salesMonth)}
          sub={`Today ${formatCurrency(finance.salesToday)}`}
          href="/sales"
          icon={TrendingUp}
        />
        <StatTile
          label="Received This Month"
          value={formatCurrency(finance.receivedMonth)}
          tone="positive"
          href="/payments"
          icon={Wallet}
        />
        <StatTile
          label="Outstanding AR"
          value={formatCurrency(finance.outstandingAr)}
          sub="Customer balances due"
          tone={finance.outstandingAr > 0 ? "warning" : "neutral"}
          href="/accounting/ledger"
          icon={ReceiptText}
        />
        <StatTile
          label="Low Stock"
          value={formatNumber(lowStock.count)}
          sub="Variants below threshold"
          tone={lowStock.count > 0 ? "warning" : "neutral"}
          href="/inventory"
          icon={Boxes}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <SalesTrendChart data={data.salesTrend} />
        <AgingSummary data={data.arAging} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TopCustomersList rows={data.topCustomers} />
        <TopProductsChart data={data.topProducts} />
      </div>

      <Section title="Recent Orders" description="Latest customer orders and their fulfillment status.">
        <RecentSalesTable rows={data.recentOrders} />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <RecentPaymentsTable rows={data.recentPayments} />
        <ActivityFeed rows={data.recentActivity} />
      </div>
    </div>
  );
}
