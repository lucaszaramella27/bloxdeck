import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  Loader2,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useRobloxDiscover, useStartRobloxAuth } from "@/hooks/api-hooks";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { openExternalUrl } from "@/lib/external";
import { compactNumber } from "@/lib/format";
import { isTauriRuntime } from "@/lib/window-mode";
import type { Profile, RobloxExperience } from "@/types";

type CallbackInput = { code: string; state?: string | null };

const callbackPromises = new Map<string, Promise<Profile>>();

function callbackKey(input: CallbackInput) {
  return `${input.state ?? "no-state"}:${input.code}`;
}

function completeRobloxCallbackOnce(input: CallbackInput) {
  const key = callbackKey(input);
  const existing = callbackPromises.get(key);

  if (existing) return existing;

  const promise = api.completeRobloxAuth(input);
  callbackPromises.set(key, promise);

  promise
    .then(() => window.setTimeout(() => callbackPromises.delete(key), 60_000))
    .catch(() => callbackPromises.delete(key));

  return promise;
}

function cleanStatus(value: string) {
  return value.replace(/\.+$/g, "").trim();
}

export function LoginPage() {
  const shellRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const discover = useRobloxDiscover("top-playing-now");
  const startAuth = useStartRobloxAuth();
  const [status, setStatus] = useState("Preparando login seguro");
  const [hasError, setHasError] = useState(false);
  const [isCompletingCallback, setIsCompletingCallback] = useState(false);
  const [isWaitingExternalAuth, setIsWaitingExternalAuth] = useState(false);
  const [callbackComplete, setCallbackComplete] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const nativeApp = isTauriRuntime();
  const isBrowserCallback = location.pathname === "/auth/roblox/callback" && !nativeApp;
  const isBusy = startAuth.isPending || isCompletingCallback || isWaitingExternalAuth;
  const featuredGames = useMemo(
    () => (discover.data?.results ?? []).filter((game) => game.imageUrl).slice(0, 20),
    [discover.data?.results],
  );
  const columns = useMemo(
    () =>
      Array.from({ length: 5 }, (_, columnIndex) =>
        featuredGames.filter((_, gameIndex) => gameIndex % 5 === columnIndex),
      ),
    [featuredGames],
  );
  const spotlight = featuredGames[0];

  useEffect(() => {
    let isMounted = true;
    const oauthError = params.get("error");
    const oauthErrorDescription = params.get("error_description");

    if (oauthError) {
      setCallbackComplete(false);
      setHasError(true);
      setStatus(oauthErrorDescription || `Roblox retornou erro: ${oauthError}`);
      return;
    }

    const code = params.get("code");

    if (!code) {
      setCallbackComplete(false);
      setHasError(false);
      setStatus("Pronto para conectar com sua conta Roblox");
      return;
    }

    setHasError(false);
    setIsCompletingCallback(true);
    setStatus("Finalizando login com Roblox");

    completeRobloxCallbackOnce({
      code,
      state: params.get("state"),
    })
      .then((profile) => {
        if (!isMounted) return;

        queryClient.setQueryData(["profile"], profile);
        void queryClient.invalidateQueries({ queryKey: ["profile"] });
        setStatus("Login concluído");

        if (isBrowserCallback) {
          setCallbackComplete(true);
          return;
        }

        void navigate("/", { replace: true });
      })
      .catch(async (error) => {
        const connectedProfile = await api.getProfile().catch(() => null);

        if (connectedProfile?.robloxUserId) {
          queryClient.setQueryData(["profile"], connectedProfile);

          if (isBrowserCallback) {
            setStatus("Login concluído");
            setCallbackComplete(true);
            return;
          }

          void navigate("/", { replace: true });
          return;
        }

        if (!isMounted) return;

        const message = error instanceof Error ? error.message : "Não foi possível concluir o login";
        setHasError(true);
        setStatus(message);
      })
      .finally(() => {
        if (isMounted) setIsCompletingCallback(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isBrowserCallback, navigate, params, queryClient]);

  useEffect(() => {
    if (!isWaitingExternalAuth) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    const pollProfile = async () => {
      try {
        const profile = await api.getProfile();

        if (cancelled) return;

        if (profile.robloxUserId) {
          queryClient.setQueryData(["profile"], profile);
          void queryClient.invalidateQueries({ queryKey: ["profile"] });
          setStatus("Login concluído");
          setIsWaitingExternalAuth(false);
          void navigate("/", { replace: true });
          return;
        }
      } catch {
        // Keep waiting while the browser authorization is in progress.
      }

      attempts += 1;

      if (attempts >= 120) {
        setIsWaitingExternalAuth(false);
        setHasError(true);
        setStatus("A autorização demorou demais, tente entrar novamente");
        return;
      }

      timer = window.setTimeout(() => void pollProfile(), 1_500);
    };

    timer = window.setTimeout(() => void pollProfile(), 800);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isWaitingExternalAuth, navigate, queryClient]);

  const handleLogin = async () => {
    setHasError(false);
    setStatus("Abrindo autenticação do Roblox");

    try {
      const data = await startAuth.mutateAsync();

      if (nativeApp) {
        await openExternalUrl(data.authUrl);
        setStatus("Aguardando autorização no navegador");
        setIsWaitingExternalAuth(true);
        return;
      }

      window.location.assign(data.authUrl);
    } catch (error) {
      setIsWaitingExternalAuth(false);
      const message = error instanceof Error ? error.message : "Não foi possível iniciar a autenticação";
      setHasError(true);
      setStatus(message);
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * -10;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -8;
    shellRef.current?.style.setProperty("--login-mosaic-x", `${x}px`);
    shellRef.current?.style.setProperty("--login-mosaic-y", `${y}px`);
  };

  const resetPointer = () => {
    shellRef.current?.style.setProperty("--login-mosaic-x", "0px");
    shellRef.current?.style.setProperty("--login-mosaic-y", "0px");
  };

  const loginLabel = isCompletingCallback
    ? "Conectando"
    : isWaitingExternalAuth
      ? "Aguardando autorização"
    : startAuth.isPending
      ? "Abrindo Roblox"
      : "Entrar com Roblox";

  return (
    <main
      ref={shellRef}
      className={cn("login-v2 relative min-h-full overflow-hidden bg-[var(--app-bg)] text-white", isBusy && "login-v2-busy")}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
    >
      <LoginMosaic columns={columns} loading={discover.isLoading} />
      <div className="login-v2-shade absolute inset-0" />

      <header className="login-v2-header absolute inset-x-0 top-0 z-20 flex items-center justify-between px-8 py-7 lg:px-12">
        <div className="flex items-center gap-3">
          <img src="/favicon-48.png" alt="" className="h-11 w-11 rounded-lg object-cover" />
          <div>
            <div className="text-base font-bold text-white">BloxDeck</div>
            <div className="mt-0.5 text-[10px] font-semibold uppercase text-slate-500">Roblox launcher</div>
          </div>
        </div>
        {spotlight ? (
          <div className="hidden items-center gap-2 text-xs font-medium text-slate-400 lg:flex">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Jogos ao vivo
          </div>
        ) : null}
      </header>

      <div className="relative z-10 flex min-h-full items-center px-8 pb-16 pt-28 lg:px-12 xl:px-20">
        <section className="login-v2-copy w-full max-w-[590px]">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-ice-200">
            <Radio className="h-4 w-4" />
            Sua central Roblox
          </div>

          <h1 className="mt-5 text-6xl font-black leading-none text-white sm:text-7xl">BloxDeck</h1>
          <p className="mt-4 text-3xl font-bold leading-tight text-slate-200 sm:text-4xl">
            {callbackComplete
              ? "Autorização concluída"
              : isCompletingCallback
                ? "Conectando sua conta"
                : isWaitingExternalAuth
                  ? "Autorize no navegador"
                  : "Seu Roblox em um só lugar"}
          </p>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-400">
            {callbackComplete
              ? "Sua conta já está conectada e você pode voltar ao BloxDeck"
              : isWaitingExternalAuth
                ? "Conclua a autorização na aba aberta e o launcher entrará automaticamente"
                : "Jogos, amigos, perfil e tudo o que importa pronto para você entrar"}
          </p>

          <div className="mt-8 max-w-[420px]">
            {callbackComplete ? (
              <div className="login-v2-status flex items-start gap-3 rounded-lg bg-emerald-500/15 px-4 py-4 text-emerald-100">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
                <div>
                  <div className="text-sm font-semibold">Conta conectada</div>
                  <div className="mt-1 text-xs leading-5 text-emerald-100/70">Pode fechar esta aba</div>
                </div>
              </div>
            ) : (
              <Button
                className="login-v2-button group h-13 w-full justify-between px-5 text-base"
                onClick={handleLogin}
                disabled={isBusy}
              >
                <span className="flex items-center gap-3">
                  {isBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gamepad2 className="h-5 w-5" />}
                  {loginLabel}
                </span>
                {!isBusy ? <ArrowRight className="h-5 w-5" /> : null}
              </Button>
            )}

            {!callbackComplete && (isBusy || hasError) ? (
              <div
                className={cn(
                  "login-v2-status mt-3 flex items-start gap-3 rounded-lg px-4 py-3",
                  hasError ? "bg-rose-500/15 text-rose-100" : "bg-black/45 text-slate-200",
                )}
                role="status"
                aria-live="polite"
              >
                {hasError ? (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                ) : (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-ice-200" />
                )}
                <span className="text-sm leading-5">{cleanStatus(status)}</span>
              </div>
            ) : !callbackComplete ? (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-300" />
                Autorização oficial do Roblox sem compartilhar sua senha
              </div>
            ) : null}

            {isWaitingExternalAuth ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setIsWaitingExternalAuth(false);
                  setStatus("Pronto para conectar com sua conta Roblox");
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </section>
      </div>

      {spotlight ? <LiveSpotlight game={spotlight} /> : null}
    </main>
  );
}

function LoginMosaic({ columns, loading }: { columns: RobloxExperience[][]; loading: boolean }) {
  const hasGames = columns.some((column) => column.length);

  return (
    <div className="login-mosaic-stage absolute inset-0" aria-hidden="true">
      <div className="login-mosaic">
        {(hasGames ? columns : Array.from({ length: 5 }, () => [])).map((column, columnIndex) => {
          const repeatedGames: Array<RobloxExperience | undefined> = column.length
            ? [...column, ...column]
            : Array.from({ length: 8 }, () => undefined);

          return (
            <div
              key={columnIndex}
              className={cn("login-mosaic-column", columnIndex % 2 === 1 && "login-mosaic-column-reverse")}
              style={{ animationDuration: `${38 + columnIndex * 5}s` }}
            >
              {repeatedGames.map((game, gameIndex) => (
                <div
                  key={game ? `${game.placeId}-${gameIndex}` : `${columnIndex}-${gameIndex}`}
                  className={cn("login-mosaic-tile", loading && "animate-pulse")}
                >
                  {game?.imageUrl ? (
                    <img src={game.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : null}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LiveSpotlight({ game }: { game: RobloxExperience }) {
  return (
    <div className="login-live absolute bottom-8 right-8 z-20 hidden max-w-72 text-right lg:block xl:right-12">
      <div className="text-[10px] font-bold uppercase text-slate-500">Em alta agora</div>
      <div className="mt-1 truncate text-sm font-bold text-white">{game.name}</div>
      {game.playing != null ? (
        <div className="mt-1 flex items-center justify-end gap-1.5 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {compactNumber(game.playing)} jogando
        </div>
      ) : null}
    </div>
  );
}
