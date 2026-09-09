import { CheckCircle2, Info, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useToastStore } from "@/store/useToastStore";

export function ToastViewport() {
  const items = useToastStore((state) => state.items);
  const remove = useToastStore((state) => state.remove);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(340px,calc(100vw-32px))] flex-col gap-2">
      {items.map((item) => {
        const Icon = item.tone === "success" ? CheckCircle2 : item.tone === "danger" ? XCircle : Info;
        return (
          <div
            key={item.id}
            className="toast-entry pointer-events-auto flex items-start gap-3 rounded-lg bg-[var(--surface-overlay)] p-3.5 shadow-lg shadow-black/30"
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                item.tone === "success"
                  ? "text-lime-200"
                  : item.tone === "danger"
                    ? "text-rose-200"
                    : "text-ice-200",
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">{item.title}</div>
              {item.description ? (
                <div className="mt-1 text-xs leading-5 text-slate-400">{item.description}</div>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              className="-mr-1 -mt-1"
              aria-label="Fechar aviso"
              onClick={() => remove(item.id)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
