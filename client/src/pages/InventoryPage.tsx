import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInventoryAdjustmentMutation,
  useInventoryMovementsQuery,
  useInventoryRecordsQuery,
  useInventoryValuationQuery,
  useLowStockQuery,
  useProductsQuery,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type { InventoryRecordRow, StockAdjustmentReason } from "@/types/domain";
import { CreateProductForm } from "@/components/inventory/create-product-form";

const quickFilters = ["All", "Low Stock", "Active", "Discontinued"] as const;
const adjustmentReasons: StockAdjustmentReason[] = ["CORRECTION", "DAMAGE", "RETURNED", "FOUND"];

type QuickFilter = (typeof quickFilters)[number];

const initialAdjustmentForm = {
  inventoryRecordId: "",
  quantityDelta: "",
  reason: "CORRECTION" as StockAdjustmentReason,
  source: "Cycle count",
};

function formatInventoryRecordLabel(record: InventoryRecordRow) {
  return `${record.product} · ${record.variant} · ${record.warehouse} (qty ${formatNumber(record.quantity)})`;
}

export function InventoryPage() {
  const { user } = useAuth();
  
  const { data, error, isLoading } = useProductsQuery();
  const inventoryRecords = useInventoryRecordsQuery();
  const inventoryValuation = useInventoryValuationQuery();
  const inventoryMovements = useInventoryMovementsQuery();
  const lowStock = useLowStockQuery();
  const adjustInventory = useInventoryAdjustmentMutation();
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("All");
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustmentForm);

  const canAdjust = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const lowStockItems = lowStock.data ?? [];
  const lowStockProductIds = useMemo(
    () => new Set(lowStockItems.map((item) => item.productId)),
    [lowStockItems],
  );
  const lowStockVariantIds = useMemo(
    () => new Set(lowStockItems.map((item) => item.id)),
    [lowStockItems],
  );
  const filteredProducts = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalizedSearch = catalogSearch.trim().toLowerCase();

    return data.items.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [product.name, product.sku, product.category, product.material, product.status]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (activeFilter === "Low Stock") {
        return lowStockProductIds.has(product.id);
      }

      if (activeFilter === "Active" || activeFilter === "Discontinued") {
        return product.status === activeFilter;
      }

      return true;
    });
  }, [activeFilter, catalogSearch, data, lowStockProductIds]);
  const featuredValuationItems = useMemo(() => {
    if (!inventoryValuation.data) {
      return [];
    }

    return [...inventoryValuation.data.items]
      .sort((left, right) => right.totalValue - left.totalValue)
      .slice(0, 4);
  }, [inventoryValuation.data]);
  const selectedInventoryRecord =
    inventoryRecords.data?.items.find((record) => record.id === adjustmentForm.inventoryRecordId) ?? null;

  useEffect(() => {
    const firstRecordId = inventoryRecords.data?.items[0]?.id;

    if (!firstRecordId) {
      return;
    }

    const hasSelectedRecord = inventoryRecords.data?.items.some(
      (record) => record.id === adjustmentForm.inventoryRecordId,
    );

    if (!hasSelectedRecord) {
      setAdjustmentForm((current) => ({
        ...current,
        inventoryRecordId: firstRecordId,
      }));
    }
  }, [adjustmentForm.inventoryRecordId, inventoryRecords.data]);

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Inventory data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        actions={[
          {
            label: "Refresh Data",
            variant: "outline",
            onClick: async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["products"] }),
                queryClient.invalidateQueries({ queryKey: ["inventory-records"] }),
                queryClient.invalidateQueries({ queryKey: ["inventory-valuation"] }),
                queryClient.invalidateQueries({ queryKey: ["inventory-movements"] }),
                queryClient.invalidateQueries({ queryKey: ["low-stock"] }),
              ]);
              toast.success("Inventory data refreshed");
            },
          },
          {
            label: adjustmentOpen ? "Close Adjustment" : "Stock Adjustment",
            onClick: () => {
              setAdjustmentOpen((current) => !current);
              setCreateProductOpen(false);
            },
          },
          {
            label: createProductOpen ? "Close Product Form" : "New Product",
            onClick: () => {
              setCreateProductOpen((current) => !current);
              setAdjustmentOpen(false);
            },
          },
        ]}
      />

      {createProductOpen ? (
        <CreateProductForm onClose={() => setCreateProductOpen(false)} />
      ) : null}

      {adjustmentOpen ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Stock Adjustment</CardTitle>
              <CardDescription>
                Post a manual stock adjustment to the live inventory endpoint with an audit reason and source.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {inventoryRecords.isLoading ? (
              <Skeleton className="h-28 md:col-span-2" />
            ) : inventoryRecords.error ? (
              <div className="rounded-2xl border border-border bg-white p-4 md:col-span-2">
                <p className="font-semibold">Inventory records could not be loaded.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getErrorMessage(inventoryRecords.error)}
                </p>
              </div>
            ) : inventoryRecords.data && inventoryRecords.data.items.length > 0 ? (
              <>
                <select
                  className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={adjustmentForm.inventoryRecordId}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      inventoryRecordId: event.target.value,
                    }))
                  }
                >
                  {inventoryRecords.data.items.map((record) => (
                    <option key={record.id} value={record.id}>
                      {formatInventoryRecordLabel(record)}
                    </option>
                  ))}
                </select>
                <Input
                  value={adjustmentForm.quantityDelta}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      quantityDelta: event.target.value,
                    }))
                  }
                  placeholder="Quantity delta, e.g. -2 or 5"
                  type="number"
                  step="1"
                />
                <select
                  className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={adjustmentForm.reason}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      reason: event.target.value as StockAdjustmentReason,
                    }))
                  }
                >
                  {adjustmentReasons.map((reasonOption) => (
                    <option key={reasonOption} value={reasonOption}>
                      {reasonOption}
                    </option>
                  ))}
                </select>
                <Input
                  value={adjustmentForm.source}
                  onChange={(event) =>
                    setAdjustmentForm((current) => ({
                      ...current,
                      source: event.target.value,
                    }))
                  }
                  placeholder="Source or audit note"
                />
                <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground md:col-span-2">
                  {selectedInventoryRecord ? (
                    <>
                      Adjusting <span className="font-semibold text-foreground">{selectedInventoryRecord.product}</span>{" "}
                      / {selectedInventoryRecord.variant} in {selectedInventoryRecord.warehouse}. Current quantity:{" "}
                      {formatNumber(selectedInventoryRecord.quantity)}.
                    </>
                  ) : (
                    "Select an inventory record to prepare an adjustment."
                  )}
                </div>
                <div className="flex gap-3 md:col-span-2">
                  <Button
                    disabled={!canAdjust || adjustInventory.isPending}
                    onClick={async () => {
                      const quantityDelta = Number(adjustmentForm.quantityDelta);

                      if (!selectedInventoryRecord) {
                        toast("Adjustment failed", { description: "Select an inventory record first." });
                        return;
                      }

                      if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
                        toast("Adjustment failed", { description: "Enter a whole-number quantity delta that is not zero." });
                        return;
                      }

                      if (adjustmentForm.source.trim().length < 2) {
                        toast("Adjustment failed", { description: "Provide a short source or audit note." });
                        return;
                      }

                      try {
                        await adjustInventory.mutateAsync({
                          productVariantId: selectedInventoryRecord.productVariantId,
                          warehouseId: selectedInventoryRecord.warehouseId,
                          quantityDelta,
                          reason: adjustmentForm.reason,
                          source: adjustmentForm.source.trim(),
                        });
                        setAdjustmentForm((current) => ({
                          ...current,
                          quantityDelta: "",
                          source: "Cycle count",
                        }));
                        setAdjustmentOpen(false);
                        toast.success("Adjustment saved", {
                          description: `${selectedInventoryRecord.product} / ${selectedInventoryRecord.variant} adjusted by ${quantityDelta}.`,
                        });
                      } catch (requestError) {
                        toast.error("Adjustment failed", { description: getErrorMessage(requestError) });
                      }
                    }}
                  >
                    {adjustInventory.isPending ? "Saving..." : "Post Adjustment"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={adjustInventory.isPending}
                    onClick={() => setAdjustmentForm(initialAdjustmentForm)}
                  >
                    Reset
                  </Button>
                </div>
                {!canAdjust ? (
                  <p className="text-sm text-muted-foreground md:col-span-2">
                    Only admin and warehouse users can post stock adjustments.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-white p-4 md:col-span-2">
                <p className="font-semibold">No inventory records are available yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Inventory adjustments will be available once stock exists in at least one warehouse.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Product Catalog</CardTitle>
            <CardDescription>Search, filter, and drill into the live product catalog.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <FilterBar
            placeholder="Search by product, SKU, material, or status"
            filters={[...quickFilters]}
            value={catalogSearch}
            onValueChange={setCatalogSearch}
            activeFilter={activeFilter}
            onFilterSelect={(filter) => setActiveFilter(filter as QuickFilter)}
          />

          {lowStock.error ? (
            <div className="mb-4 rounded-2xl border border-border bg-white p-4">
              <p className="font-semibold">Low stock status could not be loaded.</p>
              <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(lowStock.error)}</p>
            </div>
          ) : lowStockItems.length > 0 ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">
                {formatNumber(lowStockItems.length)} low-stock variants need attention
              </p>
              <p className="mt-1 text-sm text-amber-900/80">
                {lowStockItems
                  .slice(0, 3)
                  .map((item) => `${item.product} / ${item.variant} (${item.quantity}/${item.threshold})`)
                  .join(" · ")}
              </p>
            </div>
          ) : null}

          <div className="grid gap-4">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="grid gap-4 rounded-3xl border border-border bg-white/90 p-5 lg:grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr_0.8fr_auto]"
                >
                  <div>
                    <Link to={`/inventory/products/${product.id}`} className="font-display text-2xl text-primary">
                      {product.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product.sku} · {product.category} · {product.material}
                    </p>
                    {lowStockProductIds.has(product.id) ? (
                      <p className="mt-2 text-sm font-medium text-amber-700">Low stock alert is active for this SKU.</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Stock</p>
                    <p className="mt-2 text-2xl font-semibold">{formatNumber(product.stock)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Gross Margin</p>
                    <p className="mt-2 text-2xl font-semibold">{product.margin}%</p>
                  </div>
                  <div className="flex items-start">
                    <StatusBadge value={product.status} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Valuation</p>
                    <p className="mt-2 font-semibold">{formatCurrency(product.valuation)}</p>
                  </div>
                  <div className="flex justify-end">
                    <Link to={`/inventory/products/${product.id}`}>
                      <Button variant="outline">View Detail</Button>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-3xl border border-border bg-white p-6 text-sm text-muted-foreground">
                No products matched the current search and filter combination.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Multi-Location Stock View</CardTitle>
              <CardDescription>Live warehouse balances and product-level stock coverage.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {inventoryValuation.isLoading ? (
              <>
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
              </>
            ) : inventoryValuation.error ? (
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">Inventory valuation could not be loaded.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getErrorMessage(inventoryValuation.error)}
                </p>
              </div>
            ) : featuredValuationItems.length > 0 ? (
              featuredValuationItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-semibold">{item.product}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.variant} · {formatNumber(item.stockQuantity)} units ·{" "}
                        {formatCurrency(item.totalValue)}
                      </p>
                    </div>
                    <StatusBadge value={lowStockVariantIds.has(item.id) ? "Low Stock" : "In Stock"} />
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {item.byWarehouse.length > 0 ? (
                      item.byWarehouse.map((warehouse) => (
                        <div key={`${item.id}-${warehouse.warehouse}`} className="rounded-2xl bg-secondary/60 p-4">
                          <p className="font-semibold">{warehouse.warehouse}</p>
                          <p className="mt-1 text-sm">
                            {formatNumber(warehouse.quantity)} units · {warehouse.status}
                          </p>
                          <p className="text-sm text-muted-foreground">{formatCurrency(warehouse.value)}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
                        No warehouse allocations were returned for this variant.
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
                No valuation records are available yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Movement & Valuation</CardTitle>
              <CardDescription>Recent stock movements and the latest portfolio-level valuation snapshot.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Portfolio Value</p>
                <p className="mt-2 font-semibold">
                  {inventoryValuation.data ? formatCurrency(inventoryValuation.data.totalValue) : "Loading..."}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Low Stock Variants</p>
                <p className="mt-2 font-semibold">
                  {lowStock.isLoading ? "Loading..." : formatNumber(lowStockItems.length)}
                </p>
              </div>
              <div className="rounded-2xl bg-secondary/60 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Movement Logs</p>
                <p className="mt-2 font-semibold">
                  {inventoryMovements.data ? formatNumber(inventoryMovements.data.total) : "Loading..."}
                </p>
              </div>
            </div>

            {inventoryMovements.isLoading ? (
              <>
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </>
            ) : inventoryMovements.error ? (
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="font-semibold">Movement history could not be loaded.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getErrorMessage(inventoryMovements.error)}
                </p>
              </div>
            ) : inventoryMovements.data && inventoryMovements.data.items.length > 0 ? (
              inventoryMovements.data.items.map((movement) => (
                <div key={movement.id} className="rounded-2xl border border-border bg-white p-4 text-sm">
                  <p className="font-semibold">
                    {movement.type} {Math.abs(movement.quantity)} units for {movement.product} / {movement.variant}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    {movement.warehouse} · {formatDate(movement.occurredAt)} · {movement.source}
                  </p>
                  <p className="text-muted-foreground">Updated by {movement.user}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
                No stock movements have been recorded yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
