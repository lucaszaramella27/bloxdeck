import {
  BellRing,
  Database,
  Gamepad2,
  History,
  Loader2,
  Minimize2,
  MonitorUp,
  RefreshCw,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  useClearHistory,
  useDisconnectRobloxAuth,
  useProfile,
} from "@/hooks/api-hooks";
import {
  areRadarNotificationsEnabled,
  getAutostartEnabled,
  getStartupMode,
  isLaunchConfirmationEnabled,
  isReducedMotionEnabled,
  setAutostartEnabled,
  setLaunchConfirmationEnabled,
  setMinimizeOnLaunch,
  setRadarNotificationsEnabled,
  setReducedMotionEnabled,
  setStartupMode,
  shouldMinimizeOnLaunch,
  type StartupMode,
} from "@/lib/preferences";
import { isTauriRuntime } from "@/lib/window-mode";
import { showToast } from "@/store/useToastStore";

type LocalPreferences = {
  confirmLaunch: boolean;
  minimizeOnLaunch: boolean;
  startupMode: StartupMode;
  radarNotifications: boolean;
  reducedMotion: boolean;
};

function readLocalPreferences(): LocalPreferences {
  return {
    confirmLaunch: isLaunchConfirmationEnabled(),
    minimizeOnLaunch: shouldMinimizeOnLaunch(),
    startupMode: getStartupMode(),
    radarNotifications: areRadarNotificationsEnabled(),
    reducedMotion: isReducedMotionEnabled(),
  };
}

