import { Clock3, Gamepad2, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import type { HistoryEntry } from "@/types";

type HistoryListProps = {
  entries?: HistoryEntry[];
  isLoading?: boolean;
  deletingId?: string | null;
  onDelete?: (entryId: string) => void;
};

export function HistoryList({ entries, isLoading, deletingId, onDelete }: HistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="glass-panel flex items-center gap-4 rounded-lg p-3">
            <Skeleton className="h-14 w-20" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!entries?.length) {
    return <EmptyState icon={Clock3} title="Histórico vazio" description="Os jogos abertos pelo launcher aparecem aqui." />;
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <article key={entry.id} className="glass-panel flex items-center gap-4 rounded-lg p-3">
          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-white/10">
            {entry.game.imageUrl ? (
              <img src={entry.game.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-white/[0.04] text-slate-600">
                <Gamepad2 className="h-6 w-6" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-white">{entry.game.name}</h3>
            <p className="mt-1 truncate text-xs text-slate-500">{formatDateTime(entry.createdAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Badge tone="lime">{entry.gameLaunchCount} vezes</Badge>
            <Button
              type="button"
              variant="ghost"
              size="iconSm"
              title="Remover do histórico"
              aria-label={`Remover ${entry.game.name} do histórico`}
              disabled={deletingId === entry.id}
              onClick={() => onDelete?.(entry.id)}
            >
              <Trash2 className="h-4 w-4 text-rose-200" />
            </Button>
          </div>
        </article>
      ))}
    </div>
  );
}
