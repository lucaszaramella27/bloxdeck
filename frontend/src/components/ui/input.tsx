import * as React from "react";

import { cn } from "@/lib/cn";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg bg-[var(--surface-input)] px-3 text-sm text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-slate-500 focus:bg-[var(--surface-muted)] focus:ring-2 focus:ring-deck-300/25",
        className,
      )}
      {...props}
    />
  ),
);

Input.displayName = "Input";
