import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/cn";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;

export function ContextMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn(
          "z-[75] min-w-44 rounded-lg bg-[var(--surface-overlay)] p-1.5 text-sm text-slate-200 shadow-2xl shadow-black/40 outline-none",
          className,
        )}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

export function ContextMenuItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item>) {
  return (
    <ContextMenuPrimitive.Item
      className={cn(
        "flex h-9 cursor-default select-none items-center gap-2 rounded-md px-2.5 text-sm outline-none transition-colors duration-100 data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white",
        className,
      )}
      {...props}
    />
  );
}
