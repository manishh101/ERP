import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TableColumn } from "@/types/domain";

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  detailHref,
  searchPlaceholder = "Search records",
  pageSize = 8,
  selectedId,
  onSelectRow,
}: {
  columns: Array<TableColumn<T>>;
  rows: T[];
  detailHref?: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  selectedId?: string;
  onSelectRow?: (id: string | undefined) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(String(columns[0]?.key ?? "id"));
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const searchableRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return rows;
    }

    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? "").toLowerCase().includes(normalizedSearch)),
    );
  }, [rows, search]);

  const sortedRows = useMemo(() => {
    const nextRows = [...searchableRows];

    nextRows.sort((left, right) => {
      const leftValue = left[sortKey as keyof T];
      const rightValue = right[sortKey as keyof T];

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc" ? leftValue - rightValue : rightValue - leftValue;
      }

      const comparison = String(leftValue ?? "").localeCompare(String(rightValue ?? ""), undefined, {
        numeric: true,
        sensitivity: "base",
      });

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return nextRows;
  }, [searchableRows, sortDirection, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white/90">
      <div className="flex flex-col gap-3 border-b border-border/70 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="flex h-11 rounded-full border border-border bg-white/80 px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={sortKey}
            onChange={(event) => {
              setSortKey(event.target.value);
              setPage(1);
            }}
          >
            {columns.map((column) => (
              <option key={String(column.key)} value={String(column.key)}>
                Sort by {column.header}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
          >
            {sortDirection === "asc" ? "Ascending" : "Descending"}
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectRow && <TableHead className="w-10 px-4"></TableHead>}
            {columns.map((column) => (
              <TableHead key={String(column.key)} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRows.map((row) => (
            <TableRow 
              key={row.id} 
              className={selectedId === row.id ? "bg-primary/5 active:bg-primary/10 transition-colors" : "cursor-pointer hover:bg-muted/50"}
              onClick={() => {
                if (onSelectRow) {
                  onSelectRow(selectedId === row.id ? undefined : row.id);
                }
              }}
            >
              {onSelectRow && (
                <TableCell className="w-10 px-4">
                  <input
                    type="radio"
                    checked={selectedId === row.id}
                    onChange={() => {}} // Controlled by row onClick
                    className="h-4 w-4 accent-primary cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRow(selectedId === row.id ? undefined : row.id);
                    }}
                  />
                </TableCell>
              )}
              {columns.map((column, index) => {
                const content = column.render ? column.render(row) : String(row[column.key as keyof T] ?? "");

                if (index === 0 && detailHref) {
                  return (
                    <TableCell key={String(column.key)} className={column.className}>
                      <Link to={detailHref(row)} className="font-semibold text-primary hover:underline">
                        {content}
                      </Link>
                    </TableCell>
                  );
                }

                return <TableCell key={String(column.key)} className={column.className}>{content}</TableCell>;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-border/70 px-4 py-3 text-sm text-muted-foreground">
        <span>
          Page {currentPage} of {totalPages} · {sortedRows.length} records
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="px-3 py-1.5"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            className="px-3 py-1.5"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