export function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const clearHistory = useClearHistory();
  const disconnect = useDisconnectRobloxAuth();
  const nativeApp = isTauriRuntime();
  const [preferences, setPreferences] = useState(readLocalPreferences);
  const [autostart, setAutostart] = useState(false);
  const [autostartLoading, setAutostartLoading] = useState(nativeApp);
  const [autostartError, setAutostartError] = useState<string | null>(null);

  useEffect(() => {
    if (!nativeApp) return;

    void getAutostartEnabled()
      .then(setAutostart)
      .catch(() => setAutostartError("Não foi possível consultar a inicialização do Windows"))
      .finally(() => setAutostartLoading(false));
  }, [nativeApp]);

  const saved = () => showToast("Preferência atualizada", { tone: "success" });

  const updateAutostart = async (enabled: boolean) => {
    setAutostartLoading(true);
    setAutostartError(null);

    try {
      await setAutostartEnabled(enabled);
      setAutostart(enabled);
      saved();
    } catch (error) {
      setAutostartError(
        error instanceof Error ? error.message : "Não foi possível alterar a inicialização do Windows",
      );
    } finally {
      setAutostartLoading(false);
    }
  };

  const updateStartupMode = (mode: StartupMode) => {
    setStartupMode(mode);
    setPreferences((current) => ({ ...current, startupMode: mode }));
    saved();
  };

  const clearCachedData = () => {
    queryClient.removeQueries({
      predicate: (query) => query.queryKey[0] !== "profile",
    });
    showToast("Cache limpo", {
      description: "Os dados serão carregados novamente quando necessário",
      tone: "success",
    });
  };

  const removeHistory = async () => {
    if (!window.confirm("Excluir todo o histórico de jogos?")) return;
    await clearHistory.mutateAsync();
  };

  const reconnect = async () => {
    await disconnect.mutateAsync();
    void navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <h1 className="text-3xl font-bold text-white">Ajustes</h1>
        <p className="mt-1.5 text-sm text-slate-500">Preferências essenciais do BloxDeck</p>
      </header>

      <SettingsSection icon={<Gamepad2 className="h-5 w-5" />} title="Launcher">
        <SettingRow
          icon={<Gamepad2 className="h-4 w-4 text-ice-200" />}
          title="Confirmar antes de jogar"
          description="Mostra a confirmação antes de abrir uma experiência"
          control={
            <Switch
              aria-label="Confirmar antes de jogar"
              checked={preferences.confirmLaunch}
              onCheckedChange={(checked) => {
                setLaunchConfirmationEnabled(checked);
                setPreferences((current) => ({ ...current, confirmLaunch: checked }));
                saved();
              }}
            />
          }
        />
        <SettingRow
          icon={<Minimize2 className="h-4 w-4 text-cyan-200" />}
          title="Minimizar ao abrir o Roblox"
          description="Libera a tela quando o jogo for iniciado"
          control={
            <Switch
              aria-label="Minimizar ao abrir o Roblox"
              checked={preferences.minimizeOnLaunch}
              onCheckedChange={(checked) => {
                setMinimizeOnLaunch(checked);
                setPreferences((current) => ({ ...current, minimizeOnLaunch: checked }));
                saved();
              }}
            />
          }
        />
        <SettingRow
          icon={<MonitorUp className="h-4 w-4 text-emerald-300" />}
          title="Iniciar com o Windows"
          description="Abre o BloxDeck quando você entrar no sistema"
          control={
            autostartLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
            ) : (
              <Switch
                aria-label="Iniciar com o Windows"
                checked={autostart}
                disabled={!nativeApp}
                onCheckedChange={(checked) => void updateAutostart(checked)}
              />
            )
          }
        />
        <SettingRow
          icon={<Minimize2 className="h-4 w-4 text-amber-200" />}
          title="Modo inicial"
          description="Escolha o tamanho usado ao abrir o aplicativo"
          control={
            <div className="flex rounded-lg bg-[var(--surface-muted)] p-1" role="group" aria-label="Modo inicial">
              <ModeButton active={preferences.startupMode === "normal"} onClick={() => updateStartupMode("normal")}>Normal</ModeButton>
              <ModeButton active={preferences.startupMode === "compact"} onClick={() => updateStartupMode("compact")}>Compacto</ModeButton>
            </div>
          }
        />
      </SettingsSection>

      {autostartError ? (
        <div className="rounded-lg bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{autostartError}</div>
      ) : null}

      <SettingsSection icon={<Sparkles className="h-5 w-5" />} title="Experiência">
        <SettingRow
          icon={<BellRing className="h-4 w-4 text-signal" />}
          title="Notificações do Radar"
          description="Mostra atualizações e alertas acompanhados"
          control={
            <Switch
              aria-label="Notificações do Radar"
              checked={preferences.radarNotifications}
              onCheckedChange={(checked) => {
                setRadarNotificationsEnabled(checked);
                setPreferences((current) => ({ ...current, radarNotifications: checked }));
                saved();
              }}
            />
          }
        />
        <SettingRow
          icon={<Sparkles className="h-4 w-4 text-cyan-200" />}
          title="Reduzir animações"
          description="Diminui movimentos e transições da interface"
          control={
            <Switch
              aria-label="Reduzir animações"
              checked={preferences.reducedMotion}
              onCheckedChange={(checked) => {
                setReducedMotionEnabled(checked);
                setPreferences((current) => ({ ...current, reducedMotion: checked }));
                saved();
              }}
            />
          }
        />
      </SettingsSection>

      <SettingsSection icon={<UserRound className="h-5 w-5" />} title="Conta e dados">
        <SettingRow
          icon={
            profile.data?.avatarUrl ? (
              <img src={profile.data.avatarUrl} alt="" className="h-8 w-8 rounded-md object-cover" />
            ) : (
              <UserRound className="h-4 w-4 text-ice-200" />
            )
          }
          title={profile.data?.displayName ?? "Conta Roblox"}
          description={`@${profile.data?.robloxUsername ?? profile.data?.handle ?? "roblox"}`}
          control={
            <div className="flex items-center gap-2">
              <Badge tone="lime">Conectada</Badge>
              <Button type="button" variant="secondary" size="sm" onClick={() => void reconnect()} disabled={disconnect.isPending}>
                {disconnect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Reconectar
              </Button>
            </div>
          }
        />
        <SettingRow
          icon={<Database className="h-4 w-4 text-cyan-200" />}
          title="Cache do launcher"
          description="Remove dados temporários de jogos e perfis"
          control={
            <Button type="button" variant="secondary" size="sm" onClick={clearCachedData}>
              Limpar cache
            </Button>
          }
        />
        <SettingRow
          icon={<History className="h-4 w-4 text-rose-200" />}
          title="Histórico de jogos"
          description="Remove todos os registros de partidas abertas"
          control={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-rose-200"
              onClick={() => void removeHistory()}
              disabled={clearHistory.isPending}
            >
              {clearHistory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Limpar histórico
            </Button>
          }
        />
      </SettingsSection>
    </div>
  );
}

function SettingsSection({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 text-slate-300">
        <span className="text-ice-200">{icon}</span>
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function SettingRow({
  icon,
  title,
  description,
  control,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex min-h-20 items-center gap-4 rounded-lg bg-[var(--panel-bg)] px-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--panel-bg-hover)]">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-8 rounded-md px-3 text-xs font-semibold transition-colors duration-100 ${
        active ? "bg-ice-100 text-[#0d1118]" : "text-slate-400 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
