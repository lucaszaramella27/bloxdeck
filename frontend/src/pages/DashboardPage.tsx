import {
  Activity,
  ArrowRight,
  Clock3,
  Gamepad2,
  Radio,
  RefreshCw,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";

import { DashboardIntelligence } from "@/components/dashboard/DashboardIntelligence";
import { LaunchButton } from "@/components/games/LaunchButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useRobloxSocial, useStats } from "@/hooks/api-hooks";
import { compactNumber, formatDateTime } from "@/lib/format";
import type { Game, Stats } from "@/types";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function DashboardPage() {
  const profile = useProfile();
  const stats = useStats();
  const social = useRobloxSocial();
  const stageGames = useMemo(() => collectStageGames(stats.data), [stats.data]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const selectedGame = stageGames.find((game) => game.id === selectedGameId) ?? stageGames[0];
  const friendsPlaying = (social.data?.friends ?? []).filter((friend) => friend.presence.isInGame);
  const displayName = profile.data?.displayName?.split(" ")[0] ?? profile.data?.robloxUsername ?? "jogador";

  useEffect(() => {
    if (!stageGames.length) {
      setSelectedGameId(null);
      return;
    }

    if (!selectedGameId || !stageGames.some((game) => game.id === selectedGameId)) {
      setSelectedGameId(stageGames[0].id);
    }
  }, [selectedGameId, stageGames]);

  return (
    <div className="adaptive-dashboard space-y-6 pb-3">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            Seu Deck está pronto
          </div>
          <h1 className="deck-display mt-2 text-3xl font-semibold text-white">
            {greeting()}, {displayName}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">Continue de onde parou ou escolha outra experiência</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void Promise.all([stats.refetch(), social.refetch()])}
        >
          <RefreshCw className={`h-4 w-4 ${stats.isFetching || social.isFetching ? "animate-spin" : ""}`} />
          Sincronizar
        </Button>
      </header>

      {stats.isLoading ? (
        <Skeleton className="h-[370px] w-full" />
      ) : selectedGame ? (
        <>
          <section className="deck-stage" aria-label={`Em foco: ${selectedGame.name}`}>
            {selectedGame.imageUrl ? (
              <img
                key={selectedGame.id}
                src={selectedGame.imageUrl}
                alt=""
                className="deck-stage-media"
              />
            ) : null}
            <div className="deck-stage-shade" />
            <span className="deck-stage-accent" />

            <div className="deck-stage-layout">
              <div className="deck-stage-copy">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-white/75">
                  <Radio className="h-3.5 w-3.5 text-signal" />
                  Em destaque
                </div>
                <h2 className="deck-display mt-4 line-clamp-2 max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
                  {selectedGame.name}
                </h2>
                <p className="mt-3 line-clamp-2 max-w-xl text-sm leading-6 text-slate-300/80">
                  {selectedGame.description || "Experiência Roblox pronta para abrir pelo seu Deck"}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-300">
                  <StageFact icon={<UsersRound className="h-4 w-4" />}>
                    {compactNumber(selectedGame.roblox?.playing ?? 0)} online
                  </StageFact>
                  <StageFact icon={<Clock3 className="h-4 w-4" />}>
                    {selectedGame.lastLaunchedAt
                      ? `Última partida ${formatDateTime(selectedGame.lastLaunchedAt)}`
                      : "Ainda não iniciado"}
                  </StageFact>
                </div>
                <div className="mt-7 flex flex-wrap items-center gap-2.5">
                  <Button asChild variant="secondary">
                    <Link to={`/games/${selectedGame.id}`}>
                      Detalhes
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <LaunchButton game={selectedGame} className="min-w-32" />
                </div>
              </div>

              <div className="deck-stage-selector" role="tablist" aria-label="Seleção do Deck">
                <div className="mb-2 flex items-center justify-between px-2 text-[11px] font-semibold text-slate-500">
                  <span>Sua seleção</span>
                  <span>{stageGames.length}</span>
                </div>
                {stageGames.map((game) => {
                  const active = game.id === selectedGame.id;
                  return (
                    <button
                      key={game.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedGameId(game.id)}
                      className={`deck-stage-option ${active ? "is-active" : ""}`}
                    >
                      <span className="deck-stage-option-image">
                        {game.imageUrl ? <img src={game.imageUrl} alt="" /> : <Gamepad2 className="h-4 w-4" />}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-xs font-semibold text-slate-100">{game.name}</span>
                        <span className="mt-0.5 block truncate text-[9px] text-slate-500">
                          {compactNumber(game.roblox?.playing ?? 0)} online
                        </span>
                      </span>
                      {active ? <span className="deck-stage-option-state" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

        </>
      ) : (
        <section className="deck-stage deck-stage-empty">
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-500">Deck vazio</div>
            <h2 className="deck-display mt-3 text-3xl font-semibold text-white">Escolha sua primeira camada</h2>
            <p className="mt-2 text-sm text-slate-500">Salve uma experiência para acompanhar e iniciar rapidamente</p>
            <Button asChild className="mt-5">
              <Link to="/games">Explorar jogos</Link>
            </Button>
          </div>
        </section>
      )}

      <section className="deck-telemetry" aria-label="Resumo do Deck">
        <div className="deck-telemetry-label">
          <Activity className="h-4 w-4 text-signal" />
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-500">Resumo</div>
            <div className="mt-0.5 text-[10px] text-slate-700">
              {formatDateTime(stats.data?.roblox.syncedAt)}
            </div>
          </div>
        </div>
        <TelemetryMetric
          icon={<Gamepad2 className="h-4 w-4" />}
          value={stats.data?.totals.games ?? 0}
          label="Jogos no Deck"
        />
        <TelemetryMetric
          icon={<UsersRound className="h-4 w-4 text-lime-200" />}
          value={stats.data?.roblox.onlinePlayers ?? 0}
          label="Online agora"
        />
        <TelemetryMetric
          icon={<Clock3 className="h-4 w-4 text-deck-300" />}
          value={stats.data?.weekly.launches ?? 0}
          label="Partidas na semana"
        />
        <TelemetryMetric
          icon={<Sparkles className="h-4 w-4 text-deck-300" />}
          value={friendsPlaying.length}
          label="Amigos jogando"
        />
      </section>

      <DashboardIntelligence stats={stats.data} isLoading={stats.isLoading} />
    </div>
  );
}

function collectStageGames(stats?: Stats) {
  if (!stats) return [];

  const candidates = [
    ...(stats.smartDecks.find((deck) => deck.id === "continue")?.games ?? []),
    ...stats.smartDecks.flatMap((deck) => deck.games),
    ...stats.roblox.trendingGames,
  ];
  const unique = new Map<string, Game>();
  for (const game of candidates) {
    if (!unique.has(game.id)) unique.set(game.id, game);
  }
  return Array.from(unique.values()).slice(0, 4);
}

function StageFact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-[var(--deck-accent)]">{icon}</span>
      {children}
    </span>
  );
}

function TelemetryMetric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div className="deck-telemetry-metric">
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="deck-display text-xl font-semibold text-white">{compactNumber(value)}</span>
      </div>
      <div className="mt-1 truncate text-[11px] text-slate-600">{label}</div>
    </div>
  );
}
