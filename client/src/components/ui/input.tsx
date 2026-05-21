import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, onWheel, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-border bg-white/90 px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onWheel={(e) => {
        if (props.type === "number") {
          (e.target as HTMLInputElement).blur();
        }
        if (onWheel) {
          onWheel(e);
        }
      }}
      {...props}
    />
  ),
);

Input.displayName = "Input";
