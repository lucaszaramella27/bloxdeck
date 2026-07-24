import {
  BarChart3,
  CalendarClock,
  Cloud,
  ExternalLink,
  Eye,
  Gamepad2,
  Heart,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { LaunchButton } from "@/components/games/LaunchButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateGame,
  useCreatorAnalytics,
  useCreatorOverview,
  useGames,
} from "@/hooks/api-hooks";
import { openExternalUrl } from "@/lib/external";
import { compactNumber, formatDateTime } from "@/lib/format";
import type { CreatorAnalyticsMetric, CreatorExperience } from "@/types";

type CreatorTab = "overview" | "analytics" | "updates" | "cloud";

const tabs: Array<{ id: CreatorTab; label: string; icon: typeof Gamepad2 }> = [
  { id: "overview", label: "Visão geral", icon: Gamepad2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "updates", label: "Atualizações", icon: CalendarClock },
  { id: "cloud", label: "Open Cloud", icon: Cloud },
];

export function CreatorPage() {
  const overview = useCreatorOverview();
  const games = useGames();
  const createGame = useCreateGame();
  const [selectedUniverseId, setSelectedUniverseId] = useState<string>();
  const [activeTab, setActiveTab] = useState<CreatorTab>("overview");
  const selected = overview.data?.experiences.find(
    (experience) => experience.universeId === selectedUniverseId,
  );
  const analytics = useCreatorAnalytics(
    selectedUniverseId,
    Boolean(overview.data?.openCloud.analyticsConfigured),
  );
  const savedGame = games.data?.find((game) => game.placeId === selected?.placeId);

  useEffect(() => {
    if (!selectedUniverseId && overview.data?.experiences[0]) {
      setSelectedUniverseId(overview.data.experiences[0].universeId);
    }
  }, [overview.data?.experiences, selectedUniverseId]);

  const saveSelected = async () => {
    if (!selected) return;
    await createGame.mutateAsync({ placeId: selected.placeId });
  };

  if (overview.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20" />
        <Skeleton className="h-12" />
        <Skeleton className="h-[440px]" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone="cyan">Creator</Badge>
            <Badge tone={overview.data?.openCloud.analyticsConfigured ? "lime" : "slate"}>
              <Cloud className="h-3.5 w-3.5" />
              {overview.data?.openCloud.analyticsConfigured ? "Open Cloud conectado" : "Dados públicos"}
            </Badge>
          </div>
          <h1 className="mt-3 text-3xl font-bold text-white">Modo Criador</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Experiências de @{overview.data?.creator.username ?? "roblox"}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void overview.refetch()}>
          <RefreshCw className={`h-4 w-4 ${overview.isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      {overview.error ? (
        <div className="rounded-lg bg-rose-500/[0.12] px-4 py-3 text-sm text-rose-100">
          {overview.error.message}
        </div>
      ) : null}

      {overview.data?.experiences.length ? (
        <>
          <section className="flex flex-col gap-3 rounded-lg bg-[var(--panel-bg)] p-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 text-xs font-semibold text-slate-500">Experiência</span>
              <select
                value={selectedUniverseId}
                onChange={(event) => setSelectedUniverseId(event.target.value)}
                className="h-10 min-w-0 flex-1 rounded-md bg-[var(--panel-bg-hover)] px-3 text-sm font-semibold text-white outline-none ring-deck-400/60 focus:ring-2 lg:w-80"
              >
                {overview.data.experiences.map((experience) => (
                  <option key={experience.universeId} value={experience.universeId}>
                    {experience.name}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex min-w-0 gap-1 overflow-x-auto" role="tablist" aria-label="Modo Criador">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-semibold transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-400/60 ${
                      active ? "bg-ice-100 text-[#0d1118]" : "text-slate-400 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </section>

          {selected ? (
            <>
              {activeTab === "overview" ? (
                <CreatorOverviewTab
                  selected={selected}
                  savedGame={savedGame}
                  saving={createGame.isPending}
                  onSave={() => void saveSelected()}
                  totals={overview.data.totals}
                />
              ) : null}

              {activeTab === "analytics" ? (
                <CreatorAnalyticsPanel
                  configured={overview.data.openCloud.analyticsConfigured}
                  isLoading={analytics.isLoading}
                  dailyActiveUsers={analytics.data?.metrics.dailyActiveUsers}
                  dailyRevenue={analytics.data?.metrics.dailyRevenue}
                  d1Retention={analytics.data?.metrics.d1Retention}
                />
              ) : null}

              {activeTab === "updates" ? (
                <CreatorUpdates experiences={overview.data.experiences} onSelect={setSelectedUniverseId} />
              ) : null}

              {activeTab === "cloud" ? (
                <OpenCloudPanel configured={overview.data.openCloud.analyticsConfigured} />
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={BarChart3}
          title="Nenhuma experiência pública"
          description="Suas experiências públicas aparecerão aqui quando estiverem disponíveis na Roblox"
        />
      )}
    </div>
  );
}

function CreatorOverviewTab({
  selected,
  savedGame,
  saving,
  onSave,
  totals,
}: {
  selected: CreatorExperience;
  savedGame: ReturnType<typeof useGames>["data"] extends Array<infer T> | undefined ? T | undefined : never;
  saving: boolean;
  onSave: () => void;
  totals: { experiences: number; playing: number; visits: number; favorites: number };
}) {
  return (
    <div className="space-y-4">
      <section className="relative min-h-56 overflow-hidden rounded-lg bg-[var(--panel-bg)]">
        {selected.imageUrl ? (
          <img src={selected.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <Gamepad2 className="absolute right-12 top-12 h-16 w-16 text-slate-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 to-black/25" />
        <div className="relative flex min-h-56 max-w-3xl flex-col justify-end p-5 sm:p-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone="lime">{compactNumber(selected.playing ?? 0)} online</Badge>
            <Badge tone="slate">Atualizado {formatDateTime(selected.updatedAt)}</Badge>
          </div>
          <h2 className="mt-3 line-clamp-2 text-2xl font-bold text-white">{selected.name}</h2>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-300">{selected.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {savedGame ? (
              <LaunchButton game={savedGame} />
            ) : (
              <Button type="button" onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Salvar no Deck
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void openExternalUrl(
                  `https://create.roblox.com/dashboard/creations/experiences/${selected.universeId}/overview`,
                )
              }
            >
              <ExternalLink className="h-4 w-4" />
              Creator Hub
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--panel-bg)] p-3 lg:grid-cols-4">
        <CreatorMetric icon={<Gamepad2 className="h-4 w-4 text-ice-200" />} label="Experiências" value={totals.experiences} />
        <CreatorMetric icon={<UsersRound className="h-4 w-4 text-emerald-300" />} label="Jogando agora" value={totals.playing} />
        <CreatorMetric icon={<Eye className="h-4 w-4 text-cyan-200" />} label="Visitas" value={totals.visits} />
        <CreatorMetric icon={<Heart className="h-4 w-4 text-rose-200" />} label="Favoritos" value={totals.favorites} />
      </section>

      <section className="grid gap-4 rounded-lg bg-[var(--panel-bg)] p-5 md:grid-cols-2">
        <CreatorDetail label="Universe ID" value={selected.universeId} />
        <CreatorDetail label="Place ID" value={selected.placeId} />
        <CreatorDetail label="Criada" value={formatDateTime(selected.createdAt)} />
        <CreatorDetail
          label="Capacidade do servidor"
          value={selected.maxPlayers != null ? `${selected.maxPlayers} jogadores` : "Indisponível"}
        />
      </section>
    </div>
  );
}

