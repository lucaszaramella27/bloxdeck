import { ArrowLeft, BadgeCheck, Eye, Heart, Layers3, Plus, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { LaunchButton } from "@/components/games/LaunchButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddGameToAnyCollection,
  useCollections,
  useDeleteGame,
  useGame,
  useToggleFavorite,
} from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { compactNumber, formatDateTime } from "@/lib/format";
import { collectionTypeLabels } from "@/types";

export function GameDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id ?? "";
  const game = useGame(id);
  const collections = useCollections();
  const toggleFavorite = useToggleFavorite();
  const deleteGame = useDeleteGame();
  const addToCollection = useAddGameToAnyCollection();
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const roblox = game.data?.roblox;

  const availableCollections = useMemo(() => {
    const attached = new Set(game.data?.collections?.map((collection) => collection.id) ?? []);
    return collections.data?.filter((collection) => !attached.has(collection.id)) ?? [];
  }, [collections.data, game.data?.collections]);

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
    void navigate("/games");
  };

  if (game.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  if (!game.data) {
    return (
      <EmptyState
        icon={Layers3}
        title="Jogo nao encontrado"
        action={
          <Button asChild>
            <Link to="/games">Voltar</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/games">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <section className="glass-panel overflow-hidden rounded-lg">
        <div className="relative h-80 bg-slate-950">
          {game.data.imageUrl ? (
            <img src={game.data.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(135deg,rgba(56,189,248,0.5),rgba(132,204,22,0.24),rgba(251,113,133,0.28))]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap gap-2">
                <Badge tone="cyan">#{game.data.placeId}</Badge>
                {roblox?.playing != null ? (
                  <Badge tone="lime">{compactNumber(roblox.playing)} online</Badge>
                ) : (
                  <Badge tone="lime">{game.data.launchCount} launches</Badge>
                )}
                {roblox?.visits != null ? (
                  <Badge tone="amber">{compactNumber(roblox.visits)} visitas</Badge>
                ) : null}
                {roblox?.genre ? <Badge tone="slate">{roblox.genre}</Badge> : null}
                {game.data.isFavorite ? <Badge tone="rose">Favorito</Badge> : null}
              </div>
              <h1 className="truncate text-4xl font-bold tracking-normal text-white">
                {game.data.name}
              </h1>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="secondary"
                size="icon"
                title={game.data.isFavorite ? "Remover favorito" : "Favoritar"}
                onClick={() =>
                  toggleFavorite.mutate({
                    gameId: game.data.id,
                    isFavorite: game.data.isFavorite,
                  })
                }
                disabled={toggleFavorite.isPending}
                className={cn(game.data.isFavorite && "text-rose-100")}
              >
                <Heart className={cn("h-4 w-4", game.data.isFavorite && "fill-current")} />
              </Button>
              <LaunchButton gameId={game.data.id} placeId={game.data.placeId} size="lg" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_360px] gap-6 p-6">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold tracking-normal text-white">Descricao</h2>
              <p className="mt-3 leading-7 text-slate-400">{game.data.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <UsersRound className="h-3.5 w-3.5" />
                  Jogando agora
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {roblox?.playing != null ? compactNumber(roblox.playing) : "Sem snapshot"}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Eye className="h-3.5 w-3.5" />
                  Visitas
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {roblox?.visits != null ? compactNumber(roblox.visits) : "Sem snapshot"}
                </div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Heart className="h-3.5 w-3.5" />
                  Favoritos Roblox
                </div>
                <div className="mt-2 text-sm font-semibold text-white">
                  {roblox?.favoritedCount != null
                    ? compactNumber(roblox.favoritedCount)
                    : "Sem snapshot"}
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-bold tracking-normal text-white">Roblox</h2>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Criador</span>
                  <span className="flex min-w-0 items-center gap-1.5 text-right font-medium text-slate-200">
                    {roblox?.creatorVerified ? (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                    ) : null}
                    <span className="truncate">{roblox?.creatorName ?? "Indisponivel"}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Universe ID</span>
                  <span className="truncate font-medium text-slate-200">
                    {roblox?.universeId ?? "Indisponivel"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Max players</span>
                  <span className="truncate font-medium text-slate-200">
                    {roblox?.maxPlayers != null ? roblox.maxPlayers : "Indisponivel"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Atualizado</span>
                  <span className="truncate font-medium text-slate-200">
                    {formatDateTime(roblox?.updatedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-500">Snapshot</span>
                  <span className="truncate font-medium text-slate-200">
                    {formatDateTime(roblox?.syncedAt)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-bold tracking-normal text-white">Colecoes</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {game.data.collections?.length ? (
                  game.data.collections.map((collection) => (
                    <Badge key={collection.id} tone="slate">
                      {collection.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Sem colecao</span>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <select
                  value={selectedCollectionId}
                  onChange={(event) => setSelectedCollectionId(event.target.value)}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 text-sm text-white outline-none"
                >
                  <option value="" className="bg-slate-950">
                    Selecionar
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
                  title="Adicionar"
                  disabled={!selectedCollectionId || addToCollection.isPending}
                  onClick={handleAddToCollection}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <h2 className="text-sm font-bold tracking-normal text-white">Tipo</h2>
              <div className="mt-3 space-y-2">
                {game.data.collections?.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="truncate text-slate-300">{collection.name}</span>
                    <span className="text-xs text-slate-500">
                      {collectionTypeLabels[collection.type]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="danger"
              className="w-full"
              onClick={handleDelete}
              disabled={deleteGame.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Excluir jogo
            </Button>
          </aside>
        </div>
      </section>
    </div>
  );
}
