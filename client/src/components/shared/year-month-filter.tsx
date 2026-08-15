import { useMemo } from "react";
import NepaliDate from "nepali-datetime";
import { CalendarDays, ChevronDown } from "lucide-react";

const NEPALI_YEARS = ["2079", "2080", "2081", "2082", "2083", "2084", "2085"];
const NEPALI_MONTHS = [
  { value: "01", label: "01 - Baisakh" },
  { value: "02", label: "02 - Jestha" },
  { value: "03", label: "03 - Ashadh" },
  { value: "04", label: "04 - Shrawan" },
  { value: "05", label: "05 - Bhadra" },
  { value: "06", label: "06 - Ashwin" },
  { value: "07", label: "07 - Kartik" },
  { value: "08", label: "08 - Mangsir" },
  { value: "09", label: "09 - Poush" },
  { value: "10", label: "10 - Magh" },
  { value: "11", label: "11 - Falgun" },
  { value: "12", label: "12 - Chaitra" },
];

type Props = {
  year: string;
  month: string;
  onYearChange: (v: string) => void;
  onMonthChange: (v: string) => void;
};

export function YearMonthFilter({ year, month, onYearChange, onMonthChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />

      {/* Year */}
      <div className="relative">
        <select
          value={year}
          onChange={(e) => {
            onYearChange(e.target.value);
            // reset month when year changes
            if (!e.target.value) onMonthChange("");
          }}
          className="h-9 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
        >
          <option value="">All Years</option>
          {NEPALI_YEARS.map((y) => (
            <option key={y} value={y}>
              {y} BS
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {/* Month — only shown when a year is selected */}
      {year && (
        <div className="relative">
          <select
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="h-9 appearance-none rounded-lg border border-border bg-white pl-3 pr-8 text-sm font-medium text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            <option value="">All Months</option>
            {NEPALI_MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}


type DateLike = string | Date | null | undefined;

function toNepaliYearMonth(value: DateLike) {
  if (!value) return null;

  if (typeof value === "string") {
    const bsMatch = value.match(/^(\d{4})-(\d{1,2})/);
    const maybeBsYear = bsMatch ? Number(bsMatch[1]) : 0;

    if (bsMatch && maybeBsYear >= 2060) {
      return {
        year: bsMatch[1],
        month: bsMatch[2].padStart(2, "0"),
      };
    }
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;

  try {
    const bsDate = new NepaliDate(date);
    return {
      year: String(bsDate.getYear()),
      month: String(bsDate.getMonth() + 1).padStart(2, "0"),
    };
  } catch {
    return null;
  }
}

export function matchesYearMonth(value: DateLike, year: string, month: string) {
  if (!year) return true;

  const parts = toNepaliYearMonth(value);
  if (!parts) return false;

  return parts.year === year && (!month || parts.month === month);
}

export function useYearMonthFilteredRows<T>(
  rows: T[],
  getDate: (row: T) => DateLike,
  year: string,
  month: string,
) {
  return useMemo(
    () => rows.filter((row) => matchesYearMonth(getDate(row), year, month)),
    [rows, getDate, year, month],
  );
}
