import { Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useProfile, useUpdateProfile } from "@/hooks/api-hooks";

export function SettingsPage() {
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const [form, setForm] = useState({
    displayName: "Local Player",
    avatarUrl: "",
    systemTheme: false,
    accentColor: "#38bdf8",
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        displayName: profile.data.displayName,
        avatarUrl: profile.data.avatarUrl ?? "",
        systemTheme: profile.data.settings?.theme === "SYSTEM",
        accentColor: profile.data.settings?.accentColor ?? "#38bdf8",
      });
    }
  }, [profile.data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    await updateProfile.mutateAsync({
      displayName: form.displayName.trim(),
      avatarUrl: form.avatarUrl.trim() || null,
      theme: form.systemTheme ? "SYSTEM" : "DARK",
      accentColor: form.accentColor,
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-normal text-white">Ajustes</h1>
        <p className="mt-2 text-sm text-slate-400">Perfil local e preferencias do app.</p>
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-5">
        <form className="glass-panel rounded-lg p-5" onSubmit={handleSubmit}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-normal text-white">Perfil local</h2>
              <p className="text-sm text-slate-500">
                @{profile.data?.robloxUsername ?? profile.data?.handle ?? "local-player"}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-400">Nome</span>
              <Input
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-400">Avatar</span>
              <Input
                type="url"
                placeholder="https://..."
                value={form.avatarUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, avatarUrl: event.target.value }))
                }
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-slate-400">Accent</span>
              <Input
                type="color"
                value={form.accentColor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, accentColor: event.target.value }))
                }
                className="max-w-28 p-1"
              />
            </label>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <div>
                <div className="text-sm font-medium text-white">Tema do sistema</div>
                <div className="mt-1 text-xs text-slate-500">Dark continua como padrao visual.</div>
              </div>
              <Switch
                checked={form.systemTheme}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, systemTheme: checked }))
                }
              />
            </div>
          </div>

          {updateProfile.error ? (
            <div className="mt-4 rounded-lg border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-sm text-rose-100">
              {updateProfile.error.message}
            </div>
          ) : null}

          <Button type="submit" className="mt-5" disabled={updateProfile.isPending}>
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar
          </Button>
        </form>

        <aside className="glass-panel rounded-lg p-5">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lime-300/15 text-lime-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-normal text-white">Seguranca</h2>
              <p className="text-sm text-slate-500">Launcher companion</p>
            </div>
          </div>
          <div className="space-y-2">
            <Badge tone="lime">Sem senha Roblox</Badge>
            <Badge tone="cyan">Sem cookie</Badge>
            <Badge tone="rose">Sem executor</Badge>
          </div>
          <p className="mt-5 text-sm leading-6 text-slate-400">
            O desktop chama a API e abre links oficiais. Banco e SQLAlchemy ficam apenas no backend.
          </p>
        </aside>
      </div>
    </div>
  );
}
