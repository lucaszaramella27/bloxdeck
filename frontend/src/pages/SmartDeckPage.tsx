import { ArrowLeft, Crown, Sparkles } from "lucide-react";
import { Link, useParams } from "react-router";

import { GameGrid } from "@/components/games/GameGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useStats } from "@/hooks/api-hooks";

export function SmartDeckPage() {
  const { deckId = "" } = useParams();
  const stats = useStats();
  const deck = stats.data?.smartDecks.find((item) => item.id === deckId);

  if (stats.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-28" />
        <GameGrid isLoading />
      </div>
    );
  }

  if (!deck) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Deck inteligente não encontrado"
        action={
          <Button asChild>
            <Link to="/">Voltar ao painel</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link to="/">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>
      </Button>

      <section className="glass-panel rounded-lg p-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2">
              <Badge tone="cyan">Deck inteligente</Badge>
              {deck.premiumOnly ? <Badge tone="amber">Premium</Badge> : null}
            </div>
            <h1 className="mt-3 text-3xl font-bold text-white">{deck.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">{deck.description}</p>
          </div>
          <div className="text-sm text-slate-500">{deck.gameCount} jogos identificados</div>
        </div>
      </section>

      {deck.locked ? (
        <EmptyState
          icon={Crown}
          title="Disponível no Premium"
          description="O BloxDeck já identificou os jogos desta lista e libera o conteúdo completo no plano Premium"
          action={
            <Button asChild>
              <Link to="/settings">Ver plano</Link>
            </Button>
          }
        />
      ) : (
        <GameGrid games={deck.games} />
      )}
    </div>
  );
}
