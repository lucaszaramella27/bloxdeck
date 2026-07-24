import { Expand, Gamepad2, RefreshCw, UserRound, UsersRound } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";

import { LaunchButton } from "@/components/games/LaunchButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useRobloxSocial, useStats } from "@/hooks/api-hooks";
import { compactNumber } from "@/lib/format";
import { setCompactWindow } from "@/lib/window-mode";

export function CompactPage() {
  const navigate = useNavigate();
  const profile = useProfile();
  const stats = useStats();
  const social = useRobloxSocial();
  const recentDeck = stats.data?.smartDecks.find((deck) => deck.id === "continue");
  const quickGames = recentDeck?.games.length
    ? recentDeck.games.slice(0, 4)
    : (stats.data?.roblox.trendingGames.slice(0, 4) ?? []);
  const onlineFriends = (social.data?.friends ?? []).filter((friend) => friend.presence.isOnline);

  useEffect(() => {
    void setCompactWindow(true);
    return () => document.body.classList.remove("compact-mode");
  }, []);

  const expand = async (path = "/") => {
    await setCompactWindow(false);
    void navigate(path);
  };

  return (
    <main className="flex h-full min-w-0 flex-col overflow-hidden bg-[var(--sidebar-bg)] text-slate-100">
      <header className="flex h-13 shrink-0 items-center gap-3 bg-[var(--panel-bg)] px-3">
        <img src="/favicon-48.png" alt="" className="h-8 w-8 rounded-md object-cover" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-bold text-white">BloxDeck</div>
          <div className="truncate text-[10px] text-slate-500">
            @{profile.data?.robloxUsername ?? profile.data?.handle ?? "roblox"}
          </div>
        </div>
        <Button type="button" variant="secondary" size="iconSm" title="Expandir" onClick={() => void expand()}>
          <Expand className="h-4 w-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <section className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-white">Acesso rápido</h1>
            <p className="mt-0.5 text-xs text-slate-500">
              {compactNumber(stats.data?.roblox.onlinePlayers ?? 0)} online no seu Deck
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            title="Atualizar"
            onClick={() => void Promise.all([stats.refetch(), social.refetch()])}
          >
            <RefreshCw className={`h-4 w-4 ${stats.isFetching || social.isFetching ? "animate-spin" : ""}`} />
          </Button>
        </section>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Gamepad2 className="h-4 w-4 text-ice-200" />
              Recentes
            </div>
            <button type="button" onClick={() => void expand("/history")} className="text-[10px] text-ice-200">
              Histórico
            </button>
          </div>

          {stats.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : quickGames.length ? (
            <div className="space-y-1.5">
              {quickGames.map((game) => (
                <div key={game.id} className="flex items-center gap-2.5 rounded-lg bg-[var(--panel-bg)] p-2">
                  <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md bg-[var(--panel-bg-hover)]">
                    {game.imageUrl ? (
                      <img src={game.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Gamepad2 className="m-3.5 h-4 w-4 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-white">{game.name}</div>
                    <div className="mt-1 text-[10px] text-lime-200">
                      {game.roblox?.playing != null ? `${compactNumber(game.roblox.playing)} online` : "Pronto para jogar"}
                    </div>
                  </div>
                  <LaunchButton game={game} size="sm" className="h-8 px-2.5 text-xs" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[var(--panel-bg)] py-8 text-center text-xs text-slate-500">
              Nenhum jogo recente
            </div>
          )}
        </section>

        <section className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <UsersRound className="h-4 w-4 text-cyan-200" />
              Amigos online
            </div>
            <Badge tone={onlineFriends.length ? "lime" : "slate"}>{onlineFriends.length}</Badge>
          </div>

          {social.isLoading ? (
            <Skeleton className="h-24" />
          ) : onlineFriends.length ? (
            <div className="grid grid-cols-4 gap-2">
              {onlineFriends.slice(0, 8).map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  title={friend.displayName}
                  onClick={() => void expand(`/profile/${friend.id}`)}
                  className="min-w-0 rounded-lg bg-[var(--panel-bg)] p-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-400/60"
                >
                  <div className="relative mx-auto h-10 w-10 overflow-hidden rounded-lg bg-[var(--surface-overlay)]">
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="m-3 h-4 w-4 text-slate-500" />
                    )}
                    <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-lime-300 ring-2 ring-[var(--panel-bg-strong)]" />
                  </div>
                  <div className="mt-1.5 truncate text-[10px] text-slate-300">{friend.displayName}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-lg bg-[var(--panel-bg)] py-7 text-center text-xs text-slate-500">
              Ninguém online agora
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
