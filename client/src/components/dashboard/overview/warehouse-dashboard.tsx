import { AlertTriangle, Boxes, PackageCheck, PackageSearch, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WarehouseOverview } from "@/types/domain";
import { formatEnumLabel, formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { SectionLink } from "./section";
import { LowStockWidget, OutOfStockWidget } from "./stock-widget";

function DeliveryToday({ deliveries }: { deliveries: WarehouseOverview["deliveries"] }) {
  const todayCounts = deliveries.today;
  const total = Object.values(todayCounts).reduce((sum, count) => sum + count, 0);

  const items: Array<{ label: string; count: number }> = [
    { label: "Scheduled", count: todayCounts.SCHEDULED ?? 0 },
    { label: "Out for Delivery", count: todayCounts.OUT_FOR_DELIVERY ?? 0 },
    { label: "Delivered", count: todayCounts.DELIVERED ?? 0 },
    { label: "Failed", count: todayCounts.FAILED_ATTEMPT ?? 0 },
  ];

  return (
    <Card className="border-border/70 bg-card shadow-sm">
      <CardHeader className="flex-col items-start gap-1 pb-3">
        <div className="flex w-full items-center justify-between gap-4">
          <CardTitle className="text-base">Today's Deliveries</CardTitle>
          <SectionLink to="/delivery" label="Delivery board" />
        </div>
        <p className="text-sm text-muted-foreground">
          {formatNumber(total)} dispatch{total === 1 ? "" : "es"} scheduled for today.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border border-border/70 bg-background p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1.5 text-lg font-semibold tabular-nums text-foreground">{formatNumber(item.count)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Warehouse manager view: stock counts, low stock alerts, out-of-stock items,
 * and today's delivery status. Keeps raw material stock separate from sellable
 * finished goods if requested, but operates on overall variant stock here.
 */
export function WarehouseDashboard({ data }: { data: WarehouseOverview }) {
  const { stock, lowStock, outOfStock, deliveries, pendingReceipts } = data;
  const deliveryTotal = Object.values(deliveries.today).reduce((sum, count) => sum + count, 0);
  const deliveredCount = deliveries.today.DELIVERED ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total Variants"
          value={formatNumber(stock.totalVariants)}
          href="/inventory"
          icon={Boxes}
        />
        <StatTile
          label="Low Stock"
          value={formatNumber(stock.lowStockCount)}
          sub="Variants below threshold"
          tone={stock.lowStockCount > 0 ? "warning" : "neutral"}
          href="/inventory"
          icon={AlertTriangle}
        />
        <StatTile
          label="Out of Stock"
          value={formatNumber(stock.outOfStockCount)}
          sub="Variants with zero stock"
          tone={stock.outOfStockCount > 0 ? "warning" : "neutral"}
          href="/inventory"
          icon={PackageSearch}
        />
        <StatTile
          label="Pending Receipts"
          value={formatNumber(pendingReceipts.count)}
          sub="Inbound purchase orders"
          tone={pendingReceipts.count > 0 ? "warning" : "neutral"}
          href="/purchasing"
          icon={PackageCheck}
        />
      </div>

      <DeliveryToday deliveries={deliveries} />

      <div className="grid gap-5 lg:grid-cols-2">
        <LowStockWidget rows={lowStock.items} viewAllHref="/inventory" />
        <OutOfStockWidget rows={outOfStock.items} viewAllHref="/inventory" />
      </div>
    </div>
  );
}
