import { AlertCircle, Boxes, ReceiptText, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { TopProductsChart } from "@/components/dashboard/top-products-chart";
import { RecentSalesTable } from "@/components/dashboard/recent-sales-table";
import type { AdminOverview } from "@/types/domain";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Section, SectionLink } from "./section";
import { SalesTrendChart } from "./sales-trend-chart";
import { AgingSummary } from "./aging-summary";
import { TopCustomersList } from "./top-customers-list";
import { RecentPaymentsTable } from "./recent-payments-table";
import { ActivityFeed } from "./activity-feed";

/**
 * Compact attention banner — surfaces the single most important action item so
 * the owner does not have to read every tile to know if something needs doing.
 * Only shown when there is actually something to act on.
 * Commercial AR / stock only — no VAT (that's the accountant's domain).
 */
function AttentionBanner({ data }: { data: AdminOverview }) {
  type BannerItem = { label: string; href: string };
  const items: BannerItem[] = [];

  if (data.arAging["90+"] > 0) {
    items.push({
      label: `${formatCurrency(data.arAging["90+"])} overdue 90+ days`,
      href: "/accounting/ledger",
    });
  }
  if (data.arAging["61-90"] > 0 && data.arAging["90+"] === 0) {
    // Only surface 61-90 if nothing worse is already shown
    items.push({
      label: `${formatCurrency(data.arAging["61-90"])} overdue 61–90 days`,
      href: "/accounting/ledger",
    });
  }
  if (data.lowStock.count > 0) {
    items.push({
      label: `${formatNumber(data.lowStock.count)} variant${data.lowStock.count === 1 ? "" : "s"} below stock threshold`,
      href: "/inventory",
    });
  }

  if (items.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border border-l-4 px-4 py-3",
        data.arAging["90+"] > 0
          ? "border-red-200 border-l-red-500 bg-red-50/60"
          : "border-amber-200 border-l-amber-500 bg-amber-50/60",
      )}
    >
      <AlertCircle
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          data.arAging["90+"] > 0 ? "text-red-600" : "text-amber-600",
        )}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-semibold", data.arAging["90+"] > 0 ? "text-red-800" : "text-amber-800")}>
          Needs attention
        </p>
        <ul className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                to={item.href}
                className={cn(
                  "text-xs font-medium underline-offset-2 hover:underline",
                  data.arAging["90+"] > 0 ? "text-red-700" : "text-amber-700",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

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
      {/* KPI strip */}
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

      {/* Attention banner — only shown when action is needed */}
      <AttentionBanner data={data} />

      {/* Charts: trend (decision-driving) + AR aging (risk read) */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <SalesTrendChart data={data.salesTrend} />
        <AgingSummary data={data.arAging} arByCustomer={data.arByCustomer} />
      </div>

      {/* Top performers: customers by revenue, products by units */}
      <div className="grid gap-5 lg:grid-cols-2">
        <TopCustomersList rows={data.topCustomers} />
        <TopProductsChart data={data.topProducts} />
      </div>

      {/* Recent activity tables */}
      <Section
        title="Recent Orders"
        description="Latest customer orders and their fulfillment status."
        action={<SectionLink to="/sales" />}
      >
        <RecentSalesTable rows={data.recentOrders} />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Recent Payments" action={<SectionLink to="/payments" />}>
          <RecentPaymentsTable rows={data.recentPayments} />
        </Section>
        <Section title="Recent Activity">
          <ActivityFeed rows={data.recentActivity} />
        </Section>
      </div>
    </div>
  );
}
