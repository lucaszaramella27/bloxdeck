import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef } from "react";

export const TooltipProvider = TooltipPrimitive.Provider;

export function Tooltip({
  children,
  content,
  side = "right",
}: {
  children: React.ReactNode;
  content: string;
  side?: ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>["side"];
}) {
  return (
    <TooltipPrimitive.Root delayDuration={320}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={7}
          className="z-[80] rounded-md bg-[var(--surface-overlay)] px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-xl shadow-black/30"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[var(--surface-overlay)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
