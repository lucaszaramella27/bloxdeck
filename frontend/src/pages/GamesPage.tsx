import { Crown, Plus } from "lucide-react";
import { useState } from "react";

import { GameForm } from "@/components/games/GameForm";
import { GameGrid } from "@/components/games/GameGrid";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useGames, useProfile } from "@/hooks/api-hooks";
import { RobloxPage } from "@/pages/RobloxPage";
import { useUiStore } from "@/store/useUiStore";

export function GamesPage() {
  const [open, setOpen] = useState(false);
  const search = useUiStore((state) => state.search);
  const games = useGames(search);
  const profile = useProfile();
  const gamesLimit = profile.data?.subscription.limits.games;
  const gamesUsage = profile.data?.subscription.usage?.games ?? games.data?.length ?? 0;

  const createButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Novo jogo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo jogo</DialogTitle>
          <DialogDescription>
            Cole um Place ID para buscar os metadados públicos do Roblox.
          </DialogDescription>
        </DialogHeader>
        <GameForm onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-6">
      <RobloxPage />

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-normal text-white">Meus jogos salvos</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
              <span>{games.data?.length ?? 0} itens no deck</span>
              <span className="inline-flex items-center gap-1 text-xs text-signal">
                <Crown className="h-3.5 w-3.5" />
                {gamesLimit == null ? "Premium ilimitado" : `Free ${gamesUsage}/${gamesLimit}`}
              </span>
            </p>
          </div>
          {createButton}
        </div>

        {games.error ? (
          <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
            {games.error.message}
          </div>
        ) : null}

        <GameGrid games={games.data} isLoading={games.isLoading} emptyAction={createButton} />
      </section>
    </div>
  );
}
