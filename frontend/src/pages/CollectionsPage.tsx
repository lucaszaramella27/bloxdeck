import { Layers3, Plus } from "lucide-react";
import { useState } from "react";

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
import { useCollections } from "@/hooks/api-hooks";

export function CollectionsPage() {
  const [open, setOpen] = useState(false);
  const collections = useCollections();

  const createButton = (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nova colecao
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova colecao</DialogTitle>
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
          <h1 className="text-3xl font-bold tracking-normal text-white">Colecoes</h1>
          <p className="mt-2 text-sm text-slate-400">
            {collections.data?.length ?? 0} grupos ativos
          </p>
        </div>
        {createButton}
      </div>

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
          title="Nenhuma colecao"
          description="Crie listas para jogar depois, grindar ou separar jogos com amigos."
          action={createButton}
        />
      )}
    </div>
  );
}

