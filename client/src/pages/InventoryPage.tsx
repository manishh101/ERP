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
  useWarehousesQuery,
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
import {
  Package,
  Warehouse,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  History,
  TrendingUp,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Helpers & Types
const stockStatusFilters = [
  "All Stock",
  "In Stock",
  "Low Stock",
  "Out of Stock",
  "Reserved",
  "Damaged",
] as const;
type StockStatusFilter = (typeof stockStatusFilters)[number];

const adjustmentReasons: StockAdjustmentReason[] = [
  "CORRECTION",
  "DAMAGE",
  "RETURNED",
  "FOUND",
];

const initialAdjustmentForm = {
  inventoryRecordId: "",
  quantityDelta: "",
  reason: "CORRECTION" as StockAdjustmentReason,
  source: "Cycle count",
};

function formatInventoryRecordLabel(record: InventoryRecordRow) {
  return `${record.product} · ${record.variant} · ${record.warehouse} (Qty: ${formatNumber(record.quantity)})`;
}

// Data Table Columns for Stock Movements
const movementColumns: ColumnDef<InventoryMovementRow>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => formatDate(row.getValue("date")),
  },
  { accessorKey: "product", header: "Product" },
  { accessorKey: "variant", header: "Variant" },
  {
    accessorKey: "warehouse",
    header: "Warehouse",
    cell: ({ row }) => (
      <Badge variant="outline" className="font-normal text-xs bg-muted/30">
        {row.getValue("warehouse")}
      </Badge>
    ),
  },
  {
    accessorKey: "type",
    header: "Movement Type",
    cell: ({ row }) => {
      const type = String(row.getValue("type")).toUpperCase();
      let colorClass = "border-secondary text-foreground";
      if (type.includes("INBOUND") || type.includes("RELEASE") || type.includes("FOUND")) {
        colorClass = "border-emerald-500/30 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40";
      } else if (type.includes("OUTBOUND") || type.includes("DAMAGE")) {
        colorClass = "border-red-500/30 text-red-600 bg-red-50 dark:bg-red-950/40";
      } else if (type.includes("RESERVATION")) {
        colorClass = "border-amber-500/30 text-amber-600 bg-amber-50 dark:bg-amber-950/40";
      }
      return (
        <Badge variant="outline" className={`font-semibold text-xs ${colorClass}`}>
          {row.getValue("type")}
        </Badge>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Quantity</div>,
    cell: ({ row }) => {
      const q = row.getValue("quantity") as number;
      return (
        <div
          className={`text-right font-mono font-bold tabular-nums ${
            q > 0 ? "text-emerald-600 dark:text-emerald-400" : q < 0 ? "text-red-500" : ""
          }`}
        >
          {q > 0 ? `+${q}` : q}
        </div>
      );
    },
  },
  { accessorKey: "source", header: "Source / Reference" },
];

export function InventoryPage() {
  const { user } = useAuth();

  const productsQuery = useAllProductsQuery();
  const inventoryRecords = useInventoryRecordsQuery();
  const inventoryValuation = useInventoryValuationQuery();
  const inventoryMovements = useInventoryMovementsQuery(20);
  const lowStock = useLowStockQuery();
  const warehousesQuery = useWarehousesQuery();
  const adjustInventory = useInventoryAdjustmentMutation();

  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [createProductOpen, setCreateProductOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"CATALOG" | "RECORDS" | "MOVEMENTS" | "VALUATION">("CATALOG");

  // Filtering states
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
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("ALL");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeStatusFilter, setActiveStatusFilter] = useState<StockStatusFilter>("All Stock");
  const [adjustmentForm, setAdjustmentForm] = useState(initialAdjustmentForm);

  const canAdjust = user?.role === "ADMIN" || user?.role === "WAREHOUSE";
  const lowStockItems = lowStock.data ?? [];
  const lowStockProductIds = useMemo(
    () => new Set(lowStockItems.map((item) => item.productId)),
    [lowStockItems],
  );

  // Extract unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    if (!productsQuery.data?.items) return [];
    const categories = new Set(productsQuery.data.items.map((p) => p.category).filter(Boolean));
    return Array.from(categories).sort();
  }, [productsQuery.data]);

  // Calculated Warehouse Metrics
  const warehouseList = warehousesQuery.data ?? [];

  const totalValuation = useMemo(() => {
    if (!inventoryValuation.data?.items) return 0;
    return inventoryValuation.data.items.reduce((sum, i) => sum + i.totalValue, 0);
  }, [inventoryValuation.data]);

  const totalPhysicalQuantity = useMemo(() => {
    if (!inventoryRecords.data?.items) return 0;
    return inventoryRecords.data.items.reduce((sum, r) => sum + r.quantity, 0);
  }, [inventoryRecords.data]);

  // Inventory records filter
  const filteredRecords = useMemo(() => {
    if (!inventoryRecords.data?.items) return [];
    return inventoryRecords.data.items.filter((record) => {
      if (selectedWarehouseId !== "ALL" && record.warehouseId !== selectedWarehouseId) {
        return false;
      }
      if (catalogSearch.trim()) {
        const query = catalogSearch.toLowerCase();
        const matches =
          record.product.toLowerCase().includes(query) ||
          record.variant.toLowerCase().includes(query) ||
          record.warehouse.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [inventoryRecords.data, selectedWarehouseId, catalogSearch]);

  // Filtered Products Catalog
  const filteredProducts = useMemo(() => {
    if (!productsQuery.data?.items) return [];
    const normalizedSearch = catalogSearch.trim().toLowerCase();

    return productsQuery.data.items.filter((product) => {
      // Search text match
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

      // Category filter
      if (selectedCategory !== "ALL" && product.category !== selectedCategory) {
        return false;
      }

      // Warehouse filter
      if (selectedWarehouseId !== "ALL" && inventoryRecords.data?.items) {
        const productHasInWarehouse = inventoryRecords.data.items.some(
          (r) => r.warehouseId === selectedWarehouseId && r.product.toLowerCase() === product.name.toLowerCase(),
        );
        if (!productHasInWarehouse) return false;
      }

      // Stock status filter
      if (activeStatusFilter === "In Stock") return product.stock > 0;
      if (activeStatusFilter === "Low Stock") return lowStockProductIds.has(product.id);
      if (activeStatusFilter === "Out of Stock") return product.stock <= 0;
      if (activeStatusFilter === "Reserved") return product.status === "RESERVED";
      if (activeStatusFilter === "Damaged") return product.status === "DAMAGED";

      return true;
    });
  }, [
    activeStatusFilter,
    catalogSearch,
    productsQuery.data,
    selectedCategory,
    selectedWarehouseId,
    inventoryRecords.data,
    lowStockProductIds,
  ]);

  // Category Valuation Summary
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

    return [...categories.values()].sort((left, right) => right.totalValue - left.totalValue);
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

  // Catalog Table Columns
  const productColumns: ColumnDef<ProductRow>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Product / Variant",
        cell: ({ row }) => {
          const firstImage = row.original.imageUrls?.[0];
          return (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
                {firstImage ? (
                  <img
                    src={firstImage}
                    alt={row.original.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                )}
              </div>
              <div>
                <Link
                  to={`/inventory/products/${row.original.id}`}
                  className="font-semibold text-foreground hover:underline hover:text-primary transition-colors"
                >
                  {row.original.name}
                </Link>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {row.original.description || "No description provided"}
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
          <span className="font-mono text-xs text-muted-foreground font-semibold">
            {row.getValue("sku")}
          </span>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ row }) => (
          <Badge variant="secondary" className="font-normal text-xs">
            {row.getValue("category")}
          </Badge>
        ),
      },
      {
        accessorKey: "stock",
        header: () => <div className="text-right">Stock Status</div>,
        cell: ({ row }) => {
          const stock = row.getValue("stock") as number;
          const isLow = lowStockProductIds.has(row.original.id);

          if (stock <= 0) {
            return (
              <div className="text-right">
                <Badge variant="destructive" className="font-mono text-xs">
                  Out of Stock
                </Badge>
              </div>
            );
          }

          if (isLow) {
            return (
              <div className="text-right">
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/40 font-mono font-bold text-xs"
                >
                  {formatNumber(stock)} units ⚠
                </Badge>
              </div>
            );
          }

          return (
            <div className="text-right">
              <Badge
                variant="outline"
                className="border-emerald-200 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 font-mono text-xs"
              >
                {formatNumber(stock)} units
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "valuation",
        header: () => <div className="text-right">Cost Basis</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-mono text-xs text-muted-foreground">
            {formatCurrency(row.getValue("valuation") as number)}
          </div>
        ),
      },
      {
        accessorKey: "sellingPrice",
        header: () => <div className="text-right">Selling Price</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums font-mono text-xs font-bold text-primary">
            {formatCurrency(row.original.sellingPrice)}
          </div>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <div className="text-right">
            <Link to={`/inventory/products/${row.original.id}`}>
              <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold">
                Details
              </Button>
            </Link>
          </div>
        ),
      },
    ],
    [lowStockProductIds],
  );

  // Inventory Record Table Columns
  const recordColumns: ColumnDef<InventoryRecordRow>[] = [
    { accessorKey: "product", header: "Product" },
    { accessorKey: "variant", header: "Variant" },
    {
      accessorKey: "warehouse",
      header: "Warehouse",
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal text-xs bg-muted/40">
          {row.getValue("warehouse")}
        </Badge>
      ),
    },
    {
      accessorKey: "quantity",
      header: () => <div className="text-right">Physical Quantity</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-xs text-foreground">
          {formatNumber(row.getValue("quantity"))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge value={row.getValue("status")} />,
    },
  ];

  const isLoading = productsQuery.isLoading || inventoryRecords.isLoading;

  if (isLoading) return <Skeleton className="h-[520px]" />;
  if (productsQuery.error || inventoryRecords.error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold text-destructive">Inventory data could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(productsQuery.error || inventoryRecords.error)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Stock Operations"
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
                queryClient.invalidateQueries({ queryKey: ["warehouses"] }),
              ]);
              toast.success("Warehouse data refreshed");
            },
          },
          {
            label: adjustmentOpen ? "Close Adjustment" : "Post Stock Adjustment",
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

      {/* Warehouse Operational KPI Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Stock Valuation
              </p>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {formatCurrency(totalValuation)}
            </p>

          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Physical Inventory
              </p>
              <Package className="h-4 w-4 text-primary" />
            </div>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {formatNumber(totalPhysicalQuantity)} <span className="text-sm font-normal text-muted-foreground">Units</span>
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Low Stock Alerts
              </p>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold font-mono mt-1 text-amber-600 dark:text-amber-400">
              {lowStockItems.length} <span className="text-sm font-normal text-muted-foreground">Variants</span>
            </p>

          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Active Warehouses
              </p>
              <Warehouse className="h-4 w-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold font-mono mt-1 text-foreground">
              {warehouseList.length} <span className="text-sm font-normal text-muted-foreground">Locations</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {createProductOpen && <CreateProductForm onClose={() => setCreateProductOpen(false)} />}

      {/* Stock Adjustment Post Form Drawer */}
      {adjustmentOpen && (
        <Card className="border-primary/30 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-primary" />
              Post Stock Adjustment
            </CardTitle>
            <CardDescription className="text-xs">
              Post manual stock discrepancy or cycle count correction. Every adjustment creates an immutable audit trail.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {inventoryRecords.isLoading ? (
              <Skeleton className="h-28 md:col-span-2" />
            ) : inventoryRecords.error ? (
              <div className="rounded-xl border border-border bg-white p-4 md:col-span-2">
                <p className="font-semibold text-destructive">
                  Inventory records could not be loaded.
                </p>
              </div>
            ) : inventoryRecords.data && inventoryRecords.data.items.length > 0 ? (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Select Product Variant & Warehouse *
                  </label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Quantity Delta (+ or -) *
                  </label>
                  <Input
                    value={adjustmentForm.quantityDelta}
                    onChange={(e) =>
                      setAdjustmentForm((curr) => ({
                        ...curr,
                        quantityDelta: e.target.value,
                      }))
                    }
                    placeholder="e.g. -2 for damage, +5 for found"
                    type="number"
                    step="1"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Adjustment Reason *
                  </label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">
                    Audit Note / Source Reference *
                  </label>
                  <Input
                    value={adjustmentForm.source}
                    onChange={(e) =>
                      setAdjustmentForm((curr) => ({
                        ...curr,
                        source: e.target.value,
                      }))
                    }
                    placeholder="e.g. Monthly cycle count audit log #402"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground md:col-span-2">
                  {selectedInventoryRecord ? (
                    <>
                      Adjusting{" "}
                      <span className="font-semibold text-foreground">
                        {selectedInventoryRecord.product}
                      </span>{" "}
                      ({selectedInventoryRecord.variant}) in warehouse{" "}
                      <span className="font-semibold text-foreground">
                        {selectedInventoryRecord.warehouse}
                      </span>
                      . Current physical stock:{" "}
                      <span className="font-bold font-mono text-foreground">
                        {formatNumber(selectedInventoryRecord.quantity)} units
                      </span>
                      .
                    </>
                  ) : (
                    "Select an inventory record to prepare an adjustment."
                  )}
                </div>

                <div className="flex gap-2 md:col-span-2 pt-1">
                  <Button
                    disabled={!canAdjust || adjustInventory.isPending}
                    className="rounded-xl font-semibold bg-primary"
                    onClick={async () => {
                      const quantityDelta = Number(adjustmentForm.quantityDelta);
                      if (!selectedInventoryRecord)
                        return toast.error("Select an inventory record first.");
                      if (!Number.isInteger(quantityDelta) || quantityDelta === 0)
                        return toast.error("Enter a non-zero whole number for quantity delta.");
                      if (adjustmentForm.source.trim().length < 2)
                        return toast.error("Provide an audit reference note.");
                      try {
                        await adjustInventory.mutateAsync({
                          productVariantId: selectedInventoryRecord.productVariantId,
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
                        toast.success("Stock adjustment posted", {
                          description: `${selectedInventoryRecord.product} updated by ${quantityDelta} units.`,
                        });
                      } catch (e) {
                        toast.error("Adjustment failed", {
                          description: getErrorMessage(e),
                        });
                      }
                    }}
                  >
                    {adjustInventory.isPending ? "Posting..." : "Post Adjustment"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={adjustInventory.isPending}
                    onClick={() => setAdjustmentForm(initialAdjustmentForm)}
                    className="rounded-xl"
                  >
                    Reset
                  </Button>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border bg-white p-4 md:col-span-2 text-xs">
                No inventory records available for adjustment.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multi-Faceted Warehouse Control & Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold">Stock Catalog & Warehouse Controls</CardTitle>
              <CardDescription className="text-xs">
                Real-time stock visibility across all operational warehouses.
              </CardDescription>
            </div>

            {/* Warehouse Workspace Navigation Tabs */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
              <Button
                variant={activeTab === "CATALOG" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg"
                onClick={() => setActiveTab("CATALOG")}
              >
                <Package className="h-3.5 w-3.5 mr-1" />
                Product Catalog ({filteredProducts.length})
              </Button>
              <Button
                variant={activeTab === "RECORDS" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg"
                onClick={() => setActiveTab("RECORDS")}
              >
                <Layers className="h-3.5 w-3.5 mr-1" />
                Warehouse Breakdown ({filteredRecords.length})
              </Button>
              <Button
                variant={activeTab === "MOVEMENTS" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg"
                onClick={() => setActiveTab("MOVEMENTS")}
              >
                <History className="h-3.5 w-3.5 mr-1" />
                Movement Log
              </Button>
              <Button
                variant={activeTab === "VALUATION" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs font-semibold rounded-lg"
                onClick={() => setActiveTab("VALUATION")}
              >
                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                Valuation
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Active Filter Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-muted/20 p-3 rounded-xl border border-border/50">
            {/* Search Input */}
            <div className="sm:col-span-4">
              <Input
                placeholder="Search by Product Name, SKU, Material..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="h-9 text-xs rounded-lg"
              />
            </div>

            {/* Warehouse Filter Dropdown */}
            <div className="sm:col-span-3">
              <select
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
              >
                <option value="ALL">All Warehouses ({warehouseList.length})</option>
                {warehouseList.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter Dropdown */}
            <div className="sm:col-span-3">
              <select
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories ({uniqueCategories.length})</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="sm:col-span-2 flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs font-semibold text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setCatalogSearch("");
                  setSelectedWarehouseId("ALL");
                  setSelectedCategory("ALL");
                  setActiveStatusFilter("All Stock");
                }}
              >
                Reset Filters
              </Button>
            </div>
          </div>

          {/* Quick Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-b pb-3">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Status:</span>
            {stockStatusFilters.map((filter) => (
              <Button
                key={filter}
                variant={activeStatusFilter === filter ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs font-semibold rounded-lg px-2.5"
                onClick={() => setActiveStatusFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>

          {/* Low Stock Warning Callout */}
          {lowStockItems.length > 0 && activeStatusFilter === "All Stock" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  {formatNumber(lowStockItems.length)} product variants have reached minimum threshold safety levels.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs border-amber-400 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50"
                onClick={() => setActiveStatusFilter("Low Stock")}
              >
                View Low Stock
              </Button>
            </div>
          )}

          {/* TAB 1: PRODUCT CATALOG */}
          {activeTab === "CATALOG" && (
            <DataTable
              columns={productColumns}
              data={filteredProducts}
              emptyMessage="No products matched your search or filters."
              hideSearch
              pageSize={15}
            />
          )}

          {/* TAB 2: WAREHOUSE BREAKDOWN */}
          {activeTab === "RECORDS" && (
            <DataTable
              columns={recordColumns}
              data={filteredRecords}
              emptyMessage="No inventory records found for the selected warehouse."
              hideSearch
              pageSize={15}
            />
          )}

          {/* TAB 3: MOVEMENT LOG */}
          {activeTab === "MOVEMENTS" && (
            <DataTable
              columns={movementColumns}
              data={inventoryMovements.data?.items || []}
              pageSize={10}
              emptyMessage="No recent stock movements recorded."
              hideSearch
            />
          )}

          {/* TAB 4: VALUATION BY CATEGORY */}
          {activeTab === "VALUATION" && (
            <div className="grid gap-4 md:grid-cols-2">
              {featuredValuationItems.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between p-4 bg-muted/30 border rounded-xl"
                >
                  <div>
                    <p className="font-bold text-sm text-foreground">{item.category}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatNumber(item.quantity)} units in physical stock
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono text-base text-primary">
                      {formatCurrency(item.totalValue)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">
                      Cost Basis Total
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
