import {
  Clock3,
  Gamepad2,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRobloxSocial } from "@/hooks/api-hooks";
import { compactNumber, formatDateTime } from "@/lib/format";
import type { Game } from "@/types";

type SmartLaunchGame = Pick<
  Game,
  | "id"
  | "placeId"
  | "name"
  | "imageUrl"
  | "launchCount"
  | "lastLaunchedAt"
  | "roblox"
  | "collections"
>;

type LaunchConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  game: SmartLaunchGame;
  isLaunching?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function LaunchConfirmDialog({
  open,
  onOpenChange,
  game,
  isLaunching = false,
  onConfirm,
}: LaunchConfirmDialogProps) {
  const social = useRobloxSocial(open);
  const roblox = game.roblox;
  const friendsHere =
    social.data?.friends.filter(
      (friend) =>
        friend.presence.isInGame &&
        (friend.presence.placeId === game.placeId || friend.presence.rootPlaceId === game.placeId),
    ) ?? [];
  const updatedSinceLastPlay = Boolean(
    game.lastLaunchedAt &&
      roblox?.updatedAt &&
      new Date(roblox.updatedAt).getTime() > new Date(game.lastLaunchedAt).getTime(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(680px,calc(100vw-40px))] overflow-hidden p-0">
        <div className="relative h-44 bg-[var(--surface-topbar)]">
          {game.imageUrl ? (
            <img src={game.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ice-200">
              <Gamepad2 className="h-9 w-9" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-input)] via-black/30 to-black/10" />
          <div className="absolute bottom-4 left-5 right-14">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge tone="cyan">Smart Launch</Badge>
              {roblox?.playing != null ? (
                <Badge tone="lime">{compactNumber(roblox.playing)} online</Badge>
              ) : null}
              {updatedSinceLastPlay ? <Badge tone="cyan">Atualizado desde sua partida</Badge> : null}
            </div>
            <h2 className="line-clamp-2 text-2xl font-bold text-white">{game.name}</h2>
          </div>
        </div>

        <div className="p-5">
          <DialogHeader className="sr-only">
            <DialogTitle>Entrar em {game.name}</DialogTitle>
            <DialogDescription>Confirme antes de iniciar o Roblox</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3">
            <LaunchMetric
              icon={<UsersRound className="h-4 w-4 text-lime-200" />}
              label="Jogando agora"
              value={roblox?.playing != null ? compactNumber(roblox.playing) : "Indisponível"}
            />
            <LaunchMetric
              icon={<UsersRound className="h-4 w-4 text-cyan-200" />}
              label="Amigos presentes"
              value={String(friendsHere.length)}
            />
            <LaunchMetric
              icon={<Clock3 className="h-4 w-4 text-ice-200" />}
              label="Suas aberturas"
              value={String(game.launchCount)}
            />
          </div>

          {friendsHere.length ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg bg-lime-300/[0.07] px-3 py-3">
              <div className="flex -space-x-2">
                {friendsHere.slice(0, 4).map((friend) => (
                  <div
                    key={friend.id}
                    className="h-8 w-8 overflow-hidden rounded-full bg-[var(--surface-overlay)] ring-2 ring-[var(--panel-bg-strong)]"
                    title={friend.displayName}
                  >
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UsersRound className="m-2 h-4 w-4 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
              <div className="min-w-0 text-sm text-lime-100">
                <span className="font-semibold">{friendsHere[0].displayName}</span>
                {friendsHere.length > 1 ? ` e mais ${friendsHere.length - 1}` : ""} já está jogando
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <LaunchDetail label="Criador" value={roblox?.creatorName ?? "Indisponível"} />
            <LaunchDetail
              label="Máximo por servidor"
              value={roblox?.maxPlayers != null ? String(roblox.maxPlayers) : "Indisponível"}
            />
            <LaunchDetail label="Última partida" value={formatDateTime(game.lastLaunchedAt)} />
            <LaunchDetail label="Atualização Roblox" value={formatDateTime(roblox?.updatedAt)} />
          </div>

          {game.collections?.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Sparkles className="h-4 w-4 text-signal" />
              {game.collections.slice(0, 3).map((collection) => (
                <Badge key={collection.id} tone="slate">
                  {collection.name}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-ice-200" />
              Place ID {game.placeId}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLaunching}>
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="button" onClick={() => void onConfirm()} disabled={isLaunching}>
                {isLaunching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Entrar agora
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LaunchMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="surface-soft rounded-lg p-3">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function LaunchDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="truncate font-medium text-slate-200">{value}</span>
    </div>
  );
}
