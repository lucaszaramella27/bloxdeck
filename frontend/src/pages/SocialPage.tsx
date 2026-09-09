import {
  Backpack,
  Clock3,
  ExternalLink,
  Loader2,
  Palette,
  RefreshCw,
  Search,
  Shirt,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  UserCheck,
  UserPlus,
  UsersRound,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRobloxInventory, useRobloxSocial, useRobloxUserSearch } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { compactNumber, formatDateTime } from "@/lib/format";
import type { RobloxUserSearchResult } from "@/types";

const bodyColorKeys = [
  "headColor3",
  "torsoColor3",
  "rightArmColor3",
  "leftArmColor3",
  "rightLegColor3",
  "leftLegColor3",
] as const;

type BodyColorKey = (typeof bodyColorKeys)[number];
type AppearanceCategory =
  | "all"
  | "clothing"
  | "accessories"
  | "body"
  | "animations"
  | "emotes"
  | "gear"
  | "collectibles";
type BodyColorsState = Record<BodyColorKey, string>;
type ScaleKey = "height" | "width" | "head" | "depth" | "proportion" | "bodyType";
type ScalesState = Record<ScaleKey, number>;

const robloxAvatarEditorUrl = "https://www.roblox.com/my/avatar";

const appearanceCategories: Array<{
  value: AppearanceCategory;
  label: string;
  hint: string;
  icon: LucideIcon;
}> = [
  { value: "all", label: "Tudo", hint: "Avatar", icon: Backpack },
  { value: "clothing", label: "Roupas", hint: "Camisas, calcas, 3D", icon: Shirt },
  { value: "accessories", label: "Acessorios", hint: "Chapeus, cabelo, costas", icon: Sparkles },
  { value: "body", label: "Corpos", hint: "Cabeca, rosto, partes", icon: UserRound },
  { value: "animations", label: "Animacoes", hint: "Walk, run, idle", icon: Wand2 },
  { value: "emotes", label: "Emotes", hint: "Dancas e poses", icon: Sparkles },
  { value: "gear", label: "Gear", hint: "Ferramentas", icon: Backpack },
  { value: "collectibles", label: "Limitados", hint: "Collectibles", icon: ShieldCheck },
];

const bodyColorLabels: Record<BodyColorKey, string> = {
  headColor3: "Cabeca",
  torsoColor3: "Torso",
  rightArmColor3: "Braco D",
  leftArmColor3: "Braco E",
  rightLegColor3: "Perna D",
  leftLegColor3: "Perna E",
};

const scaleLabels: Record<ScaleKey, string> = {
  height: "Altura",
  width: "Largura",
  head: "Cabeca",
  depth: "Profund.",
  proportion: "Prop.",
  bodyType: "Corpo",
};

const defaultBodyColors: BodyColorsState = {
  headColor3: "CDCDCD",
  torsoColor3: "CDCDCD",
  rightArmColor3: "CDCDCD",
  leftArmColor3: "CDCDCD",
  rightLegColor3: "CDCDCD",
  leftLegColor3: "CDCDCD",
};

const defaultScales: ScalesState = {
  height: 1,
  width: 1,
  head: 1,
  depth: 1,
  proportion: 0,
  bodyType: 0,
};

async function openExternalUrl(url: string) {
  if (window.__TAURI_INTERNALS__) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function robloxCatalogUrl(assetId: number | null | undefined) {
  return assetId ? `https://www.roblox.com/catalog/${assetId}` : robloxAvatarEditorUrl;
}

function colorValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return "#3979e6";
  }

  if (!value) {
    return "#cdcdcd";
  }

  return value.startsWith("#") ? value : `#${value}`;
}

function colorPayload(value: string) {
  return value.replace("#", "").toUpperCase();
}

function avatarTypeLabel(value: string | number | null | undefined): "R6" | "R15" {
  if (value === 1 || value === "1" || value === "R6") {
    return "R6";
  }

  return "R15";
}

function scaleBounds(key: ScaleKey) {
  return key === "proportion" || key === "bodyType" ? { min: 0, max: 1 } : { min: 0.7, max: 1.3 };
}

