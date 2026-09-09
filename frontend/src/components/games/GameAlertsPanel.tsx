import { BellRing, Crown, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAlerts, useCreateAlert, useDeleteAlert, useProfile } from "@/hooks/api-hooks";
import { compactNumber } from "@/lib/format";
import type { Game } from "@/types";

export function GameAlertsPanel({ game }: { game: Game }) {
  const alerts = useAlerts(game.id);
  const profile = useProfile();
  const createAlert = useCreateAlert();
  const deleteAlert = useDeleteAlert();
  const suggestedThreshold = Math.max(
    100,
    Math.ceil(((game.roblox?.playing ?? 0) * 1.25) / 100) * 100,
  );
  const [threshold, setThreshold] = useState(suggestedThreshold);
  const updateAlert = useMemo(
    () => alerts.data?.find((alert) => alert.kind === "GAME_UPDATE"),
    [alerts.data],
  );
  const playerAlert = useMemo(
    () => alerts.data?.find((alert) => alert.kind === "PLAYER_THRESHOLD"),
    [alerts.data],
  );
  const pending = createAlert.isPending || deleteAlert.isPending;
  const error = createAlert.error ?? deleteAlert.error;
  const alertLimit = profile.data?.subscription.limits.alerts;
  const alertUsage = profile.data?.subscription.usage?.alerts ?? 0;

  useEffect(() => {
    if (playerAlert?.threshold) {
      setThreshold(playerAlert.threshold);
    }
  }, [playerAlert?.threshold]);

  const toggleUpdateAlert = async (checked: boolean) => {
    if (checked) {
      await createAlert.mutateAsync({ gameId: game.id, kind: "GAME_UPDATE" });
    } else if (updateAlert) {
      await deleteAlert.mutateAsync(updateAlert.id);
    }
  };

  const togglePlayerAlert = async (checked: boolean) => {
    if (checked) {
      await createAlert.mutateAsync({
        gameId: game.id,
        kind: "PLAYER_THRESHOLD",
        threshold,
      });
    } else if (playerAlert) {
      await deleteAlert.mutateAsync(playerAlert.id);
    }
  };

  return (
    <section className="rounded-lg bg-[var(--panel-bg)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-cyan-200" />
            <h2 className="text-sm font-bold text-white">Alertas do jogo</h2>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Acompanhe mudanças importantes</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-signal">
          <Crown className="h-3 w-3" />
          {alertLimit == null ? "Ilimitado" : `${alertUsage}/${alertLimit}`}
        </div>
      </div>

      {alerts.isLoading ? (
        <div className="mt-5 space-y-4">
          <Skeleton className="h-12" />
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <label className="flex min-h-12 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-cyan-300/[0.09] text-cyan-100">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-200">Nova atualização</div>
              <div className="mt-0.5 text-xs text-slate-500">Quando o Roblox publicar mudanças</div>
            </div>
            <Switch
              checked={Boolean(updateAlert)}
              onCheckedChange={(checked) => void toggleUpdateAlert(checked)}
              disabled={pending}
              aria-label="Alerta de atualização"
            />
          </label>

          <div>
            <div className="flex min-h-12 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-300/[0.09] text-emerald-300">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-slate-200">Meta de jogadores</div>
                <div className="mt-0.5 text-xs text-slate-500">
                  Agora: {compactNumber(game.roblox?.playing ?? 0)}
                </div>
              </div>
              <Switch
                checked={Boolean(playerAlert)}
                onCheckedChange={(checked) => void togglePlayerAlert(checked)}
                disabled={pending || (!playerAlert && threshold < 1)}
                aria-label="Alerta de jogadores"
              />
            </div>

            <div className="relative mt-3">
              <Input
                type="number"
                min={1}
                max={10_000_000}
                value={threshold}
                onChange={(event) => setThreshold(Number(event.target.value))}
                disabled={Boolean(playerAlert) || pending}
                className="h-10 pr-24"
                aria-label="Quantidade de jogadores para o alerta"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                jogadores
              </span>
            </div>
          </div>
        </div>
      )}

      {error ? <div className="mt-4 text-xs text-rose-200">{error.message}</div> : null}
    </section>
  );
}
