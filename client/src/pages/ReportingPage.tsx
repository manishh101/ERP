import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomReportPreviewMutation, useReportsQuery } from "@/hooks/use-queries";
import { getErrorMessage } from "@/lib/api";
import type { ReportBuilderEntity } from "@/types/domain";

const reportBuilderPresets: Record<
  ReportBuilderEntity,
  {
    label: string;
    fields: string;
    filters: string;
    groupBy: string;
  }
> = {
  sales: {
    label: "Sales",
    fields: "orderId, customer, status, total, balanceDue",
    filters: "status=CONFIRMED",
    groupBy: "status",
  },
  inventory: {
    label: "Inventory",
    fields: "product, variant, warehouse, quantity, status",
    filters: "status=IN_STOCK",
    groupBy: "warehouse",
  },
  customers: {
    label: "Customers",
    fields: "customer, type, email, lifetimeRevenue, outstandingBalance",
    filters: "type=RETAIL",
    groupBy: "type",
  },
  suppliers: {
    label: "Suppliers",
    fields: "supplier, country, leadTimeDays, totalSpend",
    filters: "country=Nepal",
    groupBy: "country",
  },
  finance: {
    label: "Finance",
    fields: "entryId, date, description, sourceType, lineCount",
    filters: "sourceType=invoice",
    groupBy: "sourceType",
  },
};

function parseCsvList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFilterPairs(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((accumulator, item) => {
      const [key, ...rest] = item.split("=");
      const normalizedKey = key?.trim();
      const normalizedValue = rest.join("=").trim();

      if (normalizedKey && normalizedValue) {
        accumulator[normalizedKey] = normalizedValue;
      }

      return accumulator;
    }, {});
}

function formatColumnLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function renderPreviewValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function ReportingPage() {
  const { user } = useAuth();
  
  const { data, error, isLoading } = useReportsQuery();
  const previewMutation = useCustomReportPreviewMutation();
  const [entity, setEntity] = useState<ReportBuilderEntity>("sales");
  const [fields, setFields] = useState(reportBuilderPresets.sales.fields);
  const [filters, setFilters] = useState(reportBuilderPresets.sales.filters);
  const [groupBy, setGroupBy] = useState(reportBuilderPresets.sales.groupBy);

  if (user?.role !== "ADMIN" && user?.role !== "ACCOUNTANT" && user?.role !== "SALES") {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Reporting access required.</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Reporting and analytics are available to Admin, Accountant, and Sales roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-[420px]" />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-10">
          <p className="font-semibold">Reports could not be loaded.</p>
          <p className="mt-2 text-sm text-muted-foreground">{getErrorMessage(error)}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  function handleEntityChange(nextEntity: ReportBuilderEntity) {
    setEntity(nextEntity);
    setFields(reportBuilderPresets[nextEntity].fields);
    setFilters(reportBuilderPresets[nextEntity].filters);
    setGroupBy(reportBuilderPresets[nextEntity].groupBy);
    previewMutation.reset();
  }

  async function handlePreviewReport() {
    const fieldList = parseCsvList(fields);

    if (fieldList.length === 0) {
      toast("Fields required", { description: "Add at least one field to preview a custom report." });
      return;
    }

    previewMutation.reset();

    try {
      await previewMutation.mutateAsync({
        entity,
        fields: fieldList,
        filters: parseFilterPairs(filters),
        groupBy: parseCsvList(groupBy),
      });
    } catch (requestError) {
      toast.error("Preview failed", { description: getErrorMessage(requestError) });
    }
  }

  const previewData = previewMutation.data;
  const previewError = previewMutation.error
    ? getErrorMessage(previewMutation.error, "Unable to preview custom report.")
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reporting & Analytics"
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Report Library</CardTitle>
              <CardDescription>Live report modules with export-ready outputs and current metrics.</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {data.reportCards.map((report) => (
              <div key={report.id} className="rounded-3xl border border-border bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <p className="font-display text-2xl">{report.title}</p>
                  <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {report.exportLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{report.description}</p>
                <p className="mt-4 font-semibold">{report.summary}</p>
                <p className="mt-2 text-sm text-muted-foreground">{report.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Analytics Snapshot</CardTitle>
                <CardDescription>Key live indicators from the reporting stack.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {data.highlights.map((item) => (
                <div key={item.label} className="rounded-2xl bg-secondary/60 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 font-display text-3xl">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Custom Report Builder</CardTitle>
                <CardDescription>Choose a dataset preset, adjust fields and filters, then preview the first matching rows from the live builder endpoint.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(Object.keys(reportBuilderPresets) as ReportBuilderEntity[]).map((candidate) => (
                  <Button
                    key={candidate}
                    type="button"
                    variant={entity === candidate ? "default" : "outline"}
                    onClick={() => handleEntityChange(candidate)}
                  >
                    {reportBuilderPresets[candidate].label}
                  </Button>
                ))}
              </div>
              <Input
                value={fields}
                onChange={(event) => setFields(event.target.value)}
                placeholder="Fields: invoiceNumber, customer, total"
              />
              <Input
                value={filters}
                onChange={(event) => setFilters(event.target.value)}
                placeholder="Filters: status=paid, category=Sofa"
              />
              <Input
                value={groupBy}
                onChange={(event) => setGroupBy(event.target.value)}
                placeholder="Group by: category, salesperson"
              />
              <Button
                className="w-full"
                onClick={handlePreviewReport}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending ? "Previewing..." : "Preview Report"}
              </Button>

              {previewError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {previewError}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Preview Results</CardTitle>
            <CardDescription>
              {previewData
                ? `Showing ${previewData.previewRows.length} of ${previewData.totalRows} matching ${reportBuilderPresets[previewData.entity].label.toLowerCase()} rows.`
                : "Run a custom preview to inspect row-level results before wiring exports or saved report presets."}
            </CardDescription>
          </div>
          {previewData ? (
            <span className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {previewData.exportLabel}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {previewMutation.isPending ? (
            <Skeleton className="h-[280px]" />
          ) : previewData ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-full bg-secondary px-3 py-1">
                  Fields: {previewData.fields.join(", ")}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1">
                  Group by: {previewData.groupBy.join(", ") || "None"}
                </span>
                <span className="rounded-full bg-secondary px-3 py-1">
                  Filters:{" "}
                  {Object.entries(previewData.filters)
                    .map(([key, value]) => `${key}=${renderPreviewValue(value)}`)
                    .join(", ") || "None"}
                </span>
              </div>

              {previewData.previewRows.length > 0 ? (
                <div className="overflow-hidden rounded-3xl border border-border bg-white">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {previewData.previewColumns.map((column) => (
                            <TableHead key={column}>{formatColumnLabel(column)}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewData.previewRows.map((row, rowIndex) => (
                          <TableRow key={`${previewData.entity}-${rowIndex}`}>
                            {previewData.previewColumns.map((column) => (
                              <TableCell key={`${rowIndex}-${column}`}>
                                {renderPreviewValue(row[column])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl bg-secondary/60 p-6 text-sm text-muted-foreground">
                  No rows matched the current field and filter combination.
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-3xl bg-secondary/60 p-6 text-sm text-muted-foreground">
              Select a report preset, adjust the requested fields, and preview the data here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
