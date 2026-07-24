import { Outlet } from "react-router";

import { Titlebar } from "@/components/layout/Titlebar";
import { ToastViewport } from "@/components/ui/toast-viewport";

export function DesktopFrame() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--app-bg)]">
      <Titlebar />
      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
      <ToastViewport />
    </div>
  );
}
