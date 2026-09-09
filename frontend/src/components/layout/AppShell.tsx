import { Outlet, useLocation } from "react-router";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";

export function AppShell() {
  const location = useLocation();

  return (
    <div className="flex h-full overflow-hidden text-slate-100">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col bg-[var(--app-bg)]">
        <Topbar />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div key={location.pathname} className="page-fade">
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalSearchDialog />
    </div>
  );
}
