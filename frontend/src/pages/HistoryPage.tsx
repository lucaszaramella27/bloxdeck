import { History, Trash2 } from "lucide-react";

import { HistoryList } from "@/components/history/HistoryList";
import { Button } from "@/components/ui/button";
import { useClearHistory, useDeleteHistoryEntry, useHistory } from "@/hooks/api-hooks";

export function HistoryPage() {
  const history = useHistory(50);
  const deleteHistoryEntry = useDeleteHistoryEntry();
  const clearHistory = useClearHistory();
  const hasHistory = Boolean(history.data?.length);

  function handleClearHistory() {
    const confirmed = window.confirm("Excluir todo o histórico? Os jogos salvos continuam no deck.");

    if (confirmed) {
      clearHistory.mutate();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-normal text-white">
            <History className="h-7 w-7 text-cyan-200" />
            Histórico de jogos
          </h1>
          <p className="mt-2 text-sm text-slate-400">{history.data?.length ?? 0} jogos abertos recentemente</p>
        </div>
        <Button
          type="button"
          variant="danger"
          disabled={!hasHistory || clearHistory.isPending}
          onClick={handleClearHistory}
        >
          <Trash2 className="h-4 w-4" />
          Excluir todos
        </Button>
      </div>

      {history.error ? (
        <div className="rounded-lg bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {history.error.message}
        </div>
      ) : null}

      {deleteHistoryEntry.error ? (
        <div className="rounded-lg bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {deleteHistoryEntry.error.message}
        </div>
      ) : null}

      {clearHistory.error ? (
        <div className="rounded-lg bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {clearHistory.error.message}
        </div>
      ) : null}

      <HistoryList
        entries={history.data}
        isLoading={history.isLoading}
        deletingId={deleteHistoryEntry.variables ?? null}
        onDelete={(entryId) => deleteHistoryEntry.mutate(entryId)}
      />
    </div>
  );
}