function PlayerSearchPanel({
  currentUserId,
  friendIds,
}: {
  currentUserId: string | undefined;
  friendIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const playerSearch = useRobloxUserSearch(submittedQuery);
  const normalizedQuery = query.trim().replace(/^@/, "");
  const pages = playerSearch.data?.pages;
  const lastPage = pages?.[pages.length - 1];
  const pageCount = pages?.length ?? 0;
  const { fetchNextPage, refetch } = playerSearch;
  const [retryIn, setRetryIn] = useState(0);
  const results = useMemo(() => {
    const uniqueResults = new Map<string, RobloxUserSearchResult>();

    for (const page of playerSearch.data?.pages ?? []) {
      for (const result of page.results) {
        uniqueResults.set(result.id, result);
      }
    }

    return [...uniqueResults.values()];
  }, [playerSearch.data]);

  useEffect(() => {
    if (!lastPage?.rateLimited) {
      setRetryIn(0);
      return;
    }

    const waitSeconds = Math.max(1, lastPage.retryAfterSeconds ?? 60);
    const retryAt = Date.now() + waitSeconds * 1000;
    setRetryIn(waitSeconds);

    const countdown = window.setInterval(() => {
      setRetryIn(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000)));
    }, 500);
    const retry = window.setTimeout(() => {
      if (pageCount > 1 && lastPage.nextPageCursor) {
        void fetchNextPage();
      } else {
        void refetch();
      }
    }, waitSeconds * 1000 + 250);

    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(retry);
    };
  }, [fetchNextPage, lastPage, pageCount, refetch]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (normalizedQuery.length < 3) {
      return;
    }

    if (normalizedQuery === submittedQuery) {
      void playerSearch.refetch();
      return;
    }

    setSubmittedQuery(normalizedQuery);
  };

  return (
    <section className="rounded-lg bg-[var(--panel-bg)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--panel-bg-hover)] text-cyan-200">
            <UserPlus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Encontrar jogadores</h2>
            <p className="mt-1 text-sm text-slate-500">Pesquise por nome ou usuário do Roblox</p>
          </div>
        </div>
        {playerSearch.data ? <Badge tone="slate">{results.length} carregados</Badge> : null}
      </div>

      <form className="mt-4 flex gap-2" onSubmit={submitSearch}>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome ou @usuário"
            className="h-11 pl-10"
            autoComplete="off"
            maxLength={50}
            aria-label="Nome do jogador Roblox"
          />
        </div>
        <Button
          type="submit"
          className="h-11"
          disabled={normalizedQuery.length < 3 || playerSearch.isFetching || retryIn > 0}
        >
          {retryIn > 0 ? (
            <Clock3 className="h-4 w-4" />
          ) : playerSearch.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {retryIn > 0 ? `${retryIn}s` : "Buscar"}
        </Button>
      </form>

      {playerSearch.error ? (
        <div className="mt-4 rounded-md bg-rose-400/[0.10] px-4 py-3 text-sm text-rose-100">
          {playerSearch.error.message}
        </div>
      ) : null}

      {lastPage?.rateLimited ? (
        <div className="mt-4 flex items-center gap-3 rounded-md bg-amber-300/[0.10] px-4 py-3 text-sm text-amber-100">
          <Clock3 className="h-4 w-4 shrink-0" />
          <span>Continuando a busca automaticamente em {retryIn}s</span>
        </div>
      ) : null}

      {playerSearch.isLoading ? (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      ) : null}

      {playerSearch.data ? (
        results.length ? (
          <>
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
              {results.map((result) => {
                const isOwnProfile = result.id === currentUserId;
                const isFriend = friendIds.has(result.id);
                const presenceLabel = result.presence.isInGame
                  ? "Em jogo"
                  : result.presence.isOnline
                    ? "Online"
                    : "Offline";

                return (
                  <article
                    key={result.id}
                    className="flex min-h-32 min-w-0 flex-col rounded-lg bg-[var(--panel-bg-strong)] p-3"
                  >
                  <div className="flex min-w-0 items-center gap-3">
                    <Link
                      to={`/profile/${result.id}`}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-[var(--panel-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-400/60"
                      aria-label={`Ver perfil de ${result.displayName}`}
                    >
                      {result.avatarUrl ? (
                        <img src={result.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-500">
                          <UserRound className="h-5 w-5" />
                        </div>
                      )}
                      <span
                        className={cn(
                          "absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--panel-bg-strong)]",
                          result.presence.isInGame
                            ? "bg-emerald-400"
                            : result.presence.isOnline
                              ? "bg-cyan-300"
                              : "bg-slate-600",
                        )}
                      />
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Link
                          to={`/profile/${result.id}`}
                          className="truncate text-sm font-semibold text-white focus-visible:outline-none focus-visible:underline"
                        >
                          {result.displayName}
                        </Link>
                        {result.hasVerifiedBadge ? (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-slate-500">@{result.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        <span>{presenceLabel}</span>
                        {isOwnProfile ? <Badge tone="cyan">Você</Badge> : null}
                        {isFriend ? <Badge tone="lime">Amigo</Badge> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex justify-end gap-2 pt-3">
                    <Button asChild type="button" variant="secondary" size="sm">
                      <Link to={`/profile/${result.id}`}>
                        <UserRound className="h-4 w-4" />
                        Perfil
                      </Link>
                    </Button>
                    {!isOwnProfile && !isFriend ? (
                      <Button
                        type="button"
                        size="sm"
                        title="Abrir o perfil oficial para enviar amizade"
                        onClick={() =>
                          void openExternalUrl(`https://www.roblox.com/users/${result.id}/profile`)
                        }
                      >
                        <UserPlus className="h-4 w-4" />
                        Adicionar no Roblox
                      </Button>
                    ) : isFriend ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="iconSm"
                        title="Abrir no Roblox"
                        aria-label="Abrir no Roblox"
                        onClick={() =>
                          void openExternalUrl(`https://www.roblox.com/users/${result.id}/profile`)
                        }
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>
                  </article>
                );
              })}
            </div>

            {playerSearch.hasNextPage ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={playerSearch.isFetchingNextPage || Boolean(lastPage?.rateLimited)}
                  onClick={() => void playerSearch.fetchNextPage()}
                >
                  {playerSearch.isFetchingNextPage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UsersRound className="h-4 w-4" />
                  )}
                  {lastPage?.rateLimited ? `Continuando em ${retryIn}s` : "Mais jogadores"}
                </Button>
              </div>
            ) : null}
          </>
        ) : !lastPage?.rateLimited ? (
          <div className="mt-4 rounded-md bg-[var(--panel-bg-strong)] px-4 py-8 text-center text-sm text-slate-500">
            Nenhum jogador encontrado
          </div>
        ) : null
      ) : null}
    </section>
  );
}

export function SocialPage() {
  const social = useRobloxSocial();
  const [activeCategory, setActiveCategory] = useState<AppearanceCategory>("all");
  const inventory = useRobloxInventory(activeCategory);
  const data = social.data;
  const counts = data?.counts;
  const inventoryItems = useMemo(
    () => inventory.data?.pages.flatMap((page) => page.items) ?? [],
    [inventory.data],
  );
  const friendIds = useMemo(
    () => new Set(data?.friends.map((friend) => friend.id) ?? []),
    [data?.friends],
  );
  const [bodyColors, setBodyColors] = useState<BodyColorsState>(defaultBodyColors);
  const [scales, setScales] = useState<ScalesState>(defaultScales);
  const [avatarType, setAvatarType] = useState<"R6" | "R15">("R15");
  const metrics: Array<{ label: string; value: number; icon: LucideIcon; tone: string }> = [
    { label: "Amigos", value: counts?.friends ?? 0, icon: UsersRound, tone: "text-cyan-200" },
    { label: "Seguidores", value: counts?.followers ?? 0, icon: Sparkles, tone: "text-lime-200" },
    { label: "Seguindo", value: counts?.following ?? 0, icon: UserRound, tone: "text-amber-200" },
    { label: "Aparencia", value: inventoryItems.length, icon: Backpack, tone: "text-rose-200" },
  ];

  useEffect(() => {
    const nextBodyColors = data?.avatar.bodyColor3s;

    if (nextBodyColors) {
      setBodyColors({
        headColor3: colorPayload(String(nextBodyColors.headColor3 ?? defaultBodyColors.headColor3)),
        torsoColor3: colorPayload(String(nextBodyColors.torsoColor3 ?? defaultBodyColors.torsoColor3)),
        rightArmColor3: colorPayload(String(nextBodyColors.rightArmColor3 ?? defaultBodyColors.rightArmColor3)),
        leftArmColor3: colorPayload(String(nextBodyColors.leftArmColor3 ?? defaultBodyColors.leftArmColor3)),
        rightLegColor3: colorPayload(String(nextBodyColors.rightLegColor3 ?? defaultBodyColors.rightLegColor3)),
        leftLegColor3: colorPayload(String(nextBodyColors.leftLegColor3 ?? defaultBodyColors.leftLegColor3)),
      });
    }

    if (data?.avatar.scales) {
      setScales({
        height: Number(data.avatar.scales.height ?? defaultScales.height),
        width: Number(data.avatar.scales.width ?? defaultScales.width),
        head: Number(data.avatar.scales.head ?? defaultScales.head),
        depth: Number(data.avatar.scales.depth ?? defaultScales.depth),
        proportion: Number(data.avatar.scales.proportion ?? defaultScales.proportion),
        bodyType: Number(data.avatar.scales.bodyType ?? defaultScales.bodyType),
      });
    }

    setAvatarType(avatarTypeLabel(data?.avatar.playerAvatarType));
  }, [data]);

  if (social.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-[360px_1fr] gap-5">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[520px]" />
        </div>
      </div>
    );
  }

  if (social.error) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-white">Social</h1>
          <p className="mt-2 text-sm text-slate-400">Conexao Roblox e avatar.</p>
        </div>
        <div className="glass-panel rounded-lg p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
            <UserRound className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold tracking-normal text-white">Roblox nao conectado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{social.error.message}</p>
          <Button asChild className="mt-5">
            <Link to="/login">Entrar com Roblox</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass-panel rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Roblox</Badge>
              <Badge tone="lime">Tempo real</Badge>
              {data?.syncedAt ? <Badge tone="slate">Sync {formatDateTime(data.syncedAt)}</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-white">Avatar, inventario e social</h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void social.refetch();
                void inventory.refetch();
              }}
            >
              <RefreshCw className={cn("h-4 w-4", (social.isFetching || inventory.isFetching) && "animate-spin")} />
              Atualizar
            </Button>
            <Button type="button" onClick={() => void openExternalUrl(robloxAvatarEditorUrl)}>
              <ExternalLink className="h-4 w-4" />
              Roblox
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <div key={metric.label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <Icon className={cn("h-5 w-5", metric.tone)} />
                <div className="mt-4 text-3xl font-bold tracking-normal text-white">
                  {compactNumber(metric.value)}
                </div>
                <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      <PlayerSearchPanel currentUserId={data?.userId} friendIds={friendIds} />

      <section className="grid grid-cols-[360px_1fr] gap-5">
        <aside className="space-y-5">
          <div className="glass-panel overflow-hidden rounded-lg">
            <div className="relative aspect-square bg-slate-950">
              {data?.avatarImageUrl ? (
                <img src={data.avatarImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-600">
                  <UserRound className="h-10 w-10" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                <Badge tone="cyan">#{data?.userId}</Badge>
                <Badge tone="lime">{avatarType}</Badge>
              </div>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <h2 className="text-lg font-bold tracking-normal text-white">Aparencia</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(["R6", "R15"] as const).map((type) => (
                    <div
                      key={type}
                      className={cn(
                        "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold",
                        avatarType === type ? "bg-ice-100 text-[#0d1118]" : "bg-white/[0.08] text-slate-300",
                      )}
                    >
                      <Wand2 className="h-4 w-4" />
                      {type}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  className="mt-3 w-full"
                  onClick={() => void openExternalUrl(robloxAvatarEditorUrl)}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir editor
                </Button>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-cyan-200" />
                    <h3 className="text-sm font-bold tracking-normal text-white">Cores</h3>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void openExternalUrl(robloxAvatarEditorUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {bodyColorKeys.map((key) => (
                    <label key={key} className="flex items-center justify-between gap-2 rounded-lg bg-slate-950/50 p-2">
                      <span className="text-xs text-slate-400">{bodyColorLabels[key]}</span>
                      <input
                        type="color"
                        value={colorValue(bodyColors[key])}
                        disabled
                        className="h-8 w-10 rounded border-0 bg-transparent p-0"
                        onChange={(event) =>
                          setBodyColors((current) => ({ ...current, [key]: colorPayload(event.target.value) }))
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-lime-200" />
                    <h3 className="text-sm font-bold tracking-normal text-white">Escala</h3>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void openExternalUrl(robloxAvatarEditorUrl)}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir
                  </Button>
                </div>
                <div className="space-y-3">
                  {(Object.keys(scales) as ScaleKey[]).map((key) => {
                    const bounds = scaleBounds(key);

                    return (
                      <label key={key} className="grid grid-cols-[70px_1fr_44px] items-center gap-2 text-xs">
                        <span className="text-slate-400">{scaleLabels[key]}</span>
                        <input
                          type="range"
                          min={bounds.min}
                          max={bounds.max}
                          step="0.05"
                          value={scales[key]}
                          disabled
                          onChange={(event) =>
                            setScales((current) => ({ ...current, [key]: Number(event.target.value) }))
                          }
                        />
                        <span className="text-right font-semibold text-white">{scales[key].toFixed(2)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-white">Visuais</h2>
              <Badge tone="slate">{counts?.outfits ?? 0} salvos</Badge>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {data?.outfits.length ? (
                data.outfits.map((outfit) => (
                  <article key={outfit.id} className="glass-panel overflow-hidden rounded-lg">
                    <div className="aspect-square bg-slate-950">
                      {outfit.imageUrl ? (
                        <img src={outfit.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          <Shirt className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="truncate text-sm font-semibold text-white">{outfit.name}</h3>
                      <div className="mt-1 text-xs text-slate-500">{outfit.outfitType ?? "Avatar"}</div>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full"
                        onClick={() => void openExternalUrl(robloxAvatarEditorUrl)}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Abrir editor
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="glass-panel rounded-lg p-8 text-sm text-slate-500">Sem outfits publicos.</div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-white">Equipado agora</h2>
              {social.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {data?.avatar.assets.map((asset) => (
                <article key={asset.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{asset.name}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {asset.typeName ? <Badge tone="slate">{asset.typeName}</Badge> : null}
                        {asset.availabilityStatus ? <Badge tone="lime">{asset.availabilityStatus}</Badge> : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="iconSm"
                      title="Ver item"
                      onClick={() => void openExternalUrl(robloxCatalogUrl(asset.id))}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-white">Aparencia</h2>
              <div className="flex items-center gap-2">
                {inventory.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
                <Badge tone="slate">{inventoryItems.length} itens</Badge>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-4 gap-2">
              {appearanceCategories.map((category) => {
                const Icon = category.icon;
                const isActive = activeCategory === category.value;

                return (
                  <button
                    key={category.value}
                    type="button"
                    className={cn(
                      "flex min-h-16 items-center gap-3 rounded-lg border p-3 text-left transition",
                      isActive
                        ? "border-cyan-300/40 bg-cyan-300/15 text-white"
                        : "border-white/10 bg-white/5 text-slate-300",
                    )}
                    onClick={() => setActiveCategory(category.value)}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-cyan-100" : "text-slate-500")} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{category.label}</span>
                      <span className="block truncate text-xs text-slate-500">{category.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {inventory.error ? (
              <div className="glass-panel rounded-lg p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Inventario bloqueado</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{inventory.error.message}</p>
                  </div>
                  <Button asChild>
                    <Link to="/login">Reconectar</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
                  {inventoryItems.map((item) => (
                    <article key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="aspect-square rounded-lg bg-slate-950">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-slate-600">
                            <Backpack className="h-7 w-7" />
                          </div>
                        )}
                      </div>
                      <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-white">
                        {item.name}
                      </h3>
                      {item.creatorName ? (
                        <div className="mt-1 truncate text-xs text-slate-500">por {item.creatorName}</div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge tone={item.isWearable ? "cyan" : "slate"}>{item.type ?? item.category}</Badge>
                        {item.isLimited ? <Badge tone="amber">Limited</Badge> : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        className="mt-3 w-full"
                        variant={item.assetId ? "secondary" : "ghost"}
                        disabled={!item.assetId}
                        onClick={() => void openExternalUrl(robloxCatalogUrl(item.assetId))}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Ver item
                      </Button>
                    </article>
                  ))}
                </div>

                {!inventoryItems.length && !inventory.isFetching ? (
                  <div className="glass-panel mt-4 rounded-lg p-8 text-center text-sm text-slate-500">
                    Nada nessa categoria por enquanto.
                  </div>
                ) : null}

                {inventory.hasNextPage ? (
                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={inventory.isFetchingNextPage}
                      onClick={() => void inventory.fetchNextPage()}
                    >
                      {inventory.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Backpack className="h-4 w-4" />}
                      Mais itens
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-white">Amigos</h2>
              <Badge tone="slate">{counts?.friends ?? 0} total</Badge>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {data?.friends.map((friend) => (
                <article
                  key={friend.id}
                  className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white/10">
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <UserRound className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{friend.displayName}</span>
                      {friend.hasVerifiedBadge ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-200" /> : null}
                    </div>
                    <div className="truncate text-xs text-slate-500">@{friend.name}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
