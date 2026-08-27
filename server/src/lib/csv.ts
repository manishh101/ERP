import { Response } from "express";

/**
 * Convert array of objects to CSV string
 */
export function toCSV<T extends Record<string, any>>(
  data: T[],
  columns?: (keyof T)[]
): string {
  if (data.length === 0) return "";
  
  const keys = columns || (Object.keys(data[0]) as (keyof T)[]);
  const header = keys.join(",");
  
  const rows = data.map(row => 
    keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return "";
      if (typeof value === "object") return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    }).join(",")
  );
  
  return [header, ...rows].join("\n");
}

/**
 * Send CSV download response
 */
export function sendCSV(response: Response, filename: string, csv: string): void {
  response.setHeader("Content-Type", "text/csv; charset=utf-8");
  response.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  response.send(csv);
}

/**
 * Convert flat object to CSV (for summary reports)
 */
export function objectToCSV(obj: Record<string, any>, filename: string, response: Response): void {
  const rows = Object.entries(obj).map(([key, value]) => 
    `${key},${value === null || value === undefined ? "" : String(value)}`
  );
  const csv = ["Field,Value", ...rows].join("\n");
  sendCSV(response, filename, csv);
}
