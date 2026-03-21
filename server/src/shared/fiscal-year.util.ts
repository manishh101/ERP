import NepaliDate from "nepali-datetime";

/**
 * Nepal fiscal year runs Shrawan 1 (mid-July) to Ashadh 31 (mid-July)
 * BS date format: "YYYY-MM-DD" e.g. "2081-09-15"
 */

export function getFiscalYearFromBsDate(bsDate: string): string {
  // bsDate format: "YYYY-MM-DD"
  const parts = bsDate.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);

  // If BS month >= 4 (Shrawan), fiscal year is "YYYY/(YYYY+1 % 100)"
  // If BS month < 4 (before Shrawan), fiscal year is "(YYYY-1)/YYYY % 100"
  if (month >= 4) {
    const nextYear = (year + 1) % 100;
    return `${year}/${nextYear.toString().padStart(2, "0")}`;
  } else {
    const prevYear = year - 1;
    const currentYearShort = year % 100;
    return `${prevYear}/${currentYearShort.toString().padStart(2, "0")}`;
  }
}

export function adDateToBs(adDate: Date = new Date()): string {
  const nepaliDate = new NepaliDate(adDate);
  return nepaliDate.format("YYYY-MM-DD");
}

export const getBsDate = adDateToBs;

export function getCurrentFiscalYear(adDate: Date = new Date()): string {
  const bsDate = adDateToBs(adDate);
  return getFiscalYearFromBsDate(bsDate);
}
