import { ArrowRight, Layers3 } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { Collection } from "@/types";
import { collectionTypeLabels } from "@/types";

type CollectionCardProps = {
  collection: Collection;
};

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <article className="glass-panel rounded-lg p-4">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10"
          style={{ backgroundColor: `${collection.color}22`, color: collection.color }}
        >
          <Layers3 className="h-5 w-5" />
        </div>
        <Badge tone="slate">{collection.gameCount} jogos</Badge>
      </div>

      <h3 className="truncate text-lg font-bold tracking-normal text-white">{collection.name}</h3>
      <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-400">
        {collection.description || collectionTypeLabels[collection.type]}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="min-w-0 text-xs text-slate-500">
          <div className="font-medium text-slate-300">{collectionTypeLabels[collection.type]}</div>
          <div className="mt-1 truncate">{formatDateTime(collection.updatedAt)}</div>
        </div>
        <Button asChild variant="secondary" size="icon" title="Abrir coleção">
          <Link to={`/collections/${collection.id}`} aria-label={`Abrir ${collection.name}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
