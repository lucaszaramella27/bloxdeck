import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { LaunchButton } from "@/components/games/LaunchButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAddGameToCollection,
  useCollection,
  useGames,
  useRemoveGameFromCollection,
} from "@/hooks/api-hooks";
import { formatDateTime } from "@/lib/format";
import { collectionTypeLabels } from "@/types";

export function CollectionDetailPage() {
  const params = useParams();
  const id = params.id ?? "";
  const collection = useCollection(id);
  const games = useGames();
  const addGame = useAddGameToCollection(id);
  const removeGame = useRemoveGameFromCollection(id);
  const [selectedGameId, setSelectedGameId] = useState("");

  const availableGames = useMemo(() => {
    const attached = new Set(collection.data?.games.map((game) => game.id) ?? []);
    return games.data?.filter((game) => !attached.has(game.id)) ?? [];
  }, [collection.data?.games, games.data]);

  const handleAddGame = async () => {
    if (!selectedGameId) {
      return;
    }

    await addGame.mutateAsync(selectedGameId);
    setSelectedGameId("");
  };

  if (collection.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!collection.data) {
    return (
      <EmptyState
        icon={ArrowLeft}
        title="Colecao nao encontrada"
        action={
          <Button asChild>
            <Link to="/collections">Voltar</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/collections">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <section className="glass-panel rounded-lg p-5">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge tone="cyan">{collectionTypeLabels[collection.data.type]}</Badge>
              <Badge tone="lime">{collection.data.gameCount} jogos</Badge>
            </div>
            <h1 className="truncate text-3xl font-bold tracking-normal text-white">
              {collection.data.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {collection.data.description || "Colecao local"}
            </p>
          </div>

          <div className="flex min-w-[360px] gap-2">
            <select
              value={selectedGameId}
              onChange={(event) => setSelectedGameId(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/10 px-3 text-sm text-white outline-none"
            >
              <option value="" className="bg-slate-950">
                Adicionar jogo
              </option>
              {availableGames.map((game) => (
                <option key={game.id} value={game.id} className="bg-slate-950">
                  {game.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              title="Adicionar"
              onClick={handleAddGame}
              disabled={!selectedGameId || addGame.isPending}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {collection.data.games.length ? (
        <div className="grid grid-cols-2 gap-4 2xl:grid-cols-3">
          {collection.data.games.map((game) => (
            <article key={game.id} className="glass-panel flex overflow-hidden rounded-lg">
              <div className="h-48 w-52 shrink-0 bg-slate-950">
                {game.imageUrl ? (
                  <img src={game.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-[linear-gradient(135deg,rgba(56,189,248,0.5),rgba(251,113,133,0.28))]" />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold tracking-normal text-white">{game.name}</h2>
                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(game.lastLaunchedAt)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSm"
                    title="Remover"
                    disabled={removeGame.isPending}
                    onClick={() => removeGame.mutate(game.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="line-clamp-3 flex-1 text-sm leading-5 text-slate-400">
                  {game.description}
                </p>
                <div className="mt-4 flex gap-2">
                  <LaunchButton gameId={game.id} placeId={game.placeId} className="flex-1" />
                  <Button asChild variant="secondary">
                    <Link to={`/games/${game.id}`}>Detalhes</Link>
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={Plus} title="Colecao vazia" description="Adicione jogos pelo seletor acima." />
      )}
    </div>
  );
}
