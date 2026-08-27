import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { FilterBar } from "@/components/shared/filter-bar";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, PackageOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useInventoryAdjustmentMutation,
  useInventoryMovementsQuery,
  useInventoryRecordsQuery,
  useInventoryValuationQuery,
  useLowStockQuery,
  useAllProductsQuery,
} from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils";
import type {
  InventoryMovementRow,
  InventoryRecordRow,
  ProductRow,
  StockAdjustmentReason,
} from "@/types/domain";
import { CreateProductForm } from "@/components/inventory/create-product-form";

// Helper components & types
const quickFilters = ["All", "Sellable Products", "Raw Materials", "Low Stock", "Active", "Discontinued"] as const;
const adjustmentReasons: StockAdjustmentReason[] = [
  "CORRECTION",
  "DAMAGE",
  "RETURNED",
  "FOUND",
];
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

// Data Table Columns
const movementColumns: ColumnDef<InventoryMovementRow>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("date")),
  },
  { accessorKey: "product", header: "Product" },
  { accessorKey: "variant", header: "Variant" },
  { accessorKey: "warehouse", header: "Warehouse" },
  { accessorKey: "type", header: "Type" },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Quantity</div>,
    cell: ({ row }) => {
      const q = row.getValue("quantity") as number;
      return (
        <div
          className={`text-right tabular-nums ${q > 0 ? "text-emerald-600" : q < 0 ? "text-red-500" : ""}`}
        >
          {q > 0 ? `+${q}` : q}
        </div>
      );
    },
  },
  { accessorKey: "source", header: "Source" },
];

