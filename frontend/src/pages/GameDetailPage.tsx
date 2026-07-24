import {
  ArrowLeft,
  BadgeCheck,
  Clock3,
  Eye,
  Gamepad2,
  Heart,
  History,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Server,
  Sparkles,
  Trash2,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { GameAlertsPanel } from "@/components/games/GameAlertsPanel";
import { LaunchButton } from "@/components/games/LaunchButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddGameToAnyCollection,
  useCollections,
  useDeleteGame,
  useGame,
  useRobloxSocial,
  useToggleFavorite,
} from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { compactNumber, formatDateTime } from "@/lib/format";
import { collectionTypeLabels } from "@/types";

function DetailMetric({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
  value: string;
}) {
  return (
    <article className="flex min-w-0 items-center gap-3 px-3 py-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--panel-bg-hover)]">
        <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-lg font-bold text-white">{value}</div>
        <div className="truncate text-[11px] text-slate-500">{label}</div>
      </div>
    </article>
  );
}

function RobloxDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd className="mt-1.5 min-w-0 truncate text-sm font-semibold text-slate-200">{value}</dd>
    </div>
  );
}

function dateOrUnavailable(value: string | null | undefined) {
  return value ? formatDateTime(value) : "Indisponível";
}

export function GameDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id ?? "";
  const game = useGame(id);
  const collections = useCollections();
  const social = useRobloxSocial(Boolean(game.data));
  const toggleFavorite = useToggleFavorite();
  const deleteGame = useDeleteGame();
  const addToCollection = useAddGameToAnyCollection();
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const roblox = game.data?.roblox;

  const availableCollections = useMemo(() => {
    const attached = new Set(game.data?.collections?.map((collection) => collection.id) ?? []);
    return collections.data?.filter((collection) => !attached.has(collection.id)) ?? [];
  }, [collections.data, game.data?.collections]);

  const friendsHere = useMemo(() => {
    const placeId = game.data?.placeId;

    if (!placeId) {
      return [];
    }

    return (
      social.data?.friends.filter(
        (friend) =>
          friend.presence.isInGame &&
          (friend.presence.placeId === placeId || friend.presence.rootPlaceId === placeId),
      ) ?? []
    );
  }, [game.data?.placeId, social.data?.friends]);

  const updatedSinceLastPlay = Boolean(
    game.data?.lastLaunchedAt &&
      roblox?.updatedAt &&
      new Date(roblox.updatedAt).getTime() > new Date(game.data.lastLaunchedAt).getTime(),
  );

  const handleAddToCollection = async () => {
    if (!selectedCollectionId || !game.data) {
      return;
    }

    await addToCollection.mutateAsync({
      collectionId: selectedCollectionId,
      gameId: game.data.id,
    });
    setSelectedCollectionId("");
  };

  const handleDelete = async () => {
    if (!game.data) {
      return;
    }

    await deleteGame.mutateAsync(game.data.id);
    setDeleteOpen(false);
    void navigate("/games");
  };

  if (game.isLoading) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-[430px] w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!game.data) {
    return (
      <EmptyState
        icon={Layers3}
        title={game.error ? "Não foi possível carregar o jogo" : "Jogo não encontrado"}
        description={game.error?.message}
        action={
          <Button asChild>
            <Link to="/games">Voltar para Jogos</Link>
          </Button>
        }
      />
    );
  }

  const metrics = [
    {
      icon: UsersRound,
      label: "Jogando agora",
      value: roblox?.playing != null ? compactNumber(roblox.playing) : "Indisponível",
      tone: "text-emerald-300",
    },
    {
      icon: Eye,
      label: "Visitas",
      value: roblox?.visits != null ? compactNumber(roblox.visits) : "Indisponível",
      tone: "text-cyan-200",
    },
    {
      icon: Heart,
      label: "Favoritos Roblox",
      value:
        roblox?.favoritedCount != null ? compactNumber(roblox.favoritedCount) : "Indisponível",
      tone: "text-rose-200",
    },
    {
      icon: Server,
      label: "Capacidade do servidor",
      value: roblox?.maxPlayers != null ? `${roblox.maxPlayers} jogadores` : "Indisponível",
      tone: "text-amber-200",
    },
  ];

  return (
    <>
      <div className="space-y-5">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="iconSm" title="Voltar para Jogos" aria-label="Voltar para Jogos">
              <Link to="/games">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase text-slate-600">Detalhes do jogo</div>
              <div className="truncate text-sm font-medium text-slate-300">{game.data.name}</div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="iconSm"
              title="Atualizar dados"
              aria-label="Atualizar dados"
              onClick={() => void game.refetch()}
              disabled={game.isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", game.isFetching && "animate-spin")} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              title="Remover do Deck"
              aria-label="Remover do Deck"
              className="text-rose-200 hover:bg-rose-400/[0.10] hover:text-rose-100"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <section className="grid overflow-hidden rounded-lg bg-[var(--panel-bg)] xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <div className="relative min-h-[300px] overflow-hidden bg-[var(--surface-topbar)] sm:min-h-[340px] xl:min-h-[430px]">
            {game.data.imageUrl ? (
              <img
                src={game.data.imageUrl}
                alt={`Capa de ${game.data.name}`}
                className="absolute inset-0 h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-600">
                <Gamepad2 className="h-14 w-14" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
              {roblox?.playing != null ? (
                <Badge tone="lime">{compactNumber(roblox.playing)} online</Badge>
              ) : null}
              {updatedSinceLastPlay ? <Badge tone="cyan">Atualizado desde sua partida</Badge> : null}
            </div>
          </div>

          <div className="flex min-h-[330px] min-w-0 flex-col p-5 sm:p-6 xl:min-h-[430px]">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Roblox</Badge>
              {roblox?.genre ? <Badge tone="slate">{roblox.genre}</Badge> : null}
              {game.data.isFavorite ? <Badge tone="rose">Favorito</Badge> : null}
            </div>

            <h1 className="mt-5 break-words text-3xl font-bold leading-tight text-white">
              {game.data.name}
            </h1>

            <div className="mt-3 flex min-w-0 items-center gap-2 text-sm text-slate-400">
              {roblox?.creatorVerified ? (
                <BadgeCheck className="h-4 w-4 shrink-0 text-cyan-200" />
              ) : null}
              <span className="truncate">{roblox?.creatorName ?? "Criador indisponível"}</span>
            </div>

            <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-400 xl:line-clamp-4">
              {game.data.description || "Este jogo não possui uma descrição pública no Roblox"}
            </p>

            {friendsHere.length ? (
              <div className="mt-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {friendsHere.slice(0, 4).map((friend) => (
                    <div
                      key={friend.id}
                      className="h-8 w-8 overflow-hidden rounded-full bg-[var(--panel-bg-hover)] ring-2 ring-[var(--panel-bg)]"
                      title={friend.displayName}
                    >
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <UsersRound className="m-2 h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  ))}
                </div>
                <span className="min-w-0 truncate text-xs font-medium text-emerald-300">
                  {friendsHere.length === 1
                    ? `${friendsHere[0].displayName} está jogando`
                    : `${friendsHere.length} amigos estão jogando`}
                </span>
              </div>
            ) : null}

            <div className="mt-auto flex items-center gap-2 pt-6">
              <LaunchButton game={game.data} size="lg" className="min-w-0 flex-1" />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                title={game.data.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                aria-label={game.data.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                onClick={() =>
                  toggleFavorite.mutate({
                    gameId: game.data.id,
                    isFavorite: game.data.isFavorite,
                  })
                }
                disabled={toggleFavorite.isPending}
                className={cn(game.data.isFavorite && "text-rose-200")}
              >
                <Heart className={cn("h-4 w-4", game.data.isFavorite && "fill-current")} />
              </Button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--panel-bg)] p-3 lg:grid-cols-4">
          {metrics.map((metric) => (
            <DetailMetric key={metric.label} {...metric} />
          ))}
        </section>

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            <section className="rounded-lg bg-[var(--panel-bg)] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                <h2 className="text-lg font-bold text-white">Sobre o jogo</h2>
              </div>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-400">
                {game.data.description || "Este jogo não possui uma descrição pública no Roblox"}
              </p>
            </section>

            <section className="rounded-lg bg-[var(--panel-bg)] p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4 text-ice-200" />
                <h2 className="text-lg font-bold text-white">Dados do Roblox</h2>
              </div>

              <dl className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                <RobloxDetail
                  label="Criador"
                  value={
                    <span className="flex min-w-0 items-center gap-1.5">
                      {roblox?.creatorVerified ? (
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                      ) : null}
                      <span className="truncate">{roblox?.creatorName ?? "Indisponível"}</span>
                    </span>
                  }
                />
                <RobloxDetail label="Gênero" value={roblox?.genre ?? "Indisponível"} />
                <RobloxDetail label="Criado" value={dateOrUnavailable(roblox?.createdAt)} />
                <RobloxDetail label="Última atualização" value={dateOrUnavailable(roblox?.updatedAt)} />
                <RobloxDetail label="Sincronizado" value={dateOrUnavailable(roblox?.syncedAt)} />
                <RobloxDetail label="Tipo do criador" value={roblox?.creatorType ?? "Indisponível"} />
                <RobloxDetail
                  label="Universe ID"
                  value={<span className="font-mono text-xs">{roblox?.universeId ?? "Indisponível"}</span>}
                />
                <RobloxDetail
                  label="Place ID"
                  value={<span className="font-mono text-xs">{game.data.placeId}</span>}
                />
              </dl>
            </section>
          </main>

          <aside className="space-y-5">
            <section className="rounded-lg bg-[var(--panel-bg)] p-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-bold text-white">Sua atividade</h2>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-5">
                <RobloxDetail label="Partidas iniciadas" value={String(game.data.launchCount)} />
                <RobloxDetail
                  label="Última partida"
                  value={game.data.lastLaunchedAt ? formatDateTime(game.data.lastLaunchedAt) : "Ainda não jogado"}
                />
                <RobloxDetail label="Adicionado ao Deck" value={formatDateTime(game.data.createdAt)} />
                <RobloxDetail
                  label="Coleções"
                  value={String(game.data.collections?.length ?? 0)}
                />
              </dl>

              {updatedSinceLastPlay ? (
                <div className="mt-5 flex items-start gap-3 text-sm text-cyan-100">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-300/[0.10]">
                    <Clock3 className="h-3.5 w-3.5" />
                  </div>
                  <span className="leading-6">O jogo recebeu uma atualização desde sua última partida</span>
                </div>
              ) : null}
            </section>

            <GameAlertsPanel game={game.data} />

            <section className="rounded-lg bg-[var(--panel-bg)] p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Layers3 className="h-4 w-4 text-ice-200" />
                  <h2 className="text-sm font-bold text-white">Coleções</h2>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {game.data.collections?.length ?? 0}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {game.data.collections?.length ? (
                  game.data.collections.map((collection) => (
                    <span
                      key={collection.id}
                      title={collectionTypeLabels[collection.type]}
                      className="inline-flex h-8 max-w-full items-center gap-2 rounded-md bg-[var(--panel-bg-hover)] px-2.5 text-xs font-medium text-slate-200"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: collection.color }}
                      />
                      <span className="truncate">{collection.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Ainda não está em uma coleção</span>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <label className="sr-only" htmlFor="game-detail-collection">
                  Adicionar a uma coleção
                </label>
                <select
                  id="game-detail-collection"
                  value={selectedCollectionId}
                  onChange={(event) => setSelectedCollectionId(event.target.value)}
                  disabled={!availableCollections.length || addToCollection.isPending}
                  className="h-10 min-w-0 flex-1 rounded-md bg-[var(--surface-input)] px-3 text-sm text-white outline-none ring-deck-400/60 focus:ring-2 disabled:opacity-50"
                >
                  <option value="" className="bg-slate-950">
                    {availableCollections.length ? "Selecionar coleção" : "Todas já adicionadas"}
                  </option>
                  {availableCollections.map((collection) => (
                    <option key={collection.id} value={collection.id} className="bg-slate-950">
                      {collection.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  title="Adicionar à coleção"
                  aria-label="Adicionar à coleção"
                  disabled={!selectedCollectionId || addToCollection.isPending}
                  onClick={() => void handleAddToCollection()}
                >
                  {addToCollection.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {addToCollection.error ? (
                <div className="mt-3 text-xs text-rose-200">{addToCollection.error.message}</div>
              ) : null}
            </section>
          </aside>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover do Deck?</DialogTitle>
            <DialogDescription>
              {game.data.name} será removido das suas coleções. O jogo continuará disponível no catálogo do Roblox.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={deleteGame.isPending}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" variant="danger" onClick={() => void handleDelete()} disabled={deleteGame.isPending}>
              {deleteGame.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remover
            </Button>
          </div>

          {deleteGame.error ? <div className="mt-3 text-sm text-rose-200">{deleteGame.error.message}</div> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
