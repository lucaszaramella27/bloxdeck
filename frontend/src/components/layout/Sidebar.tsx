import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gamepad2,
  Heart,
  History,
  Layers3,
  LayoutDashboard,
  Loader2,
  LogIn,
  LogOut,
  Minimize2,
  Settings,
  UsersRound,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router";

import { Tooltip } from "@/components/ui/tooltip";
import { useDisconnectRobloxAuth, useProfile } from "@/hooks/api-hooks";
import { cn } from "@/lib/cn";
import { setCompactWindow } from "@/lib/window-mode";
import { useUiStore } from "@/store/useUiStore";

const navGroups = [
  {
    label: "Jogar",
    items: [
      { to: "/", label: "Início", icon: LayoutDashboard, end: true },
      { to: "/games", label: "Jogos", icon: Gamepad2 },
      { to: "/favorites", label: "Favoritos", icon: Heart },
    ],
  },
  {
    label: "Comunidade",
    items: [{ to: "/social", label: "Social", icon: UsersRound }],
  },
  {
    label: "Biblioteca",
    items: [
      { to: "/collections", label: "Coleções", icon: Layers3 },
      { to: "/history", label: "Histórico", icon: History },
    ],
  },
  {
    label: "Criar",
    items: [{ to: "/creator", label: "Modo Criador", icon: BarChart3 }],
  },
];

export function Sidebar() {
  const navigate = useNavigate();
  const profile = useProfile();
  const disconnectRoblox = useDisconnectRobloxAuth();
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const connected = Boolean(profile.data?.robloxUserId);
  const premium = profile.data?.subscription.isPremium ?? false;

  const disconnect = async () => {
    setDisconnectError(null);

    if (!connected) {
      void navigate("/login");
      return;
    }

    try {
      await disconnectRoblox.mutateAsync();
      void navigate("/login", { replace: true });
    } catch (error) {
      setDisconnectError(error instanceof Error ? error.message : "Não foi possível desconectar");
    }
  };

  return (
    <aside
      className={cn(
        "deck-sidebar flex shrink-0 flex-col bg-[var(--sidebar-bg)] py-4 transition-[width] duration-150 ease-out",
        collapsed && "is-collapsed",
        collapsed ? "w-[72px] px-0" : "w-[244px] px-3",
      )}
    >
      <div
        className={cn(
          "deck-sidebar-brand mb-6 flex h-11 items-center",
          collapsed ? "mx-auto w-12 justify-center" : "gap-3 px-1",
        )}
      >
        <span className="deck-sidebar-logo">
          <img src="/favicon-48.png" alt="" className="h-9 w-9 rounded-md object-cover" />
        </span>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <div className="deck-display text-sm font-semibold text-white">BloxDeck</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-600">
              Central Roblox
              {premium ? <Crown className="h-3 w-3 text-amber-200" /> : null}
            </div>
          </div>
        ) : null}
        {!collapsed ? (
          <Tooltip content="Recolher sidebar" side="right">
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors duration-100 hover:bg-white/[0.06] hover:text-slate-300"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : null}
      </div>

      {collapsed ? (
        <Tooltip content="Expandir sidebar" side="right">
          <button
            type="button"
            onClick={toggleSidebar}
            className="mx-auto mb-3 flex h-9 w-12 items-center justify-center rounded-lg text-slate-600 transition-colors duration-100 hover:bg-white/[0.06] hover:text-slate-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </Tooltip>
      ) : null}

      <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && "mt-5")}>
            {!collapsed ? (
              <div className="deck-nav-group-label mb-2 px-3">
                <span>{group.label}</span>
              </div>
            ) : null}
            <div className="space-y-1.5">
              {group.items.map((item) => (
                <SidebarLink key={item.to} collapsed={collapsed} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-3 space-y-1">
        <SidebarAction
          collapsed={collapsed}
          label="Modo compacto"
          icon={<Minimize2 className="h-4 w-4" />}
          onClick={() => void setCompactWindow(true).then(() => navigate("/compact"))}
        />
        <SidebarLink collapsed={collapsed} to="/settings" label="Ajustes" icon={Settings} />
      </div>

      <div
        className={cn(
          "deck-sidebar-profile mt-3",
          collapsed ? "mx-auto flex h-12 w-12 items-center justify-center" : "p-2",
        )}
      >
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-2.5")}>
          <button
            type="button"
            onClick={() => void navigate("/profile")}
            className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--surface-overlay)] text-slate-400"
          >
            {profile.data?.avatarUrl ? (
              <img src={profile.data.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <UsersRound className="h-4 w-4" />
            )}
          </button>
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-white">
                {profile.data?.displayName ?? "Conta Roblox"}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-slate-600">
                @{profile.data?.robloxUsername ?? profile.data?.handle ?? "roblox"}
              </div>
            </div>
          ) : null}
          {!collapsed ? (
            <Tooltip content={connected ? "Desconectar" : "Entrar"} side="top">
              <button
                type="button"
                onClick={() => void disconnect()}
                disabled={disconnectRoblox.isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors duration-100 hover:bg-rose-400/[0.10] hover:text-rose-200"
              >
                {disconnectRoblox.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : connected ? (
                  <LogOut className="h-4 w-4" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
              </button>
            </Tooltip>
          ) : null}
        </div>
      </div>
      {disconnectError && !collapsed ? (
        <div className="mt-2 px-2 text-[10px] leading-4 text-rose-200">{disconnectError}</div>
      ) : null}
    </aside>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  collapsed,
  end,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
  end?: boolean;
}) {
  const location = useLocation();
  const isActive = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const link = (
    <NavLink
      to={to}
      end={end}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "deck-nav-link relative flex h-11 items-center text-sm font-medium transition-colors duration-100",
        collapsed ? "mx-auto w-12 justify-center px-0" : "w-full gap-3 px-2.5",
        isActive ? "is-active text-white" : "text-slate-500 hover:text-slate-200",
      )}
    >
      <NavIcon icon={Icon} active={isActive} />
      {!collapsed ? <span className="truncate">{label}</span> : null}
    </NavLink>
  );

  return collapsed ? (
    <Tooltip content={label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function SidebarAction({
  collapsed,
  label,
  icon,
  onClick,
}: {
  collapsed: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "deck-nav-link flex h-11 items-center text-sm font-medium text-slate-500 transition-colors duration-100 hover:text-slate-200",
        collapsed ? "mx-auto w-12 justify-center" : "w-full gap-3 px-2.5",
      )}
    >
      <span className="deck-nav-icon">
        <span className="deck-nav-icon-face">{icon}</span>
      </span>
      {!collapsed ? label : null}
    </button>
  );

  return collapsed ? (
    <Tooltip content={label} side="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
}

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}) {
  return (
    <span className={cn("deck-nav-icon", active && "is-active")}>
      <span className="deck-nav-icon-face">
        <Icon className="h-4 w-4" />
      </span>
    </span>
  );
}
