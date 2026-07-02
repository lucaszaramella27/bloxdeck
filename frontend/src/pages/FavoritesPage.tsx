import { Heart } from "lucide-react";
import { Link } from "react-router";

import { GameGrid } from "@/components/games/GameGrid";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/api-hooks";

export function FavoritesPage() {
  const favorites = useFavorites();
  const games = favorites.data?.map((favorite) => favorite.game) ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-normal text-white">
          <Heart className="h-7 w-7 text-rose-200" />
          Favoritos
        </h1>
        <p className="mt-2 text-sm text-slate-400">{games.length} jogos marcados</p>
      </div>

      {favorites.error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {favorites.error.message}
        </div>
      ) : null}

      <GameGrid
        games={games}
        isLoading={favorites.isLoading}
        emptyAction={
          <Button asChild>
            <Link to="/games">Abrir jogos</Link>
          </Button>
        }
      />
    </div>
  );
}

