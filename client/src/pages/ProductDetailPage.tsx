import { useParams } from "react-router-dom";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useProductDetailQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";

export function ProductDetailPage() {
  const { productId } = useParams();
  const { data: product, error, isLoading } = useProductDetailQuery(productId);

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Product details could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inventory Detail"
        title={product.name}
        description={product.description}
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Variants & Warehouse Levels</CardTitle>
              <CardDescription>Each finish and size combination with current warehouse availability.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.variantRows.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.variant}</p>
                    <p className="text-sm text-muted-foreground">{item.warehouse}</p>
                  </div>
                  <p className="text-xl font-semibold">{item.quantity}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Margin Snapshot</CardTitle>
              <CardDescription>Cost, sell price, and blended margin across recent sales.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {product.metrics.map((metric) => (
              <div key={metric.label} className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
                <span className="text-sm text-muted-foreground">{metric.label}</span>
                <span className="font-semibold">{metric.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sales & Movement History</CardTitle>
            <CardDescription>Recent sales orders, reservations, transfers, and adjustments for this SKU family.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {product.history.map((event) => (
            <div key={event.id} className="rounded-2xl border border-border bg-white p-4 text-sm">
              {event.label}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
