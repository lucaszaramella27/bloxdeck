import {
  ExternalLink,
  Loader2,
  Palette,
  RefreshCw,
  Shirt,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile, useRobloxSocial, useRobloxUserProfile } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { openExternalUrl } from "@/lib/external";
import { compactNumber, formatDateTime } from "@/lib/format";

function robloxProfileUrl(userId: string | null | undefined) {
  return userId ? `https://www.roblox.com/users/${userId}/profile` : "https://www.roblox.com/my/profile";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Não consegui carregar seu perfil Roblox agora.";
}

function avatarTypeLabel(value: string | number | null | undefined) {
  if (value === 1 || value === "1" || value === "R6") {
    return "R6";
  }

  return "R15";
}

function StatCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  label: string;
  tone: string;
  value: number;
}) {
  return (
    <article className="flex items-center gap-3 rounded-md px-3 py-2.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--panel-bg-hover)]">
        <Icon className={cn("h-4 w-4", tone)} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-white">{compactNumber(value)}</div>
        <div className="truncate text-[11px] text-slate-500">{label}</div>
      </div>
    </article>
  );
}

export function ProfilePage() {
  const { userId } = useParams<{ userId?: string }>();
  const isPublicProfile = Boolean(userId);
  const profile = useProfile();
  const ownSocial = useRobloxSocial(!isPublicProfile);
  const publicProfile = useRobloxUserProfile(userId);
  const profileData = profile.data;
  const publicUser = publicProfile.data?.user;
  const socialData = isPublicProfile ? publicProfile.data?.social : ownSocial.data;
  const counts = socialData?.counts;
  const displayName = isPublicProfile
    ? (publicUser?.displayName ?? publicUser?.name ?? "Jogador Roblox")
    : (profileData?.displayName ?? "Jogador Roblox");
  const username = isPublicProfile
    ? (publicUser?.name ?? "player")
    : (profileData?.robloxUsername ?? profileData?.handle ?? "player");
  const avatarUrl = socialData?.avatarImageUrl ?? publicUser?.avatarUrl ?? profileData?.avatarUrl;
  const robloxUserId = isPublicProfile ? (publicUser?.id ?? userId) : (profileData?.robloxUserId ?? socialData?.userId);
  const description = isPublicProfile ? publicUser?.description : null;
  const avatarType = avatarTypeLabel(socialData?.avatar.playerAvatarType);
  const isLoading = isPublicProfile ? publicProfile.isLoading : profile.isLoading || ownSocial.isLoading;
  const isFetching = isPublicProfile ? publicProfile.isFetching : ownSocial.isFetching;
  const activeError = isPublicProfile ? publicProfile.error : (profile.error ?? ownSocial.error);

  function refetchActiveProfile() {
    if (isPublicProfile) {
      void publicProfile.refetch();
      return;
    }

    void ownSocial.refetch();
  }

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (activeError) {
    return (
      <div className="space-y-5">
        <section className="glass-panel rounded-lg p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-cyan-300/20 bg-cyan-300/12 text-cyan-100">
            <UserRound className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold tracking-normal text-white">Perfil Roblox</h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-400">
            {errorMessage(activeError)}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            {isPublicProfile ? (
              <Button asChild>
                <Link to="/profile">Meu perfil</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/login">Entrar com Roblox</Link>
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={refetchActiveProfile}>
              <RefreshCw className="h-4 w-4" />
              Tentar de novo
            </Button>
          </div>
        </section>
      </div>
    );
  }

  const stats = [
    { label: "Amigos", value: counts?.friends ?? 0, icon: UsersRound, tone: "text-cyan-200" },
    { label: "Seguidores", value: counts?.followers ?? 0, icon: Sparkles, tone: "text-lime-200" },
    { label: "Seguindo", value: counts?.following ?? 0, icon: UserRound, tone: "text-amber-200" },
    { label: "Itens avatar", value: counts?.assets ?? 0, icon: Shirt, tone: "text-rose-200" },
  ];

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-lg bg-[var(--panel-bg)]">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className="pointer-events-none absolute -right-4 top-0 hidden h-full w-[42%] object-contain opacity-[0.07] xl:block"
            draggable={false}
          />
        ) : null}
        <div className="relative flex min-h-56 flex-col justify-between gap-6 p-5 sm:p-6 lg:flex-row lg:items-end">
          <div className="flex min-w-0 flex-col items-start gap-5 sm:flex-row sm:items-end">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-muted)]">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <UserRound className="h-12 w-12 text-slate-500" />
                )}
              </div>
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="cyan">{isPublicProfile ? "Perfil público" : "Roblox"}</Badge>
                  {publicUser?.hasVerifiedBadge ? <Badge tone="lime">Verificado</Badge> : null}
                  {publicUser?.isBanned ? <Badge tone="rose">Banido</Badge> : null}
                  {socialData?.syncedAt ? <Badge tone="slate">Atualizado {formatDateTime(socialData.syncedAt)}</Badge> : null}
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <h1 className="truncate text-3xl font-bold tracking-normal text-white">{displayName}</h1>
                  {publicUser?.hasVerifiedBadge ? <ShieldCheck className="h-5 w-5 shrink-0 text-cyan-200" /> : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  <span>@{username}</span>
                  {robloxUserId ? <span className="text-slate-600">ID {robloxUserId}</span> : null}
                  {publicUser?.createdAt ? <span className="text-slate-600">Criado {formatDateTime(publicUser.createdAt)}</span> : null}
                </div>
                {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">{description}</p> : null}
              </div>
          </div>

            <div className="flex shrink-0 flex-wrap gap-2 lg:ml-auto">
              <Button type="button" variant="secondary" onClick={refetchActiveProfile}>
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Atualizar
              </Button>
              {isPublicProfile ? (
                <Button asChild variant="secondary">
                  <Link to="/profile">
                    <UserRound className="h-4 w-4" />
                    Meu perfil
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link to="/social">
                    <Palette className="h-4 w-4" />
                    Editar avatar
                  </Link>
                </Button>
              )}
              <Button type="button" onClick={() => void openExternalUrl(robloxProfileUrl(robloxUserId))}>
                <ExternalLink className="h-4 w-4" />
                Abrir Roblox
              </Button>
            </div>
          </div>
      </section>

      <section className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--panel-bg)] p-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-normal text-white">Amigos</h2>
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-slate-500" /> : null}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
              {socialData?.friends.length ? (
                socialData.friends.map((friend) => (
                  <Link
                    key={friend.id}
                    to={`/profile/${friend.id}`}
                    className="flex min-w-0 items-center gap-3 rounded-lg bg-[var(--panel-bg)] p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-deck-400/60"
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--panel-bg-hover)]">
                      {friend.avatarUrl ? (
                        <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          <UserRound className="h-4 w-4" />
                        </div>
                      )}
                      <span
                        className={`absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--panel-bg)] ${
                          friend.presence.isInGame
                            ? "bg-emerald-400"
                            : friend.presence.isOnline
                              ? "bg-cyan-300"
                              : "bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-white">{friend.displayName}</span>
                        {friend.hasVerifiedBadge ? (
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                        ) : null}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {friend.presence.isInGame
                          ? (friend.presence.lastLocation ?? "Em jogo")
                          : friend.presence.isOnline
                            ? "Online"
                            : `@${friend.name}`}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-lg bg-[var(--panel-bg)] p-6 text-sm text-slate-500">
                  Nenhum amigo disponível agora.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold tracking-normal text-white">Visuais</h2>
              <Badge tone="slate">{counts?.outfits ?? 0} salvos</Badge>
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
              {socialData?.outfits.length ? (
                socialData.outfits.map((outfit) => (
                  <article key={outfit.id} className="overflow-hidden rounded-lg bg-[var(--panel-bg)]">
                    <div className="aspect-square bg-[var(--surface-muted)]">
                      {outfit.imageUrl ? (
                        <img src={outfit.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-600">
                          <Shirt className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="truncate text-sm font-semibold text-white">{outfit.name}</h3>
                      <div className="mt-1 truncate text-xs text-slate-500">{outfit.outfitType ?? "Avatar"}</div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-lg bg-[var(--panel-bg)] p-6 text-sm text-slate-500">
                  Nenhum visual público disponível.
                </div>
              )}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-lg bg-[var(--panel-bg)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-normal text-white">Avatar atual</h2>
              <Badge tone="lime">{avatarType}</Badge>
            </div>
            <div className="overflow-hidden rounded-lg bg-[var(--surface-muted)]">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="aspect-square w-full object-cover" draggable={false} />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center text-slate-600">
                  <UserRound className="h-10 w-10" />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg bg-[var(--panel-bg)] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold tracking-normal text-white">Equipado</h2>
              <Badge tone="slate">{socialData?.avatar.assets.length ?? 0}</Badge>
            </div>
            <div className="space-y-2">
              {socialData?.avatar.assets.length ? (
                socialData.avatar.assets.slice(0, 10).map((asset) => (
                  <div key={asset.id} className="rounded-md bg-[var(--panel-bg-strong)] p-3">
                    <div className="truncate text-sm font-semibold text-white">{asset.name}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {asset.typeName ? <Badge tone="slate">{asset.typeName}</Badge> : null}
                      {asset.availabilityStatus ? <Badge tone="cyan">{asset.availabilityStatus}</Badge> : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-md bg-[var(--panel-bg-strong)] p-4 text-sm text-slate-500">
                  Nenhum item equipado disponível.
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
