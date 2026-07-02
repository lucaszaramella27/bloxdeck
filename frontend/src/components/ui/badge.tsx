import type * as React from "react";

import { cn } from "@/lib/cn";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "cyan" | "lime" | "amber" | "rose" | "slate";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  cyan: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100",
  lime: "border-lime-300/30 bg-lime-300/10 text-lime-100",
  amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
  rose: "border-rose-300/30 bg-rose-300/10 text-rose-100",
  slate: "border-white/10 bg-white/10 text-slate-200",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
