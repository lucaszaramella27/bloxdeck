import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";

const labels: Record<string, string> = {
  games: "Jogos",
  collections: "Coleções",
  profile: "Perfil",
  "smart-decks": "Decks",
};

export function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts.length < 2) return null;

  const root = parts[0];
  const rootPath = root === "profile" ? "/social" : `/${root}`;

  return (
    <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
      <Link to={rootPath} className="truncate transition-colors duration-100 hover:text-slate-300">
        {labels[root] ?? "BloxDeck"}
      </Link>
      <ChevronRight className="h-3 w-3 shrink-0 text-slate-700" />
      <span className="truncate text-slate-400">
        {root === "smart-decks" ? "Inteligente" : root === "profile" ? "Jogador" : "Detalhes"}
      </span>
    </div>
  );
}
