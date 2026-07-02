import { motion } from "framer-motion";
import { Clock3, Eye, Gamepad2, Heart, RefreshCw, TrendingUp, UsersRound } from "lucide-react";
import { Link } from "react-router";

import { GameCard } from "@/components/games/GameCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGames, useStats } from "@/hooks/api-hooks";
import { compactNumber, formatDateTime } from "@/lib/format";

export function DashboardPage() {
  const stats = useStats();
  const games = useGames();
  const live = stats.data?.roblox;
  const featuredGames = live?.trendingGames.length ? live.trendingGames.slice(0, 3) : (games.data?.slice(0, 3) ?? []);
  const metrics = [
    {
      label: "Online agora",
      value: live?.onlinePlayers ?? 0,
      icon: UsersRound,
      tone: "text-lime-200",
      helper: `${live?.snapshots ?? 0}/${live?.trackedGames ?? 0} snapshots`,
    },
    {
      label: "Visitas Roblox",
      value: live?.totalVisits ?? 0,
      icon: Eye,
      tone: "text-cyan-200",
      helper: "Soma dos jogos salvos",
    },
    {
      label: "Favoritos Roblox",
      value: live?.totalFavorites ?? 0,
      icon: Heart,
      tone: "text-rose-200",
      helper: `${stats.data?.totals.favorites ?? 0} favoritos no deck`,
    },
    {
      label: "Jogos monitorados",
      value: live?.trackedGames ?? stats.data?.totals.games ?? 0,
      icon: Gamepad2,
      tone: "text-amber-200",
      helper: `${stats.data?.totals.launches ?? 0} launches locais`,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="glass-panel overflow-hidden rounded-lg p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Roblox ao vivo</Badge>
              <Badge tone={live?.unavailable ? "amber" : "lime"}>
                {live?.syncedAt ? `Sync ${formatDateTime(live.syncedAt)}` : "Aguardando sync"}
              </Badge>
            </div>
            <h1 className="mt-4 text-4xl font-bold tracking-normal text-white">Painel BloxDeck</h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">
              Estatisticas publicas do Roblox atualizadas automaticamente para os jogos salvos no deck.
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => void stats.refetch()}>
              <RefreshCw className={`h-4 w-4 ${stats.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button asChild variant="secondary">
              <Link to="/collections">Colecoes</Link>
            </Button>
            <Button asChild>
              <Link to="/games">Jogos</Link>
            </Button>
            <Button asChild>
              <Link to="/login">Entrar com Roblox</Link>
            </Button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;

            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="rounded-lg border border-white/10 bg-white/5 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Icon className={`h-5 w-5 ${metric.tone}`} />
                  <TrendingUp className="h-4 w-4 text-slate-600" />
                </div>
                {stats.isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-3xl font-bold tracking-normal text-white">
                    {compactNumber(metric.value)}
                  </div>
                )}
                <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
                <div className="mt-3 truncate text-xs text-slate-600">{metric.helper}</div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {stats.error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {stats.error.message}
        </div>
      ) : null}

      <section className="grid grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-normal text-white">Mais movimentados</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/games">Ver todos</Link>
            </Button>
          </div>
          {stats.isLoading && games.isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-[360px]" />
              ))}
            </div>
          ) : featuredGames.length ? (
            <div className="grid grid-cols-3 gap-4">
              {featuredGames.map((game) => (
                <GameCard key={game.id} game={game} compact />
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-lg py-16 text-center text-sm text-slate-500">
              Salva um Place ID em Jogos pra começar a monitorar.
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <h2 className="text-xl font-bold tracking-normal text-white">Recentes</h2>
          <div className="glass-panel rounded-lg p-3">
            {stats.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-16" />
                ))}
              </div>
            ) : stats.data?.recent.length ? (
              <div className="space-y-2">
                {stats.data.recent.map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/games/${entry.game.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-white/10"
                  >
                    <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-cyan-300/10">
                      {entry.game.imageUrl ? (
                        <img src={entry.game.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-cyan-100">
                          <Clock3 className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{entry.game.name}</div>
                      <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500">
                        <span className="truncate">{formatDateTime(entry.createdAt)}</span>
                        {entry.game.roblox?.playing != null ? (
                          <span className="shrink-0 text-lime-200">
                            {compactNumber(entry.game.roblox.playing)} online
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-slate-500">Sem launches ainda.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
