import * as React from "react";

import { cn } from "@/lib/cn";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-28 w-full resize-none rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-white/15 focus:ring-2 focus:ring-cyan-300/15",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";
