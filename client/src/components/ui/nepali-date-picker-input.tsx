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

  const handleDateChange = (bsStr: string) => {
    setBsDateStr(bsStr);
    try {
      // The nepali-datetime parser supports YYYY-MM-DD
      const nd = new NepaliDate(bsStr);
      onChange(new Date(nd.getTime()));
    } catch (e) {
      // Invalid format, ignore
    }
  };

  return (
    <div className={cn("relative w-full nepali-picker-wrapper", className)}>
      <NepaliDatePicker
        inputClassName="flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        value={bsDateStr}
        onChange={handleDateChange}
        options={{ calenderLocale: "en", valueLocale: "en" }}
      />
    </div>
  );
}
