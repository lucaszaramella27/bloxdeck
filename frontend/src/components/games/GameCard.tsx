import { motion } from "framer-motion";
import { Eye, Heart, Info, MoreHorizontal, UsersRound } from "lucide-react";
import { Link } from "react-router";

import { LaunchButton } from "@/components/games/LaunchButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToggleFavorite } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { compactNumber } from "@/lib/format";
import type { Game } from "@/types";

type GameCardProps = {
  game: Game;
  compact?: boolean;
};

export function GameCard({ game, compact = false }: GameCardProps) {
  const favorite = useToggleFavorite();
  const roblox = game.roblox;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className="glass-panel group overflow-hidden rounded-lg"
    >
      <div className={cn("relative bg-slate-950", compact ? "h-36" : "h-48")}>
        {game.imageUrl ? (
          <img
            src={game.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            draggable={false}
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,rgba(56,189,248,0.45),rgba(132,204,22,0.25),rgba(251,113,133,0.28))]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
        <Button
          type="button"
          title={game.isFavorite ? "Remover favorito" : "Favoritar"}
          aria-label={game.isFavorite ? "Remover favorito" : "Favoritar"}
          size="iconSm"
          variant="secondary"
          className={cn(
            "absolute right-3 top-3",
            game.isFavorite && "border-rose-300/40 bg-rose-300/15 text-rose-100",
          )}
          onClick={() => favorite.mutate({ gameId: game.id, isFavorite: game.isFavorite })}
          disabled={favorite.isPending}
        >
          <Heart className={cn("h-4 w-4", game.isFavorite && "fill-current")} />
        </Button>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <Badge tone="cyan">#{game.placeId}</Badge>
              {roblox?.playing != null ? (
                <Badge tone="lime">{compactNumber(roblox.playing)} online</Badge>
              ) : game.launchCount > 0 ? (
                <Badge tone="lime">{compactNumber(game.launchCount)} launches</Badge>
              ) : null}
            </div>
            <h3 className="truncate text-xl font-bold tracking-normal text-white">{game.name}</h3>
          </div>
          <MoreHorizontal className="h-5 w-5 shrink-0 text-white/55" />
        </div>
      </div>

      <div className="space-y-4 p-4">
        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">{game.description}</p>

        <div className="grid grid-cols-2 gap-3 text-xs text-slate-500">
          <div>
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <UsersRound className="h-3.5 w-3.5" />
              Jogando
            </div>
            <div className="mt-1 truncate">
              {roblox?.playing != null ? compactNumber(roblox.playing) : "Sem snapshot"}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-medium text-slate-300">
              <Eye className="h-3.5 w-3.5" />
              Visitas
            </div>
            <div className="mt-1 truncate">
              {roblox?.visits != null
                ? compactNumber(roblox.visits)
                : `${compactNumber(game.launchCount)} launches`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LaunchButton gameId={game.id} placeId={game.placeId} className="flex-1" />
          <Button asChild variant="secondary" size="icon" title="Detalhes">
            <Link to={`/games/${game.id}`} aria-label={`Detalhes de ${game.name}`}>
              <Info className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
