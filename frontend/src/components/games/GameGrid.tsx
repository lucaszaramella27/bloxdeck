import { Gamepad2 } from "lucide-react";
import type * as React from "react";

import { GameCard } from "@/components/games/GameCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { Game } from "@/types";

type GameGridProps = {
  games?: Game[];
  isLoading?: boolean;
  emptyAction?: React.ReactNode;
};

export function GameGrid({ games, isLoading, emptyAction }: GameGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 2xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="glass-panel overflow-hidden rounded-lg">
            <Skeleton className="h-48 rounded-none" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!games?.length) {
    return (
      <EmptyState
        icon={Gamepad2}
        title="Nenhum jogo encontrado"
        description="Adicione experiencias por placeId para montar seu deck local."
        action={emptyAction}
      />
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 2xl:grid-cols-4">
      {games.map((game) => (
        <GameCard key={game.id} game={game} />
      ))}
    </div>
  );
}
