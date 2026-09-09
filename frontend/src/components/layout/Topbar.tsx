import { Search, UserRound } from "lucide-react";
import { Link } from "react-router";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { Tooltip } from "@/components/ui/tooltip";
import { useProfile } from "@/hooks/api-hooks";
import { useUiStore } from "@/store/useUiStore";

export function Topbar() {
  const search = useUiStore((state) => state.search);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const profile = useProfile();

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 bg-[var(--surface-topbar)] px-5 shadow-sm shadow-black/20">
      <div className="hidden w-40 min-w-0 2xl:block">
        <Breadcrumbs />
      </div>

      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        className="relative flex h-10 min-w-[280px] max-w-xl flex-1 items-center rounded-lg bg-white/[0.055] pl-10 pr-3 text-left text-sm outline-none transition-colors duration-100 hover:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-deck-300/45"
      >
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
        <span className={search ? "truncate text-slate-300" : "truncate text-slate-600"}>
          {search || "Buscar jogos, amigos e coleções"}
        </span>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <NotificationCenter />

        <Tooltip content="Abrir perfil" side="bottom">
          <Link
            to="/profile"
            className="flex h-9 items-center gap-2.5 rounded-lg bg-white/[0.045] px-2.5 transition-colors duration-100 hover:bg-white/[0.07]"
          >
            {profile.data?.avatarUrl ? (
              <img src={profile.data.avatarUrl} alt="" className="h-6 w-6 rounded-md object-cover" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-ice-100/[0.09] text-ice-200">
                <UserRound className="h-3.5 w-3.5" />
              </div>
            )}
            <span className="hidden max-w-28 truncate text-xs font-medium text-slate-300 xl:block">
              {profile.data?.displayName ?? profile.data?.robloxUsername ?? "Conta Roblox"}
            </span>
          </Link>
        </Tooltip>
      </div>
    </header>
  );
}
