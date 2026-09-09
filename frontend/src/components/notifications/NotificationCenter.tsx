import { Bell, CheckCheck, RefreshCw, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useNotifications,
  useReadAllNotifications,
  useReadNotification,
} from "@/hooks/api-hooks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  areRadarNotificationsEnabled,
  PREFERENCES_CHANGED_EVENT,
} from "@/lib/preferences";
import type { BloxNotification } from "@/types";

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(areRadarNotificationsEnabled);
  const navigate = useNavigate();
  const notifications = useNotifications(enabled);
  const readNotification = useReadNotification();
  const readAll = useReadAllNotifications();
  const unread = notifications.data?.unread ?? 0;

  useEffect(() => {
    const syncPreference = () => setEnabled(areRadarNotificationsEnabled());
    window.addEventListener(PREFERENCES_CHANGED_EVENT, syncPreference);
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, syncPreference);
  }, []);

  if (!enabled) return null;

  const openNotification = (notification: BloxNotification) => {
    if (!notification.readAt) {
      readNotification.mutate(notification.id);
    }

    if (notification.game) {
      setOpen(false);
      void navigate(`/games/${notification.game.id}`);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        title="Notificações"
        aria-label="Notificações"
        className="relative shrink-0"
        onClick={() => setOpen(true)}
      >
        <Bell className="h-4 w-4" />
        {unread ? (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[9px] font-bold text-[#08130f] ring-2 ring-[var(--panel-bg)]">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(620px,calc(100vw-48px))] p-0">
          <DialogHeader className="mb-0 border-b border-white/[0.07] px-5 py-4">
            <div className="flex items-center justify-between gap-4 pr-8">
              <div>
                <DialogTitle>Notificações</DialogTitle>
                <DialogDescription>{unread ? `${unread} novas` : "Tudo em dia"}</DialogDescription>
              </div>
              {unread ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => readAll.mutate()}
                  disabled={readAll.isPending}
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar como lidas
                </Button>
              ) : null}
            </div>
          </DialogHeader>

          <div className="max-h-[62vh] overflow-y-auto p-3">
            {notifications.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20" />
                ))}
              </div>
            ) : notifications.data?.items.length ? (
              <div className="divide-y divide-white/[0.06]">
                {notifications.data.items.map((notification) => {
                  const Icon = notification.type === "GAME_UPDATE" ? RefreshCw : TrendingUp;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={cn(
                        "flex w-full items-center gap-3 px-2 py-3 text-left focus-visible:outline-none",
                        !notification.readAt && "bg-ice-200/[0.045]",
                      )}
                    >
                      <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.055] text-ice-200">
                        {notification.game?.imageUrl ? (
                          <img src={notification.game.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-white">
                            {notification.title}
                          </span>
                          {!notification.readAt ? (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                          ) : null}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">{notification.message}</div>
                        <div className="mt-1 text-[10px] text-slate-600">
                          {formatDateTime(notification.createdAt)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex min-h-48 flex-col items-center justify-center text-center">
                <Bell className="h-6 w-6 text-slate-600" />
                <div className="mt-3 text-sm font-medium text-slate-300">Nenhuma notificação</div>
                <div className="mt-1 text-xs text-slate-600">Seus alertas aparecerão aqui</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
