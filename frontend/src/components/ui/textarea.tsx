import * as React from "react";

import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full resize-none rounded-lg bg-[var(--surface-input)] px-3 py-2 text-sm text-white shadow-inner shadow-black/20 outline-none transition placeholder:text-slate-500 focus:bg-[var(--surface-muted)] focus:ring-2 focus:ring-deck-300/25",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
