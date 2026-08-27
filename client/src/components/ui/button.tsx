import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
  loading?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", asChild = false, loading = false, disabled, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? "span" : "button";
    return (
      <Comp
        ref={ref as any}
        disabled={asChild ? undefined : disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
          // Variants
          variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
          variant === "secondary" && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
          variant === "outline" &&
            "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
          variant === "ghost" && "hover:bg-accent hover:text-accent-foreground",
          variant === "destructive" && "bg-destructive text-destructive-foreground hover:bg-destructive/90",
          variant === "link" && "text-primary underline-offset-4 hover:underline p-0 h-auto font-medium",
          // Sizes
          size === "default" && variant !== "link" && "h-10 px-4 py-2",
          size === "sm" && variant !== "link" && "h-9 px-3 text-xs",
          size === "lg" && variant !== "link" && "h-11 px-6 text-base",
          size === "icon" && "h-10 w-10",
          className,
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </Comp>
    );
  },
);

Button.displayName = "Button";
