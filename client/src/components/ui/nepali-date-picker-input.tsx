import React, { useState, useEffect } from "react";
import NepaliDate from "nepali-datetime";
// @ts-ignore Ignore missing types for this specific library
import NepaliDatePicker from "@sbmdkl/nepali-datepicker-reactjs";
import "@sbmdkl/nepali-datepicker-reactjs/dist/index.css";
import { cn } from "@/lib/utils";

interface NepaliDatePickerInputProps {
  value?: Date | string; // The standard Date or ISO string
  onChange: (date: Date) => void;
  className?: string;
  placeholder?: string;
}

export function NepaliDatePickerInput({ value, onChange, className, placeholder = "Select Date (BS)" }: NepaliDatePickerInputProps) {
  const [bsDateStr, setBsDateStr] = useState("");

  useEffect(() => {
    if (value) {
      try {
        const parsed = typeof value === "string" ? new Date(value) : value;
        const nd = new NepaliDate(parsed);
        // ensure consistent zero-padded formatting expected by the picker
        setBsDateStr(nd.format("YYYY-MM-DD"));
      } catch (e) {
        // ignore invalid dates
      }
    }
  }, [value]);

  const handleDateChange = (data: any) => {
    let bsStr = "";
    let adDateObj: Date | null = null;

    if (typeof data === "string") {
      bsStr = data;
    } else if (data && typeof data === "object") {
      bsStr = data.bsDate || "";
      if (data.adDate) {
        // adDate may be ISO string or YYYY-MM-DD
        adDateObj = new Date(data.adDate);
      }
    }

    if (bsStr) {
      setBsDateStr(bsStr);
      try {
        if (adDateObj && !isNaN(adDateObj.getTime())) {
          onChange(adDateObj);
        } else {
          const nd = new NepaliDate(bsStr);
          const timestamp = nd.getTime();
          if (!isNaN(timestamp)) {
            onChange(new Date(timestamp));
          }
        }
      } catch (e) {
        console.error("NepaliDate conversion error:", e);
      }
    }
  };

  return (
    <div className={cn("relative w-full nepali-picker-wrapper", className)}>
      <NepaliDatePicker
        inputClassName="flex h-12 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={bsDateStr}
        onChange={handleDateChange}
        options={{ calenderLocale: "en", valueLocale: "en" }}
      />
    </div>
  );
}
