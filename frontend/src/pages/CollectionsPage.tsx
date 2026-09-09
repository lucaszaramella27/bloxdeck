import { ArrowRight, Crown, Layers3, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

import { CollectionCard } from "@/components/collections/CollectionCard";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollections, useProfile, useStats } from "@/hooks/api-hooks";

export function CollectionsPage() {
  const [open, setOpen] = useState(false);
  const collections = useCollections();
  const profile = useProfile();
  const stats = useStats();
  const collectionsLimit = profile.data?.subscription.limits.collections;
  const collectionsUsage = profile.data?.subscription.usage?.collections ?? collections.data?.length ?? 0;

  const createButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nova coleção
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova coleção</DialogTitle>
          <DialogDescription>Agrupe jogos por momento, squad ou objetivo.</DialogDescription>
        </DialogHeader>
        <CollectionForm onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-white">Coleções</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-slate-400">
            <span>{collections.data?.length ?? 0} grupos ativos</span>
            <span className="inline-flex items-center gap-1 text-xs text-signal">
              <Crown className="h-3.5 w-3.5" />
              {collectionsLimit == null ? "Premium ilimitado" : `Free ${collectionsUsage}/${collectionsLimit}`}
            </span>
          </p>
        </div>
        {createButton}
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-ice-200" />
          <h2 className="text-sm font-bold text-slate-200">Decks inteligentes</h2>
        </div>
        {stats.isLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {stats.data?.smartDecks.map((deck) => (
              <Link
                key={deck.id}
                to={`/smart-decks/${deck.id}`}
                className="surface-soft flex min-h-24 items-center gap-3 rounded-lg p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-300/50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ice-100/[0.08] text-ice-100">
                  {deck.locked ? <Crown className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{deck.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {deck.locked ? "Premium" : `${deck.gameCount} jogos`}
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {collections.isLoading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-56" />
          ))}
        </div>
      ) : collections.data?.length ? (
        <div className="grid grid-cols-4 gap-4">
          {collections.data.map((collection) => (
            <CollectionCard key={collection.id} collection={collection} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Layers3}
          title="Nenhuma coleção"
          description="Crie listas para jogar depois, grindar ou separar jogos com amigos."
          action={createButton}
        />
      )}
    </div>
  );
}
