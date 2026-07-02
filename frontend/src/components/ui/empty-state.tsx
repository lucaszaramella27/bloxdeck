import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/cn";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-panel flex min-h-[260px] flex-col items-center justify-center rounded-lg px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-cyan-200">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-slate-400">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
