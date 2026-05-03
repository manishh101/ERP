import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type DropdownAction<T> = {
  label: string;
  icon?: React.ReactNode;
  onClick?: (row: T) => void;
  href?: (row: T) => string;
  variant?: "default" | "destructive";
  separator?: boolean;
};

type DataTableProps<T> = {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  pageSize?: number;
  isLoading?: boolean;
  actions?: (row: T) => DropdownAction<T>[];
  onRowClick?: (row: T) => void;
  detailHref?: (row: T) => string;
  emptyMessage?: string;
  hideSearch?: boolean;
  hidePagination?: boolean;
  maxHeight?: string;
};

export function DataTable<T extends { id: string }>({
  columns: userColumns,
  data,
  searchPlaceholder = "Search...",
  pageSize = 20,
  isLoading = false,
  actions,
  onRowClick,
  detailHref,
  emptyMessage = "No records found.",
  hideSearch = false,
  hidePagination = false,
  maxHeight,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  // Append actions column if provided
  const columns = useMemo(() => {
    if (!actions) return userColumns;

    const actionsCol: ColumnDef<T, unknown> = {
      id: "_actions",
      header: "",
      cell: ({ row }) => {
        const rowActions = actions(row.original);
        if (rowActions.length === 0) return null;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {rowActions.map((action, idx) => {
                if (action.separator) {
                  return <DropdownMenuSeparator key={`sep-${idx}`} />;
                }

                const content = (
                  <>
                    {action.icon}
                    {action.label}
                  </>
                );

                if (action.href) {
                  return (
                    <DropdownMenuItem key={action.label} asChild>
                      <Link to={action.href(row.original)} className="flex items-center gap-2">
                        {content}
                      </Link>
                    </DropdownMenuItem>
                  );
                }

                return (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick?.(row.original);
                    }}
                    className={cn(
                      "flex items-center gap-2",
                      action.variant === "destructive" && "text-destructive focus:text-destructive",
                    )}
                  >
                    {content}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    };

    return [...userColumns, actionsCol];
  }, [userColumns, actions]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      columnFilters,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: { pageSize: hidePagination ? 99999 : pageSize },
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="rounded-lg border">
        <div className="p-4">
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="border-t">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Search */}
      {!hideSearch && (
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </div>
      )}

      {/* Table */}
      <div
        className="overflow-x-auto"
        style={hidePagination && maxHeight ? { maxHeight, overflowY: "auto" } : undefined}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground w-full"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex-1 text-left">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </div>
                        <ArrowUpDown className="h-3 w-3 shrink-0" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const firstCol = columns[0];
                return (
                  <TableRow
                    key={row.id}
                    className={cn(onRowClick && "cursor-pointer")}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell, cellIdx) => {
                      // Make first column a link if detailHref is provided
                      if (cellIdx === 0 && detailHref) {
                        return (
                          <TableCell key={cell.id}>
                            <Link
                              to={detailHref(row.original)}
                              className="font-medium text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </Link>
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!hidePagination && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()} · {table.getFilteredRowModel().rows.length} records
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {hidePagination && (
        <div className="border-t px-4 py-2">
          <p className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} records
          </p>
        </div>
      )}
    </div>
  );
}
