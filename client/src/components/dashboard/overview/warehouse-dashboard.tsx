import { Boxes, PackageCheck, PackageX, TriangleAlert } from "lucide-react";
import type { WarehouseOverview } from "@/types/domain";
import { formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { Section } from "./section";
import { DeliveryToday } from "./delivery-today";
import { LowStockTable } from "./low-stock-table";
import { OutOfStockTable } from "./out-of-stock-table";

/**
 * Warehouse view: stock health, what needs replenishment, what's out, today's
 * dispatch queue, and inbound receipts. Intentionally carries NO monetary,
 * AR, or VAT fields — the server never sends them to this role.
 */
export function WarehouseDashboard({ data }: { data: WarehouseOverview }) {
  const { stock, deliveries, pendingReceipts } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Variants"
          value={formatNumber(stock.totalVariants)}
          sub="Tracked SKUs"
          href="/inventory"
          icon={Boxes}
        />
        <StatTile
          label="Low Stock"
          value={formatNumber(stock.lowStockCount)}
          sub="At or below threshold"
          tone={stock.lowStockCount > 0 ? "warning" : "neutral"}
          href="/inventory"
          icon={TriangleAlert}
        />
        <StatTile
          label="Out of Stock"
          value={formatNumber(stock.outOfStockCount)}
          sub="Nothing on hand"
          tone={stock.outOfStockCount > 0 ? "danger" : "neutral"}
          href="/inventory"
          icon={PackageX}
        />
        <StatTile
          label="Pending Receipts"
          value={formatNumber(pendingReceipts.count)}
          sub="Awaiting goods receipt"
          href="/purchasing"
          icon={PackageCheck}
        />
      </div>

      <DeliveryToday today={deliveries.today} activeQueue={deliveries.activeQueue} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Low Stock" description="Replenish before these run out.">
          <LowStockTable rows={data.lowStock.items} />
        </Section>
        <Section title="Out of Stock" description="Variants with nothing on hand.">
          <OutOfStockTable rows={data.outOfStock.items} />
        </Section>
      </div>
    </div>
  );
}