export function InventoryPage() {
  const { user } = useAuth();

  const { data, error, isLoading } = useAllProductsQuery();
  const inventoryRecords = useInventoryRecordsQuery();
  const inventoryValuation = useInventoryValuationQuery();
  const inventoryMovements = useInventoryMovementsQuery();
  const lowStock = useLowStockQuery();
  const adjustInventory = useInventoryAdjustmentMutation();

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  // Auto-open the create sheet when navigated here from the Ctrl+K "New Product" command.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateProductOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("All");
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustmentForm);

  const canAdjust = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const lowStockItems = lowStock.data ?? [];
  const lowStockProductIds = useMemo(
    () => new Set(lowStockItems.map((item) => item.productId)),
    [lowStockItems],
  );

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const normalizedSearch = catalogSearch.trim().toLowerCase();
    return data.items.filter((product) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          product.name,
          product.sku,
          product.category,
          product.material,
          product.status,
          product.sizeLabel || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      if (!matchesSearch) return false;
      if (activeFilter === "Sellable Products") return product.isSellable === true;
      if (activeFilter === "Raw Materials") return product.isSellable === false;
      if (activeFilter === "Low Stock") return lowStockProductIds.has(product.id);
      if (activeFilter === "Active" || activeFilter === "Discontinued")
        return product.status === activeFilter;
      return true;
    });
  }, [activeFilter, catalogSearch, data, lowStockProductIds]);

  const featuredValuationItems = useMemo(() => {
    if (!inventoryValuation.data) return [];
    const categories = new Map<string, { category: string; totalValue: number; quantity: number }>();
    
    for (const item of inventoryValuation.data.items) {
      const existing = categories.get(item.category) || {
        category: item.category,
        totalValue: 0,
        quantity: 0,
      };
      existing.totalValue += item.totalValue;
      existing.quantity += item.stockQuantity;
      categories.set(item.category, existing);
    }

    return [...categories.values()]
      .sort((left, right) => right.totalValue - left.totalValue)
      .slice(0, 4);
  }, [inventoryValuation.data]);

  const selectedInventoryRecord =
    inventoryRecords.data?.items.find(
      (record) => record.id === adjustmentForm.inventoryRecordId,
    ) ?? null;

  useEffect(() => {
    const firstRecordId = inventoryRecords.data?.items[0]?.id;
    if (!firstRecordId) return;
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

  const productColumns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Product",
        cell: ({ row }) => {
          const firstImage = row.original.imageUrls?.[0];
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted flex items-center justify-center">
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt={row.original.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              <div>
                <Link
                  to={`/inventory/products/${row.original.id}`}
                  className="font-semibold hover:underline"
                >
                  {row.original.name}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {row.original.description}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "sku",
        header: "SKU",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.getValue("sku")}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal">
            {row.getValue("category")}
          </Badge>
        ),
      },
      {
        accessorKey: "size",
        header: "Size",
        cell: ({ row }) => {
          const { height, width, length, sizeLabel } = row.original;
          if (sizeLabel && sizeLabel !== "Standard") return sizeLabel;
          if (!height && !width && !length) return "-";
          return `${height || 0}x${width || 0}x${length || 0}`;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
      },
      {
        accessorKey: "stock",
        header: () => <div className="text-right">Stock</div>,
        cell: ({ row }) => {
          const stock = row.getValue("stock") as number;
          const isLow = lowStockProductIds.has(row.original.id);
          
          if (stock <= 0) {
            return (
              <div className="text-right">
                <Badge variant="destructive" className="font-mono">
                  Out of Stock
                </Badge>
              </div>
            );
          }
          
          if (isLow) {
            return (
              <div className="text-right">
                <Badge variant="outline" className="border-amber-500 text-amber-600 font-mono font-bold">
                  {formatNumber(stock)} ⚠
                </Badge>
              </div>
            );
          }

          return (
            <div className="text-right">
              <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50 font-mono">
                {formatNumber(stock)} units
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "valuation",
        header: () => <div className="text-right">Valuation</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {formatCurrency(row.getValue("valuation") as number)}
          </div>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: () => <div className="text-right">Selling Price</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-medium text-blue-700">
            {formatCurrency(row.original.sellingPrice)}
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="text-right">
            <Link to={`/inventory/products/${row.original.id}`}>
              <Button variant="ghost" size="sm">
                View
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [lowStockProductIds],
  );

  if (isLoading) return <Skeleton className="h-[420px]" />;
  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Inventory data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(error)}
          </p>
        </CardContent>
      </Card>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        actions={[
          {
            label: "Refresh Data",
            variant: "outline",
            onClick: async () => {
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["products"] }),
                queryClient.invalidateQueries({
                  queryKey: ["inventory-records"],
                }),
                queryClient.invalidateQueries({
                  queryKey: ["inventory-valuation"],
                }),
                queryClient.invalidateQueries({
                  queryKey: ["inventory-movements"],
                }),
                queryClient.invalidateQueries({ queryKey: ["low-stock"] }),
              ]);
              toast.success("Inventory data refreshed");
            },
          },
          {
            label: adjustmentOpen ? "Close Adjustment" : "Stock Adjustment",
            variant: "outline",
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

      {createProductOpen && (
        <CreateProductForm onClose={() => setCreateProductOpen(false)} />
      )}

      {adjustmentOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Post Stock Adjustment</CardTitle>
            <CardDescription>
              Manual stock correction. This creates an immutable audit trail.
            </CardDescription>
          </CardHeader>
          {/* adjustment form content removed for brevity, will map exactly as is */}
          <CardContent className="grid gap-3 md:grid-cols-2">
            {inventoryRecords.isLoading ? (
              <Skeleton className="h-28 md:col-span-2" />
            ) : inventoryRecords.error ? (
              <div className="rounded-2xl border border-border bg-white p-4 md:col-span-2">
                <p className="font-semibold">
                  Inventory records could not be loaded.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getErrorMessage(inventoryRecords.error)}
                </p>
              </div>
            ) : inventoryRecords.data &&
              inventoryRecords.data.items.length > 0 ? (
              <>
                <select
                  className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={adjustmentForm.inventoryRecordId}
                  onChange={(e) =>
                    setAdjustmentForm((curr) => ({
                      ...curr,
                      inventoryRecordId: e.target.value,
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
                  onChange={(e) =>
                    setAdjustmentForm((curr) => ({
                      ...curr,
                      quantityDelta: e.target.value,
                    }))
                  }
                  placeholder="Quantity delta, e.g. -2 or 5"
                  type="number"
                  step="1"
                />
                <select
                  className="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={adjustmentForm.reason}
                  onChange={(e) =>
                    setAdjustmentForm((curr) => ({
                      ...curr,
                      reason: e.target.value as StockAdjustmentReason,
                    }))
                  }
                >
                  {adjustmentReasons.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <Input
                  value={adjustmentForm.source}
                  onChange={(e) =>
                    setAdjustmentForm((curr) => ({
                      ...curr,
                      source: e.target.value,
                    }))
                  }
                  placeholder="Source or audit note"
                />
                <div className="rounded-2xl border border-border bg-secondary/40 p-4 text-sm text-muted-foreground md:col-span-2">
                  {selectedInventoryRecord ? (
                    <>
                      Adjusting{" "}
                      <span className="font-semibold text-foreground">
                        {selectedInventoryRecord.product}
                      </span>{" "}
                      / {selectedInventoryRecord.variant} in{" "}
                      {selectedInventoryRecord.warehouse}. Current qty:{" "}
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
                      const quantityDelta = Number(
                        adjustmentForm.quantityDelta,
                      );
                      if (!selectedInventoryRecord)
                        return toast.error("Select an inventory record first.");
                      if (
                        !Number.isInteger(quantityDelta) ||
                        quantityDelta === 0
                      )
                        return toast.error("Enter a non-zero whole number.");
                      if (adjustmentForm.source.trim().length < 2)
                        return toast.error("Provide an audit note.");
                      try {
                        await adjustInventory.mutateAsync({
                          productVariantId:
                            selectedInventoryRecord.productVariantId,
                          warehouseId: selectedInventoryRecord.warehouseId,
                          quantityDelta,
                          reason: adjustmentForm.reason,
                          source: adjustmentForm.source.trim(),
                        });
                        setAdjustmentForm((curr) => ({
                          ...curr,
                          quantityDelta: "",
                          source: "Cycle count",
                        }));
                        setAdjustmentOpen(false);
                        toast.success("Adjustment saved", {
                          description: `${selectedInventoryRecord.product} adjusted by ${quantityDelta}.`,
                        });
                      } catch (e) {
                        toast.error("Adjustment failed", {
                          description: getErrorMessage(e),
                        });
                      }
                    }}
                  >
                    {adjustInventory.isPending
                      ? "Saving..."
                      : "Post Adjustment"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={adjustInventory.isPending}
                    onClick={() => setAdjustmentForm(initialAdjustmentForm)}
                  >
                    Reset
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-border bg-white p-4 md:col-span-2">
                <p className="font-semibold">
                  No inventory records are available yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Product Catalog</CardTitle>
          <CardDescription>
            Search, filter, and drill into the live product catalog.{" "}
            <span className="font-semibold text-primary">
              ({filteredProducts.length} items found)
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <FilterBar
              placeholder="Search catalog..."
              filters={[...quickFilters]}
              value={catalogSearch}
              onValueChange={setCatalogSearch}
              activeFilter={activeFilter}
              onFilterSelect={(f) => setActiveFilter(f as QuickFilter)}
            />
          </div>
          {lowStockItems.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">
                {formatNumber(lowStockItems.length)} low-stock variants need
                attention
              </p>
            </div>
          )}
          <DataTable
            columns={productColumns}
            data={filteredProducts}
            emptyMessage="No products matched your search."
            hideSearch
            hidePagination
            maxHeight="65vh"
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Valuation by Category</CardTitle>
            <CardDescription>
              Total cost basis of items currently in stock.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryValuation.isLoading ? (
              <Skeleton className="h-64" />
            ) : inventoryValuation.error ? (
              <div className="p-4">
                <p>{getErrorMessage(inventoryValuation.error)}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {featuredValuationItems.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl"
                  >
                    <span className="font-medium">{item.category}</span>
                    <div className="text-right">
                      <p className="font-bold tabular-nums">
                        {formatCurrency(item.totalValue)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(item.quantity)} units
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
            <CardDescription>
              Latest inbound receipts and deliveries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {inventoryMovements.isLoading ? (
              <Skeleton className="h-64" />
            ) : inventoryMovements.error ? (
              <div className="p-4">
                <p>{getErrorMessage(inventoryMovements.error)}</p>
              </div>
            ) : (
              <DataTable
                columns={movementColumns}
                data={inventoryMovements.data?.items || []}
                pageSize={5}
                emptyMessage="No recent movements."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
