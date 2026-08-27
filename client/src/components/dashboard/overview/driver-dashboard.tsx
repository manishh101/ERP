import { CheckCircle2, Clock, Navigation, TriangleAlert } from "lucide-react";
import type { DriverOverview } from "@/types/domain";
import { formatNumber } from "@/lib/utils";
import { StatTile } from "./stat-tile";
import { AssignedDeliveries } from "./assigned-deliveries";

/**
 * Driver view: today's delivery status counts and the driver's own assigned
 * stops. Scoped server-side to this driver (JWT id). No monetary, AR, or VAT
 * fields — the server never sends them to this role.
 */
export function DriverDashboard({ data }: { data: DriverOverview }) {
  const { today } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Scheduled"
          value={formatNumber(today.SCHEDULED ?? 0)}
          sub="Planned for today"
          icon={Clock}
        />
        <StatTile
          label="Out for Delivery"
          value={formatNumber(today.OUT_FOR_DELIVERY ?? 0)}
          sub="In transit now"
          icon={Navigation}
        />
        <StatTile
          label="Delivered"
          value={formatNumber(today.DELIVERED ?? 0)}
          tone="positive"
          sub="Completed today"
          icon={CheckCircle2}
        />
        <StatTile
          label="Failed Attempts"
          value={formatNumber(today.FAILED_ATTEMPT ?? 0)}
          tone={(today.FAILED_ATTEMPT ?? 0) > 0 ? "danger" : "neutral"}
          sub="Need re-attempt"
          icon={TriangleAlert}
        />
      </div>

      <AssignedDeliveries rows={data.assigned} activeQueue={data.activeQueue} />
    </div>
  );
}
