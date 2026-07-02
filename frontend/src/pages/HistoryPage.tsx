import { History } from "lucide-react";

import { HistoryList } from "@/components/history/HistoryList";
import { useHistory } from "@/hooks/api-hooks";

export function HistoryPage() {
  const history = useHistory(50);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-normal text-white">
          <History className="h-7 w-7 text-cyan-200" />
          Historico
        </h1>
        <p className="mt-2 text-sm text-slate-400">{history.data?.length ?? 0} launches recentes</p>
      </div>

      {history.error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
          {history.error.message}
        </div>
      ) : null}

      <HistoryList entries={history.data} isLoading={history.isLoading} />
    </div>
  );
}

