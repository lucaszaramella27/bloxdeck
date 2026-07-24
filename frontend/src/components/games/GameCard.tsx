import { Gamepad2, Heart, Info, MoreHorizontal, UsersRound } from "lucide-react";
import { Link } from "react-router";

import { LaunchButton } from "@/components/games/LaunchButton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useRobloxSocial, useToggleFavorite } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { compactNumber } from "@/lib/format";
import { showToast } from "@/store/useToastStore";
import type { Game } from "@/types";

type GameCardProps = {
  game: Game;
  compact?: boolean;
};

export function GameCard({ game, compact = false }: GameCardProps) {
  const favorite = useToggleFavorite();
  const social = useRobloxSocial();
  const roblox = game.roblox;
  const friendsHere = (social.data?.friends ?? []).filter(
    (friend) =>
      friend.presence.isInGame &&
      (friend.presence.placeId === game.placeId || friend.presence.rootPlaceId === game.placeId),
  );

  const toggleFavorite = () => {
    favorite.mutate(
      { gameId: game.id, isFavorite: game.isFavorite },
      {
        onSuccess: (result) =>
          showToast(result.isFavorite ? "Adicionado aos favoritos" : "Removido dos favoritos", {
            description: game.name,
            tone: "success",
          }),
      },
    );
  };

  const actions = (
    <>
      <DropdownMenuItem asChild>
        <Link to={`/games/${game.id}`}>
          <Info className="h-4 w-4" />
          Abrir detalhes
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={toggleFavorite}>
        <Heart className={cn("h-4 w-4", game.isFavorite && "fill-current text-rose-200")} />
        {game.isFavorite ? "Remover favorito" : "Favoritar"}
      </DropdownMenuItem>
    </>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <article className="game-tile flex h-full flex-col overflow-hidden rounded-lg bg-[var(--panel-bg)]">
          <div className={cn("relative aspect-video bg-[var(--sidebar-bg)]", compact && "aspect-[16/8]")}>
            {game.imageUrl ? (
              <img src={game.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-700">
                <Gamepad2 className="h-7 w-7" />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent" />
            <div className="absolute bottom-2.5 left-3 flex items-center gap-2 text-[11px] font-semibold text-white">
              {roblox?.playing != null ? (
                <span className="rounded-md bg-black/55 px-2 py-1 backdrop-blur-sm">
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-lime-300" />
                  {compactNumber(roblox.playing)} online
                </span>
              ) : null}
              {friendsHere.length ? (
                <span className="rounded-md bg-black/55 px-2 py-1 backdrop-blur-sm">
                  {friendsHere.length} amigo{friendsHere.length > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>
            <div className="absolute right-2.5 top-2.5">
              <DropdownMenu>
                <Tooltip content="Mais ações" side="top">
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="secondary"
                      size="iconSm"
                      aria-label={`Ações de ${game.name}`}
                      className="bg-black/55 backdrop-blur-sm hover:bg-black/70"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </Tooltip>
                <DropdownMenuContent align="end">{actions}</DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link to={`/games/${game.id}`} className="block truncate text-sm font-bold text-white">
                  {game.name}
                </Link>
                <div className="mt-1 truncate text-xs text-slate-600">
                  {roblox?.creatorName ?? `${compactNumber(game.launchCount)} aberturas`}
                </div>
              </div>
              {friendsHere.length ? (
                <div className="flex -space-x-1.5">
                  {friendsHere.slice(0, 3).map((friend) => (
                    <div
                      key={friend.id}
                      title={friend.displayName}
                      className="h-6 w-6 overflow-hidden rounded-md bg-[var(--surface-overlay)] ring-2 ring-[var(--panel-bg)]"
                    >
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <UsersRound className="m-1.5 h-3 w-3 text-slate-500" />
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-auto flex items-center gap-2 pt-3">
              <LaunchButton game={game} size="sm" className="flex-1" />
              <Tooltip content={game.isFavorite ? "Remover favorito" : "Favoritar"} side="top">
                <Button
                  type="button"
                  variant="ghost"
                  size="iconSm"
                  onClick={toggleFavorite}
                  disabled={favorite.isPending}
                  aria-label={game.isFavorite ? "Remover favorito" : "Favoritar"}
                  className={cn(game.isFavorite && "text-rose-200")}
                >
                  <Heart className={cn("h-4 w-4", game.isFavorite && "fill-current")} />
                </Button>
              </Tooltip>
            </div>
          </div>
        </article>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem asChild>
          <Link to={`/games/${game.id}`}>
            <Info className="h-4 w-4" />
            Abrir detalhes
          </Link>
        </ContextMenuItem>
        <ContextMenuItem onSelect={toggleFavorite}>
          <Heart className={cn("h-4 w-4", game.isFavorite && "fill-current text-rose-200")} />
          {game.isFavorite ? "Remover favorito" : "Favoritar"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
