import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import NepaliDate from "nepali-datetime";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "NPR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "N/A";
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
