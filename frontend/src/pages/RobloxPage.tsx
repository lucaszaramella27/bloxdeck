import {
  Check,
  Eye,
  Gamepad2,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ThumbsUp,
  UsersRound,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCreateGame,
  useGames,
  useRobloxAutocomplete,
  useRobloxDiscover,
  useRobloxSearch,
} from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { compactNumber, formatDateTime } from "@/lib/format";
import { openRobloxGame } from "@/lib/openRoblox";
import { useUiStore } from "@/store/useUiStore";
import type { RobloxExperience } from "@/types";

const sortOptions = [
  { id: "top-playing-now", label: "Jogando agora" },
  { id: "top-trending", label: "Em alta" },
  { id: "up-and-coming", label: "Subindo" },
  { id: "fun-with-friends", label: "Com amigos" },
  { id: "top-revisited", label: "Revisitados" },
];

function voteLabel(result: RobloxExperience) {
  if (result.likeRatio == null) {
    return "Sem votos";
  }

  return `${result.likeRatio}%`;
}

function RobloxExperienceCard({
  result,
  isSaved,
  isSaving,
  onSave,
}: {
  result: RobloxExperience;
  isSaved: boolean;
  isSaving: boolean;
  onSave: () => void;
}) {
  return (
    <article className="glass-panel overflow-hidden rounded-lg">
      <div className="relative aspect-[16/9] bg-slate-950">
        {result.imageUrl ? (
          <img src={result.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-white/5 text-slate-500">
            <Gamepad2 className="h-8 w-8" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge tone="lime">{compactNumber(result.playing ?? 0)} online</Badge>
              {result.isSponsored ? <Badge tone="amber">Patrocinado</Badge> : null}
            </div>
            <h2 className="line-clamp-2 text-lg font-bold tracking-normal text-white">{result.name}</h2>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">
          {result.description || "Sem descricao publica no Roblox."}
        </p>

        <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
          <div>
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Eye className="h-3.5 w-3.5" />
              Visitas
            </div>
            <div className="mt-1 truncate">{compactNumber(result.visits ?? 0)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <ThumbsUp className="h-3.5 w-3.5" />
              Likes
            </div>
            <div className="mt-1 truncate">{voteLabel(result)}</div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <UsersRound className="h-3.5 w-3.5" />
              Max
            </div>
            <div className="mt-1 truncate">{result.maxPlayers ?? "N/D"}</div>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap gap-2">
          <Badge tone="cyan">#{result.placeId}</Badge>
          {result.contentMaturity ? <Badge tone="slate">{result.contentMaturity}</Badge> : null}
          {result.creatorVerified ? (
            <Badge tone="lime">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verificado
            </Badge>
          ) : null}
        </div>

        <div className="min-w-0 text-xs text-slate-500">
          <div className="truncate">Criador: {result.creatorName ?? "Indisponivel"}</div>
          <div className="truncate">Sync: {formatDateTime(result.syncedAt)}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" className="flex-1" onClick={() => void openRobloxGame(result.placeId)}>
            <Play className="h-4 w-4" />
            Jogar
          </Button>
          <Button
            type="button"
            variant={isSaved ? "secondary" : "lime"}
            title={isSaved ? "Ja esta no deck" : "Salvar no deck"}
            aria-label={isSaved ? "Ja esta no deck" : "Salvar no deck"}
            size="icon"
            onClick={onSave}
            disabled={isSaved || isSaving}
          >
            {isSaved ? <Check className="h-4 w-4" /> : isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </article>
  );
}

export function RobloxPage() {
  const [sortId, setSortId] = useState("top-playing-now");
  const search = useUiStore((state) => state.search);
  const setSearch = useUiStore((state) => state.setSearch);
  const normalizedSearch = search.trim();
  const hasSearch = normalizedSearch.length > 1;
  const searchQuery = useRobloxSearch(normalizedSearch);
  const discover = useRobloxDiscover(sortId);
  const autocomplete = useRobloxAutocomplete(normalizedSearch);
  const localGames = useGames();
  const createGame = useCreateGame();
  const savedPlaceIds = useMemo(
    () => new Set((localGames.data ?? []).map((game) => game.placeId)),
    [localGames.data],
  );
  const results = hasSearch
    ? (searchQuery.data?.pages.flatMap((page) => page.results) ?? [])
    : (discover.data?.results ?? []);
  const isLoading = hasSearch ? searchQuery.isLoading : discover.isLoading;
  const isFetching = hasSearch ? searchQuery.isFetching : discover.isFetching;
  const error = hasSearch ? searchQuery.error : discover.error;
  const syncedAt = hasSearch ? searchQuery.data?.pages[0]?.syncedAt : discover.data?.syncedAt;

  const saveGame = (result: RobloxExperience) => {
    createGame.mutate({
      placeId: result.placeId,
      name: result.name,
      description: result.description || undefined,
      imageUrl: result.imageUrl,
    });
  };

  return (
    <div className="space-y-5">
      <section className="glass-panel rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Busca Roblox</Badge>
              <Badge tone="lime">Ao vivo</Badge>
              {syncedAt ? <Badge tone="slate">Sync {formatDateTime(syncedAt)}</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-white">Roblox no launcher</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Pesquise experiencias publicas do Roblox, veja estatisticas atuais, jogue ou salve no deck.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => (hasSearch ? void searchQuery.refetch() : void discover.refetch())}
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar no Roblox: Brookhaven, Blox Fruits, terror, anime..."
              className="h-12 pl-10"
            />
          </div>
          {search ? (
            <Button type="button" variant="secondary" onClick={() => setSearch("")}>
              Limpar
            </Button>
          ) : null}
        </div>

        {hasSearch && autocomplete.data?.suggestions.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {autocomplete.data.suggestions.slice(0, 8).map((suggestion) => (
              <button
                key={suggestion.query}
                type="button"
                onClick={() => setSearch(suggestion.query)}
                className="h-8 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                {suggestion.query}
              </button>
            ))}
          </div>
        ) : null}

        {!hasSearch ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSortId(option.id)}
                className={cn(
                  "h-9 rounded-lg border px-3 text-xs font-semibold transition",
                  sortId === option.id
                    ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {error.message}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-[430px]" />
          ))}
        </div>
      ) : results.length ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
            {results.map((result) => (
              <RobloxExperienceCard
                key={`${result.source}-${result.universeId}`}
                result={result}
                isSaved={savedPlaceIds.has(result.placeId)}
                isSaving={createGame.isPending}
                onSave={() => saveGame(result)}
              />
            ))}
          </div>

          {hasSearch && searchQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="secondary"
                onClick={() => void searchQuery.fetchNextPage()}
                disabled={searchQuery.isFetchingNextPage}
              >
                {searchQuery.isFetchingNextPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Mais resultados
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="glass-panel rounded-lg py-16 text-center">
          <Gamepad2 className="mx-auto h-9 w-9 text-slate-600" />
          <div className="mt-4 text-sm font-semibold text-white">Nada encontrado</div>
          <div className="mt-2 text-sm text-slate-500">Tenta outro nome ou usa uma sugestao.</div>
        </div>
      )}
    </div>
  );
}
