import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BarChart3,
  Box,
  Edit,
  History,
  ImagePlus,
  Layers,
  Loader2,
  PackageSearch,
  Percent,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useProductDetailQuery,
  useUpdateProductMutation,
  useUploadProductImagesMutation,
  useDeleteProductImageMutation,
} from "@/hooks/use-queries";
import { getErrorMessage, API_BASE_URL } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

/* ─ Helpers ─────────────────────────────────────── */
function imgSrc(url: string) {
  return `${API_BASE_URL.replace(/\/api\/?$/, "")}${url}`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: "green" | "amber" | "blue" | "purple";
}) {
  const colorMap = {
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
  };
  const iconClass = accent ? colorMap[accent] : "bg-secondary text-muted-foreground";
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5">
      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-xl font-bold tracking-tight">{value}</p>
      </div>
    </div>
  );
}

/* ─ Edit Panel ───────────────────────────────────── */
function EditPanel({
  product,
  onClose,
}: {
  product: NonNullable<ReturnType<typeof useProductDetailQuery>["data"]>;
  onClose: () => void;
}) {
  const updateProduct = useUpdateProductMutation();
  const [form, setForm] = useState({
    name: product.name,
    description: product.description === "No product description has been added yet." ? "" : product.description,
    category: product.category,
    material: product.material,
    costPrice: product.costPrice.toString(),
    sellingPrice: product.sellingPrice.toString(),
    status: product.status === "Active" ? "ACTIVE" : "DISCONTINUED",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    try {
      await updateProduct.mutateAsync({
        id: product.id,
        payload: {
          name: form.name,
          description: form.description || undefined,
          category: form.category,
          material: form.material || undefined,
          costPrice: Number(form.costPrice),
          sellingPrice: Number(form.sellingPrice),
          status: form.status,
        },
      });
      toast.success("Product updated successfully");
      onClose();
    } catch (e) {
      toast.error("Update failed", { description: getErrorMessage(e) });
    }
  };

  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1";

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle>Edit Product</CardTitle>
          <CardDescription>Update the core product details.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={labelCls}>Product Name *</label>
          <Input value={form.name} onChange={set("name")} />
        </div>
        <div>
          <label className={labelCls}>Category *</label>
          <Input value={form.category} onChange={set("category")} />
        </div>
        <div>
          <label className={labelCls}>Material</label>
          <Input value={form.material} onChange={set("material")} />
        </div>
        <div>
          <label className={labelCls}>Cost Price (NPR) *</label>
          <Input type="number" value={form.costPrice} onChange={set("costPrice")} />
        </div>
        <div>
          <label className={labelCls}>Selling Price (NPR) *</label>
          <Input type="number" value={form.sellingPrice} onChange={set("sellingPrice")} />
        </div>
        <div>
          <label className={labelCls}>Status</label>
          <select
            className="flex h-10 w-full rounded-xl border border-border bg-white px-3 text-sm"
            value={form.status}
            onChange={set("status")}
          >
            <option value="ACTIVE">Active</option>
            <option value="DISCONTINUED">Discontinued</option>
          </select>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className={labelCls}>Description</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
            value={form.description}
            onChange={set("description")}
          />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
          <Button onClick={handleSave} disabled={updateProduct.isPending}>
            {updateProduct.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─ Image Gallery ─────────────────────────────────── */
function ImageGallery({ productId, imageUrls }: { productId: string; imageUrls: string[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadImages = useUploadProductImagesMutation();
  const deleteImage = useDeleteProductImageMutation();
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      await uploadImages.mutateAsync({ id: productId, files: e.target.files });
      toast.success(`${e.target.files.length} image(s) uploaded`);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error("Upload failed", { description: getErrorMessage(err) });
    }
  };

  const handleDelete = async (url: string) => {
    try {
      await deleteImage.mutateAsync({ id: productId, url });
      toast.success("Image removed");
      if (preview === url) setPreview(null);
    } catch (err) {
      toast.error("Delete failed", { description: getErrorMessage(err) });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-muted-foreground" />
            Product Images
          </CardTitle>
          <CardDescription>Photos of the product for reference.</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadImages.isPending}
        >
          {uploadImages.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </CardHeader>
      <CardContent>
        {imageUrls.length === 0 ? (
          <div
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-10 text-muted-foreground hover:border-primary/40"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-10 w-10 opacity-40" />
            <p className="text-sm">Click to upload product photos</p>
            <p className="text-xs opacity-60">JPEG, PNG or WebP • Max 5 MB per file</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {imageUrls.map((url) => (
              <div key={url} className="group relative overflow-hidden rounded-xl border border-border">
                <img
                  src={imgSrc(url)}
                  alt=""
                  className="aspect-square w-full cursor-pointer object-cover transition-transform group-hover:scale-105"
                  onClick={() => setPreview(url)}
                />
                <button
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleDelete(url)}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <div
              className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border py-4 text-muted-foreground hover:border-primary/40"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlus className="h-5 w-5" />
              <span className="text-xs">Add more</span>
            </div>
          </div>
        )}
      </CardContent>

      {/* Full-screen Preview */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <img
            src={imgSrc(preview)}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" onClick={() => setPreview(null)}>
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </Card>
  );
}

/* ─ Main Page ────────────────────────────────────── */
export function ProductDetailPage() {
  const { productId } = useParams();
  const { data: product, error, isLoading } = useProductDetailQuery(productId);
  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-72" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold text-destructive">Product details could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!product) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-8 w-8" asChild>
            <Link to="/inventory"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <PageHeader title={product.name} />
            <StatusBadge value={product.status} />
          </div>
        </div>
        <Button
          variant={isEditing ? "outline" : "default"}
          className="gap-2"
          onClick={() => setIsEditing((e) => !e)}
        >
          <Edit className="h-4 w-4" />
          {isEditing ? "Cancel" : "Edit Product"}
        </Button>
      </div>

      {/* Category / Material breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">{product.category}</span>
        {product.material && (
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold capitalize">{product.material}</span>
        )}
      </div>

      {/* Edit Panel */}
      {isEditing && <EditPanel product={product} onClose={() => setIsEditing(false)} />}

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Selling Price" value={formatCurrency(product.sellingPrice)} icon={Tag} accent="blue" />
        <StatCard label="Cost Price" value={formatCurrency(product.costPrice)} icon={Tag} accent="purple" />
        <StatCard
          label="Gross Margin"
          value={`${product.margin}%`}
          icon={Percent}
          accent={product.margin >= 30 ? "green" : "amber"}
        />
        <StatCard
          label="Total Stock"
          value={`${product.totalStock} units`}
          icon={Box}
          accent={product.totalStock > 0 ? "green" : "amber"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        {/* Left */}
        <div className="space-y-6">
          {/* Image Gallery */}
          <ImageGallery productId={product.id} imageUrls={product.imageUrls} />

          {/* Variants & Stock */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-muted-foreground" />
                Variants & Warehouse Stock
              </CardTitle>
              <CardDescription>
                Each variant with live factory outlet stock levels.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.variantRows.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No variants have been configured yet.</p>
              ) : (
                product.variantRows.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border bg-white p-4">
                    <div>
                      <p className="font-semibold">{item.variant}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.warehouse}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold tabular-nums ${item.quantity === 0 ? "text-red-500" : item.quantity <= 5 ? "text-amber-500" : "text-emerald-600"}`}>
                        {item.quantity}
                      </p>
                      <p className="text-xs text-muted-foreground">units</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Movement History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-muted-foreground" />
                Recent Movement & Sales History
              </CardTitle>
              <CardDescription>Latest stock movements and reservations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {product.history.map((event) => (
                <div key={event.id} className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  </div>
                  <p className="text-foreground">{event.label}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageSearch className="h-5 w-5 text-muted-foreground" />
                Product Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">{product.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                Margin Snapshot
              </CardTitle>
              <CardDescription>Profitability metrics across recent sales.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.metrics.map((metric) => (
                <div key={metric.label} className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                  <span className="font-bold">{metric.value}</span>
                </div>
              ))}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Margin Utilization</span>
                  <span className="font-bold text-foreground">{product.margin}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all ${product.margin >= 40 ? "bg-emerald-500" : product.margin >= 20 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(product.margin, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-secondary/50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variants</p>
                  <p className="mt-1 text-lg font-bold">{product.variantRows.length}</p>
                </div>
                <div className="rounded-xl bg-secondary/50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Units Sold</p>
                  <p className="mt-1 text-lg font-bold">{product.recentSalesQty}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
