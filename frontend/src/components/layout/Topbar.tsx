import { Search, Server, UserRound } from "lucide-react";

import { useHealth, useProfile } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/store/useUiStore";

export function Topbar() {
  const search = useUiStore((state) => state.search);
  const setSearch = useUiStore((state) => state.setSearch);
  const health = useHealth();
  const profile = useProfile();

  const online = health.data?.ok;

  return (
    <header className="flex h-20 shrink-0 items-center gap-4 border-b border-white/10 bg-black/20 px-6 backdrop-blur-xl">
      <div className="relative min-w-[320px] max-w-xl flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar jogos, ids ou Roblox"
          className="h-11 w-full rounded-lg border border-white/10 bg-white/10 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60 focus:bg-white/15 focus:ring-2 focus:ring-cyan-300/15"
        />
      </div>

      <div
        className={cn(
          "flex h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold",
          online
            ? "border-lime-300/30 bg-lime-300/10 text-lime-100"
            : "border-amber-300/30 bg-amber-300/10 text-amber-100",
        )}
      >
        <Server className="h-4 w-4" />
        {online ? "API online" : "API local"}
      </div>

      <div className="flex h-10 items-center gap-3 rounded-lg border border-white/10 bg-white/10 px-3">
        {profile.data?.avatarUrl ? (
          <img
            src={profile.data.avatarUrl}
            alt=""
            className="h-7 w-7 rounded-lg object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
            <UserRound className="h-4 w-4" />
          </div>
        )}
        <span className="max-w-32 truncate text-sm font-medium text-white">
          {profile.data?.displayName ?? "Local Player"}
        </span>
      </div>
    </header>
  );
}
