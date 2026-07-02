import {
  Gamepad2,
  Globe2,
  Heart,
  History,
  Layers3,
  LayoutDashboard,
  Settings,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { NavLink } from "react-router";

import { cn } from "@/lib/cn";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/roblox", label: "Roblox", icon: Globe2 },
  { to: "/social", label: "Social", icon: UsersRound },
  { to: "/games", label: "Jogos", icon: Gamepad2 },
  { to: "/favorites", label: "Favoritos", icon: Heart },
  { to: "/collections", label: "Colecoes", icon: Layers3 },
  { to: "/history", label: "Historico", icon: History },
  { to: "/settings", label: "Ajustes", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-black/35 px-4 py-5 backdrop-blur-xl">
      <div className="mb-7 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-300 text-slate-950 shadow-lg shadow-cyan-950/30">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <div className="text-lg font-bold leading-none tracking-normal text-white">BloxDeck</div>
          <div className="mt-1 text-xs font-medium text-slate-500">Companion launcher</div>
        </div>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                "group flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-400 transition",
                "hover:bg-white/10 hover:text-white",
                isActive &&
                  "border border-white/10 bg-white/10 text-white shadow-lg shadow-black/20",
              )
            }
          >
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-lg border border-white/10 bg-white/5 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-lime-200">
          <span className="h-2 w-2 rounded-full bg-lime-300" />
          Safe mode
        </div>
        <p className="text-xs leading-5 text-slate-400">
          URLs oficiais Roblox. Sem senha, cookie, token ou modificacao do cliente.
        </p>
      </div>
    </aside>
  );
}
