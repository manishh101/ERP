import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatCurrency, formatDate, formatDateAD } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/** Currency column — right-aligned, Nepali Lakhs format */
export function currencyColumn<T>(
  accessorKey: keyof T & string,
  header: string,
): ColumnDef<T, unknown> {
  return {
    accessorKey,
    header: () => <div className="text-right">{header}</div>,
    cell: ({ row }) => {
      const value = row.getValue(accessorKey) as number;
      return <div className="text-right font-medium tabular-nums">{formatCurrency(value)}</div>;
    },
  };
}

/** BS Date column — Bikram Sambat with AD tooltip */
export function dateColumn<T>(
  accessorKey: keyof T & string,
  header: string,
): ColumnDef<T, unknown> {
  return {
    accessorKey,
    header,
    cell: ({ row }) => {
      const value = row.getValue(accessorKey) as string | null;
      if (!value) return <span className="text-muted-foreground">—</span>;

      const bsDate = formatDate(value);
      const adDate = formatDateAD(value);

      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-default tabular-nums">{bsDate}</span>
          </TooltipTrigger>
          <TooltipContent>AD: {adDate}</TooltipContent>
        </Tooltip>
      );
    },
  };
}

/** Status column — auto-colored badge */
export function statusColumn<T>(
  accessorKey: keyof T & string,
  header: string = "Status",
): ColumnDef<T, unknown> {
  return {
    accessorKey,
    header,
    cell: ({ row }) => {
      const value = row.getValue(accessorKey) as string;
      return <StatusBadge value={value} />;
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  };
}

/** Text column — simple accessor */
export function textColumn<T>(
  accessorKey: keyof T & string,
  header: string,
  opts?: { className?: string },
): ColumnDef<T, unknown> {
  return {
    accessorKey,
    header,
    cell: ({ row }) => {
      const value = row.getValue(accessorKey) as string;
      return <span className={opts?.className}>{value}</span>;
    },
  };
}

/** Custom render column */
export function renderColumn<T>(
  id: string,
  header: string,
  render: (row: T) => ReactNode,
): ColumnDef<T, unknown> {
  return {
    id,
    header,
    cell: ({ row }) => render(row.original),
  };
}
