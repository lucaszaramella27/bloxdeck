import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { useCompleteRobloxAuth, useStartRobloxAuth } from "@/hooks/api-hooks";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Conectando fluxo de autenticacao...");

  const startAuth = useStartRobloxAuth();
  const completeAuth = useCompleteRobloxAuth();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const handledCallbackCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const oauthError = params.get("error");
    const oauthErrorDescription = params.get("error_description");

    if (oauthError) {
      setStatus(oauthErrorDescription || `Roblox retornou erro: ${oauthError}`);
      return;
    }

    const code = params.get("code");

    if (!code) {
      setStatus("Clique para entrar com sua conta Roblox.");
      return;
    }

    if (handledCallbackCodeRef.current === code) {
      return;
    }

    handledCallbackCodeRef.current = code;
    setStatus("Finalizando login com Roblox...");
    completeAuth.mutate(
      {
        code,
        state: params.get("state"),
      },
      {
        onSuccess: () => {
          setStatus("Login concluido.");
          void navigate("/", { replace: true });
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : "Nao foi possivel concluir o login.";
          setStatus(message);
        },
      },
    );
  }, [completeAuth, navigate, params]);

  const handleLogin = async () => {
    setStatus("Abrindo autenticacao do Roblox...");
    try {
      const data = await startAuth.mutateAsync();
      window.location.assign(data.authUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel iniciar a autenticacao.";
      setStatus(message);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-10">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-white/10 p-8 shadow-2xl">
        <div className="space-y-4">
          <div className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
            Login Roblox
          </div>
          <h1 className="text-3xl font-semibold text-white">Entrar com Roblox</h1>
          <p className="max-w-xl text-sm leading-7 text-slate-400">
            Conecte sua conta Roblox ao launcher para mostrar perfil e avatar reais.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-white/10 bg-slate-950/40 p-6">
          <p className="text-sm text-slate-300">{status}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleLogin} disabled={startAuth.isPending || completeAuth.isPending}>
              {startAuth.isPending ? "Abrindo..." : "Entrar com Roblox"}
            </Button>
            <Button variant="secondary" onClick={() => void navigate("/", { replace: true })}>
              Voltar ao launcher
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
