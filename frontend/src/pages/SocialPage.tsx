import {
  ExternalLink,
  Loader2,
  RefreshCw,
  Shirt,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRobloxSocial } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { compactNumber, formatDateTime } from "@/lib/format";

async function openExternalUrl(url: string) {
  if (window.__TAURI_INTERNALS__) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

function colorValue(value: string | number) {
  if (typeof value === "number") {
    return "#38bdf8";
  }

  return value.startsWith("#") ? value : `#${value}`;
}

function scaleLabel(key: string) {
  const labels: Record<string, string> = {
    height: "Altura",
    width: "Largura",
    head: "Cabeca",
    depth: "Profund.",
    proportion: "Prop.",
    bodyType: "Corpo",
  };

  return labels[key] ?? key;
}

export function SocialPage() {
  const social = useRobloxSocial();
  const data = social.data;
  const counts = data?.counts;
  const bodyColors = data?.avatar.bodyColor3s ? Object.entries(data.avatar.bodyColor3s) : [];
  const scales = data?.avatar.scales ? Object.entries(data.avatar.scales) : [];
  const metrics: Array<{ label: string; value: number; icon: LucideIcon; tone: string }> = [
    { label: "Amigos", value: counts?.friends ?? 0, icon: UsersRound, tone: "text-cyan-200" },
    { label: "Seguidores", value: counts?.followers ?? 0, icon: Sparkles, tone: "text-lime-200" },
    { label: "Seguindo", value: counts?.following ?? 0, icon: UserRound, tone: "text-amber-200" },
    { label: "Itens", value: counts?.assets ?? 0, icon: Shirt, tone: "text-rose-200" },
  ];

  if (social.isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-[360px_1fr] gap-5">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[520px]" />
        </div>
      </div>
    );
  }

  if (social.error) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-3xl font-bold tracking-normal text-white">Social</h1>
          <p className="mt-2 text-sm text-slate-400">Conexao Roblox e avatar.</p>
        </div>
        <div className="glass-panel rounded-lg p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-100">
            <UserRound className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-bold tracking-normal text-white">Roblox nao conectado</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-400">{social.error.message}</p>
          <Button asChild className="mt-5">
            <Link to="/login">Entrar com Roblox</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="glass-panel rounded-lg p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Social Roblox</Badge>
              <Badge tone="lime">Ao vivo</Badge>
              {data?.syncedAt ? <Badge tone="slate">Sync {formatDateTime(data.syncedAt)}</Badge> : null}
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-normal text-white">Avatar e amigos</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Perfil conectado, itens equipados, outfits e rede social publica do Roblox.
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => void social.refetch()}>
              <RefreshCw className={cn("h-4 w-4", social.isFetching && "animate-spin")} />
              Atualizar
            </Button>
            <Button type="button" onClick={() => void openExternalUrl("https://www.roblox.com/my/avatar")}>
              <ExternalLink className="h-4 w-4" />
              Editor oficial
            </Button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-4 gap-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
            <div key={metric.label} className="rounded-lg border border-white/10 bg-white/5 p-4">
              <Icon className={cn("h-5 w-5", metric.tone)} />
              <div className="mt-4 text-3xl font-bold tracking-normal text-white">
                {compactNumber(metric.value)}
              </div>
              <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
            </div>
          );
          })}
        </div>
      </section>

      <section className="grid grid-cols-[360px_1fr] gap-5">
        <aside className="space-y-5">
          <div className="glass-panel overflow-hidden rounded-lg">
            <div className="relative aspect-square bg-slate-950">
              {data?.avatarImageUrl ? (
                <img src={data.avatarImageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-slate-600">
                  <UserRound className="h-10 w-10" />
                </div>
              )}
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
                <Badge tone="cyan">#{data?.userId}</Badge>
                <Badge tone="lime">{String(data?.avatar.playerAvatarType ?? "Avatar")}</Badge>
              </div>
            </div>
            <div className="p-4">
              <h2 className="text-lg font-bold tracking-normal text-white">Aparencia atual</h2>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {scales.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="text-xs text-slate-500">{scaleLabel(key)}</div>
                    <div className="mt-1 text-sm font-semibold text-white">{Number(value).toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {bodyColors.map(([key, value]) => (
                  <span
                    key={key}
                    title={key}
                    className="h-8 w-8 rounded-lg border border-white/10"
                    style={{ backgroundColor: colorValue(value) }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-lg p-4">
            <div className="mb-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-lime-200" />
              <h2 className="text-sm font-bold tracking-normal text-white">Modo seguro</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="lime">Sem senha</Badge>
              <Badge tone="cyan">Sem cookie</Badge>
              <Badge tone="slate">Leitura publica</Badge>
            </div>
          </div>
        </aside>

        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-white">Outfits</h2>
              <Badge tone="slate">{counts?.outfits ?? 0} skins</Badge>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {data?.outfits.length ? (
                data.outfits.map((outfit) => (
                  <article key={outfit.id} className="glass-panel overflow-hidden rounded-lg">
                    <div className="aspect-square bg-slate-950">
                      {outfit.imageUrl ? (
                        <img src={outfit.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          <Shirt className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="truncate text-sm font-semibold text-white">{outfit.name}</h3>
                      <div className="mt-1 text-xs text-slate-500">{outfit.outfitType ?? "Avatar"}</div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="glass-panel rounded-lg p-8 text-sm text-slate-500">Sem outfits publicos.</div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-white">Equipado agora</h2>
              {social.isFetching ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {data?.avatar.assets.map((asset) => (
                <article key={asset.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="text-sm font-semibold text-white">{asset.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {asset.typeName ? <Badge tone="slate">{asset.typeName}</Badge> : null}
                    {asset.availabilityStatus ? <Badge tone="lime">{asset.availabilityStatus}</Badge> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-normal text-white">Amigos</h2>
              <Badge tone="slate">{counts?.friends ?? 0} total</Badge>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {data?.friends.map((friend) => (
                <article key={friend.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white/10">
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-600">
                        <UserRound className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{friend.displayName}</span>
                      {friend.hasVerifiedBadge ? <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-200" /> : null}
                    </div>
                    <div className="truncate text-xs text-slate-500">@{friend.name}</div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
