import { Maximize2, Minus, X } from "lucide-react";
import { useLocation } from "react-router";

import { runWindowAction } from "@/lib/window-mode";

export function Titlebar() {
  const location = useLocation();
  const compact = location.pathname === "/compact";

  return (
    <div
      className="flex h-9 shrink-0 select-none items-center bg-[var(--app-bg)] text-slate-500"
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        void runWindowAction(event.detail === 2 ? "toggle_maximize" : "start_dragging");
      }}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 px-3 text-[11px] font-semibold">
        <img src="/favicon-16x16.png" alt="" className="h-4 w-4 rounded-sm object-cover" />
        <span className="text-slate-400">BloxDeck</span>
        {compact ? <span className="text-slate-700">Compacto</span> : null}
      </div>
      <div className="flex h-full" onMouseDown={(event) => event.stopPropagation()}>
        <WindowButton label="Minimizar" onClick={() => void runWindowAction("minimize")}>
          <Minus className="h-3.5 w-3.5" />
        </WindowButton>
        <WindowButton label="Maximizar" onClick={() => void runWindowAction("toggle_maximize")}>
          <Maximize2 className="h-3 w-3" />
        </WindowButton>
        <WindowButton label="Fechar" danger onClick={() => void runWindowAction("close")}>
          <X className="h-3.5 w-3.5" />
        </WindowButton>
      </div>
    </div>
  );
}

function WindowButton({
  children,
  label,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex h-full w-11 items-center justify-center transition-colors duration-100 ${
        danger ? "hover:bg-rose-600 hover:text-white" : "hover:bg-white/[0.08] hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
