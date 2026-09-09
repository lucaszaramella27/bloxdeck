import {
  Activity,
  ArrowRight,
  CalendarDays,
  Crown,
  Gamepad2,
  Sparkles,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useRobloxSocial } from "@/hooks/api-hooks";
import { compactNumber, formatDateTime } from "@/lib/format";
import type { Stats } from "@/types";

type DashboardIntelligenceProps = {
  stats?: Stats;
  isLoading: boolean;
};

export function DashboardIntelligence({ stats, isLoading }: DashboardIntelligenceProps) {
  const social = useRobloxSocial();
  const friendsInGame = (social.data?.friends ?? []).filter((friend) => friend.presence.isInGame);
  const radarItems = [
    ...friendsInGame.slice(0, 3).map((friend) => ({
      id: `friend-${friend.id}`,
      icon: <UserRound className="h-4 w-4 text-lime-200" />,
      imageUrl: friend.avatarUrl,
      title: `${friend.displayName} está jogando`,
      detail: friend.presence.lastLocation ?? "Experiência Roblox",
      value: "Agora",
      path: `/profile/${friend.id}`,
      tone: "lime",
    })),
    ...(stats?.radar.updatedSinceLastPlay ?? []).slice(0, 3).map((game) => ({
      id: `updated-${game.id}`,
      icon: <Sparkles className="h-4 w-4 text-deck-300" />,
      imageUrl: game.imageUrl,
      title: `${game.name} foi atualizado`,
      detail: "Mudanças desde sua última partida",
      value: formatDateTime(game.roblox?.updatedAt),
      path: `/games/${game.id}`,
      tone: "cyan",
    })),
    ...(stats?.radar.gainingNow ?? []).slice(0, 3).map((entry) => ({
      id: `gaining-${entry.game.id}`,
      icon: <TrendingUp className="h-4 w-4 text-deck-300" />,
      imageUrl: entry.game.imageUrl,
      title: `${entry.game.name} está crescendo`,
      detail: `${compactNumber(entry.game.roblox?.playing ?? 0)} jogando agora`,
      value: `+${compactNumber(entry.playingDelta)}`,
      path: `/games/${entry.game.id}`,
      tone: "ice",
    })),
  ].slice(0, 6);
  const weekly = stats?.weekly;

  return (
    <>
      <section className="deck-intelligence-grid">
        <div className="deck-stream-section">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-signal" />
                <h2 className="deck-display text-xl font-semibold text-white">Radar de atividade</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">Atualizações dos seus jogos e amigos</p>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-semibold text-slate-600">Em jogo</div>
              <div className="deck-display mt-1 text-lg font-semibold text-white">{friendsInGame.length}</div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16" />
              ))}
            </div>
          ) : radarItems.length ? (
            <div className="deck-stream-list">
              {radarItems.map((item, index) => (
                <Link key={item.id} to={item.path} className="deck-stream-row">
                  <span className="deck-stream-axis" data-tone={item.tone}>
                    <span className="deck-stream-dot" />
                    {index < radarItems.length - 1 ? <span className="deck-stream-line" /> : null}
                  </span>
                  <span className="deck-stream-image">
                    {item.imageUrl ? <img src={item.imageUrl} alt="" /> : item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-100">{item.title}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{item.detail}</span>
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-slate-400">{item.value}</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="deck-stream-empty">
              O Radar está acompanhando seus jogos e mostrará mudanças assim que forem detectadas
            </div>
          )}
        </div>

        <aside className="deck-week-panel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-deck-300" />
              <h2 className="deck-display text-lg font-semibold text-white">Últimos 7 dias</h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">Resumo semanal</span>
          </div>

          {isLoading ? (
            <div className="mt-5 space-y-3">
              <Skeleton className="h-24" />
              <Skeleton className="h-28" />
            </div>
          ) : (
            <>
              <div className="deck-week-score">
                <div className="deck-display text-5xl font-semibold text-white">{weekly?.launches ?? 0}</div>
                <div className="pb-1 text-xs uppercase text-slate-500">partidas</div>
              </div>
              <div className="deck-week-breakdown">
                <WeeklyMetric value={weekly?.uniqueGames ?? 0} label="jogos" />
                <WeeklyMetric value={weekly?.activeDays ?? 0} label="dias ativos" />
                <WeeklyMetric value={weekly?.launchDelta ?? 0} label="variação" prefix />
              </div>

              <div className="mt-5 text-[11px] font-semibold text-slate-600">Mais aberto</div>
              {weekly?.topGame ? (
                <Link to={`/games/${weekly.topGame.id}`} className="deck-week-top-game">
                  <span className="deck-week-top-image">
                    {weekly.topGame.imageUrl ? (
                      <img src={weekly.topGame.imageUrl} alt="" />
                    ) : (
                      <Gamepad2 className="h-5 w-5 text-slate-500" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-white">{weekly.topGame.name}</span>
                    <span className="mt-1 block text-[10px] text-signal">{weekly.topGameLaunches} aberturas</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-600" />
                </Link>
              ) : (
                <div className="mt-3 text-sm text-slate-500">Nenhuma partida nesta semana</div>
              )}
            </>
          )}
        </aside>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
              <Sparkles className="h-4 w-4 text-deck-300" />
              Coleções inteligentes
            </div>
            <h2 className="deck-display mt-2 text-xl font-semibold text-white">Sugestões baseadas na sua atividade</h2>
          </div>
          <span className="hidden text-[11px] text-slate-600 sm:block">Atualização automática</span>
        </div>

        {isLoading ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="deck-smart-grid">
            {(stats?.smartDecks ?? []).map((deck, index) => (
              <Link key={deck.id} to={`/smart-decks/${deck.id}`} className="deck-smart-layer">
                <span className="deck-smart-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold text-white">{deck.title}</span>
                    {deck.premiumOnly ? <Badge tone="amber">Premium</Badge> : null}
                  </span>
                  <span className="mt-1 line-clamp-1 text-xs text-slate-500">{deck.description}</span>
                  <span className="mt-2 block text-[10px] text-slate-400">{deck.gameCount} jogos identificados</span>
                </span>
                <span className="deck-smart-thumbnails">
                  {deck.locked ? (
                    <span className="deck-smart-lock"><Crown className="h-4 w-4" /></span>
                  ) : (
                    deck.games.slice(0, 3).map((game) => (
                      <span key={game.id} className="deck-smart-thumbnail">
                        {game.imageUrl ? <img src={game.imageUrl} alt="" /> : null}
                      </span>
                    ))
                  )}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function WeeklyMetric({ value, label, prefix = false }: { value: number; label: string; prefix?: boolean }) {
  return (
    <div>
      <div className="deck-display text-lg font-semibold text-white">
        {prefix && value > 0 ? "+" : ""}{value}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-600">{label}</div>
    </div>
  );
}
