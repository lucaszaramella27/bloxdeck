import type * as React from "react";

import { cn } from "@/lib/cn";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "cyan" | "lime" | "amber" | "rose" | "slate";
};

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  cyan: "bg-cyan-300/[0.13] text-cyan-100",
  lime: "bg-lime-300/[0.115] text-lime-100",
  amber: "bg-amber-300/[0.115] text-amber-100",
  rose: "bg-rose-300/[0.115] text-rose-100",
  slate: "bg-white/[0.075] text-slate-200",
};

export function Badge({ className, tone = "slate", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-lg px-2.5 text-xs font-medium shadow-sm shadow-black/10",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
