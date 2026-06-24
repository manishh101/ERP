import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import NepaliDate from "nepali-datetime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_CURRENCY = "NPR";

function normalizeCurrency(currency?: string) {
  const normalized = currency?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) && normalized !== "USD"
    ? normalized
    : DEFAULT_CURRENCY;
}

let globalCurrency = DEFAULT_CURRENCY;

export function setGlobalCurrency(currency: string) {
  globalCurrency = normalizeCurrency(currency);
}

/** Format currency in Nepali Lakhs/Crores system (e.g., NPR 1,50,000) */
export function formatCurrency(value: number, currency = globalCurrency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: normalizeCurrency(currency),
    maximumFractionDigits: 0,
  }).format(value);
}

/** Format number in Nepali grouping (Lakhs/Crores) */
export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

/** Format date as Bikram Sambat (YYYY-MM-DD) */
export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  try {
    const bsDate = new NepaliDate(date);
    return bsDate.format("YYYY-MM-DD");
  } catch {
    return "Invalid Date";
  }
}

/** Format date as AD for tooltips (YYYY-MM-DD) */
export function formatDateAD(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  try {
    return date.toISOString().split("T")[0];
  } catch {
    return "Invalid Date";
  }
}

/** Format date as full BS label (YYYY MMMM DD) for display */
export function formatDateFull(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  try {
    const bsDate = new NepaliDate(date);
    return bsDate.format("YYYY MMMM DD");
  } catch {
    return "Invalid Date";
  }
}

export function formatEnumLabel(value?: string | null) {
  if (!value) return "N/A";

  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Nepali month names (0-indexed) */
export const NEPALI_MONTHS = [
  "Baisakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
] as const;

/** Get the Nepali month name from a 0-based month index */
export function getNepaliMonthName(monthIndex: number): string {
  return NEPALI_MONTHS[monthIndex] ?? "Unknown";
}

/** Get current Bikram Sambat date as formatted string */
export function getCurrentBsDate(): string {
  try {
    const now = new NepaliDate(new Date());
    return now.format("YYYY-MM-DD");
  } catch {
    return "—";
  }
}

/** Get current Nepali fiscal year label (e.g., "FY 2081/82") */
export function getCurrentFiscalYear(): string {
  try {
    const now = new NepaliDate(new Date());
    const year = now.getYear();
    const month = now.getMonth(); // 0-indexed: 0=Baisakh ... 11=Chaitra
    // Nepal fiscal year: Shrawan (month 3) to Ashadh (month 2)
    // If month >= 3 (Shrawan), we are in FY year/(year+1)
    // If month < 3, we are in FY (year-1)/year
    if (month >= 3) {
      return `FY ${year}/${(year + 1) % 100}`;
    }
    return `FY ${year - 1}/${year % 100}`;
  } catch {
    return "—";
  }
}