function CreatorMetric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--panel-bg-hover)]">{icon}</div>
      <div className="min-w-0">
        <div className="text-base font-bold text-white">{compactNumber(value)}</div>
        <div className="truncate text-[10px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function CreatorDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase text-slate-600">{label}</div>
      <div className="mt-1 break-all text-sm font-medium text-slate-300">{value}</div>
    </div>
  );
}

function CreatorUpdates({
  experiences,
  onSelect,
}: {
  experiences: CreatorExperience[];
  onSelect: (universeId: string) => void;
}) {
  const ordered = [...experiences].sort((a, b) =>
    (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
  );

  return (
    <section className="rounded-lg bg-[var(--panel-bg)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarClock className="h-5 w-5 text-ice-200" />
        <h2 className="text-lg font-bold text-white">Atualizações publicadas</h2>
      </div>
      <div className="space-y-1">
        {ordered.map((experience) => (
          <button
            key={experience.universeId}
            type="button"
            onClick={() => onSelect(experience.universeId)}
            className="flex w-full items-center gap-3 rounded-md p-2.5 text-left transition-colors duration-100 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-400/60"
          >
            <div className="h-12 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--panel-bg-hover)]">
              {experience.imageUrl ? (
                <img src={experience.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">{experience.name}</div>
              <div className="mt-0.5 text-xs text-slate-500">{formatDateTime(experience.updatedAt)}</div>
            </div>
            <Badge tone="slate">{compactNumber(experience.playing ?? 0)} online</Badge>
          </button>
        ))}
      </div>
    </section>
  );
}

function OpenCloudPanel({ configured }: { configured: boolean }) {
  return (
    <section className="rounded-lg bg-[var(--panel-bg)] p-5">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <Cloud className={`h-5 w-5 ${configured ? "text-emerald-300" : "text-slate-500"}`} />
            <h2 className="text-lg font-bold text-white">Open Cloud</h2>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {configured
              ? "A conexão privada está ativa e as métricas autorizadas já podem ser consultadas"
              : "As experiências públicas estão disponíveis, mas as métricas privadas ainda não foram conectadas"}
          </p>
        </div>
        <Badge tone={configured ? "lime" : "slate"}>{configured ? "Conectado" : "Não conectado"}</Badge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <CloudStatus label="Experiências públicas" active />
        <CloudStatus label="Analytics privadas" active={configured} />
        <CloudStatus label="Chave protegida no backend" active={configured} />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-5"
        onClick={() => void openExternalUrl("https://create.roblox.com/dashboard/credentials")}
      >
        <Settings2 className="h-4 w-4" />
        Gerenciar credenciais
      </Button>
    </section>
  );
}

function CloudStatus({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-[var(--panel-bg-strong)] px-3 py-3 text-xs font-medium text-slate-300">
      <span className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-slate-600"}`} />
      {label}
    </div>
  );
}

function CreatorAnalyticsPanel({
  configured,
  isLoading,
  dailyActiveUsers,
  dailyRevenue,
  d1Retention,
}: {
  configured: boolean;
  isLoading: boolean;
  dailyActiveUsers?: CreatorAnalyticsMetric;
  dailyRevenue?: CreatorAnalyticsMetric;
  d1Retention?: CreatorAnalyticsMetric;
}) {
  const bars = useMemo(() => dailyActiveUsers?.points.slice(-30) ?? [], [dailyActiveUsers?.points]);
  const max = Math.max(...bars.map((point) => point.value), 1);

  return (
    <section className="rounded-lg bg-[var(--panel-bg)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-lg font-bold text-white">
            <BarChart3 className="h-5 w-5 text-ice-200" />
            Analytics dos últimos 30 dias
          </div>
          <p className="mt-1 text-sm text-slate-500">Dados privados autorizados pela Open Cloud</p>
        </div>
        <Badge tone={configured ? "lime" : "slate"}>{configured ? "Open Cloud" : "Não conectado"}</Badge>
      </div>

      {!configured ? (
        <div className="mt-5 rounded-lg bg-[var(--panel-bg-strong)] px-4 py-8 text-center text-sm text-slate-500">
          Conecte uma credencial Open Cloud para consultar as métricas privadas desta experiência
        </div>
      ) : isLoading ? (
        <Skeleton className="mt-5 h-64" />
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <AnalyticsValue label="Usuários ativos diários" value={dailyActiveUsers?.latest} />
            <AnalyticsValue label="Receita no período" value={dailyRevenue?.total} suffix=" Robux" />
            <AnalyticsValue label="Retenção D1" value={d1Retention?.latest} suffix="%" />
          </div>
          {bars.length ? (
            <div className="mt-6 flex h-44 items-end gap-1" aria-label="Usuários ativos dos últimos 30 dias">
              {bars.map((point) => (
                <div
                  key={point.time}
                  className="min-h-1 flex-1 rounded-sm bg-signal/80"
                  style={{ height: `${Math.max((point.value / max) * 100, 3)}%` }}
                  title={`${formatDateTime(point.time)}: ${compactNumber(point.value)}`}
                />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg bg-[var(--panel-bg-strong)] px-4 py-8 text-center text-sm text-slate-500">
              A Roblox ainda não retornou pontos para este período
            </div>
          )}
        </>
      )}
    </section>
  );
}

function AnalyticsValue({ label, value, suffix = "" }: { label: string; value?: number | null; suffix?: string }) {
  return (
    <div className="rounded-lg bg-[var(--panel-bg-strong)] p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-white">
        {value == null ? "N/D" : `${compactNumber(value)}${suffix}`}
      </div>
    </div>
  );
}
