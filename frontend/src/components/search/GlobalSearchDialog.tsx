import {
  ArrowRight,
  BarChart3,
  Gamepad2,
  Globe2,
  History,
  Layers3,
  LayoutDashboard,
  Minimize2,
  Search,
  Settings,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  useCollections,
  useGames,
  useRobloxSearch,
  useRobloxSocial,
} from "@/hooks/api-hooks";
import { compactNumber } from "@/lib/format";
import { useUiStore } from "@/store/useUiStore";

const destinations = [
  { label: "Painel", path: "/", icon: LayoutDashboard },
  { label: "Jogos", path: "/games", icon: Gamepad2 },
  { label: "Social", path: "/social", icon: UsersRound },
  { label: "Coleções", path: "/collections", icon: Layers3 },
  { label: "Histórico", path: "/history", icon: History },
  { label: "Modo Criador", path: "/creator", icon: BarChart3 },
  { label: "Modo compacto", path: "/compact", icon: Minimize2 },
  { label: "Configurações", path: "/settings", icon: Settings },
];

export function GlobalSearchDialog() {
  const navigate = useNavigate();
  const search = useUiStore((state) => state.search);
  const open = useUiStore((state) => state.searchOpen);
  const setSearch = useUiStore((state) => state.setSearch);
  const setOpen = useUiStore((state) => state.setSearchOpen);
  const normalized = search.trim().toLocaleLowerCase("pt-BR");
  const games = useGames(search.trim());
  const collections = useCollections();
  const social = useRobloxSocial(open);
  const roblox = useRobloxSearch(search);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setOpen(!useUiStore.getState().searchOpen);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const matchingCollections = useMemo(
    () =>
      (collections.data ?? [])
        .filter(
          (collection) =>
            !normalized || collection.name.toLocaleLowerCase("pt-BR").includes(normalized),
        )
        .slice(0, 3),
    [collections.data, normalized],
  );
  const matchingFriends = useMemo(
    () =>
      (social.data?.friends ?? [])
        .filter((friend) => {
          if (!normalized) return false;
          return `${friend.displayName} ${friend.name}`
            .toLocaleLowerCase("pt-BR")
            .includes(normalized);
        })
        .slice(0, 3),
    [normalized, social.data?.friends],
  );
  const matchingDestinations = destinations.filter(
    (destination) =>
      !normalized || destination.label.toLocaleLowerCase("pt-BR").includes(normalized),
  );
  const remoteGames =
    roblox.data?.pages
      .flatMap((page) => page.results)
      .filter(
        (remoteGame, index, all) =>
          all.findIndex((candidate) => candidate.placeId === remoteGame.placeId) === index &&
          !(games.data ?? []).some((savedGame) => savedGame.placeId === remoteGame.placeId),
      ) ?? [];

  const goTo = (path: string) => {
    setOpen(false);
    void navigate(path);
  };

  const openRobloxResult = (name: string) => {
    setSearch(name);
    goTo("/games");
  };

  const focusFirstResult = (fromEnd = false) => {
    const results = getSearchResults();
    results[fromEnd ? results.length - 1 : 0]?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[12vh] w-[min(720px,calc(100vw-48px))] translate-y-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <div className="relative bg-[var(--panel-bg)]">
          <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ice-200" />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                focusFirstResult(event.key === "ArrowUp");
              }
              if (event.key === "Enter") {
                event.preventDefault();
                getSearchResults()[0]?.click();
              }
            }}
            placeholder="Jogo, amigo, coleção ou página"
            className="h-16 w-full bg-transparent pl-14 pr-14 text-base text-white outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="max-h-[66vh] overflow-y-auto p-3">
          {matchingDestinations.length ? (
            <SearchGroup label="Navegação">
              {matchingDestinations.slice(0, normalized ? 6 : 4).map((destination) => {
                const Icon = destination.icon;
                return (
                  <SearchRow
                    key={destination.path}
                    icon={<Icon className="h-4 w-4" />}
                    title={destination.label}
                    subtitle="Abrir página"
                    onClick={() => goTo(destination.path)}
                  />
                );
              })}
            </SearchGroup>
          ) : null}

          {games.data?.length ? (
            <SearchGroup label="Seus jogos">
              {games.data.slice(0, 4).map((game) => (
                <SearchRow
                  key={game.id}
                  imageUrl={game.imageUrl}
                  icon={<Gamepad2 className="h-4 w-4" />}
                  title={game.name}
                  subtitle={
                    game.roblox?.playing != null
                      ? `${compactNumber(game.roblox.playing)} jogando agora`
                      : `Place ID ${game.placeId}`
                  }
                  onClick={() => goTo(`/games/${game.id}`)}
                />
              ))}
            </SearchGroup>
          ) : null}

          {matchingCollections.length ? (
            <SearchGroup label="Coleções">
              {matchingCollections.map((collection) => (
                <SearchRow
                  key={collection.id}
                  icon={<Layers3 className="h-4 w-4" />}
                  title={collection.name}
                  subtitle={`${collection.gameCount} jogos`}
                  onClick={() => goTo(`/collections/${collection.id}`)}
                />
              ))}
            </SearchGroup>
          ) : null}

          {matchingFriends.length ? (
            <SearchGroup label="Amigos">
              {matchingFriends.map((friend) => (
                <SearchRow
                  key={friend.id}
                  imageUrl={friend.avatarUrl}
                  icon={<UserRound className="h-4 w-4" />}
                  title={friend.displayName}
                  subtitle={
                    friend.presence.isInGame
                      ? friend.presence.lastLocation ?? "Em jogo"
                      : `@${friend.name}`
                  }
                  status={friend.presence.isOnline}
                  onClick={() => goTo(`/profile/${friend.id}`)}
                />
              ))}
            </SearchGroup>
          ) : null}

          {remoteGames.length ? (
            <SearchGroup label="Roblox">
              {remoteGames.slice(0, 4).map((game) => (
                <SearchRow
                  key={game.placeId}
                  imageUrl={game.imageUrl}
                  icon={<Globe2 className="h-4 w-4" />}
                  title={game.name}
                  subtitle={
                    game.playing != null
                      ? `${compactNumber(game.playing)} jogando agora`
                      : game.creatorName ?? "Experiência Roblox"
                  }
                  onClick={() => openRobloxResult(game.name)}
                />
              ))}
            </SearchGroup>
          ) : null}

          {search.trim().length > 1 ? (
            <button
              type="button"
              data-global-search-result
              onClick={() => goTo("/games")}
              onKeyDown={moveSearchFocus}
              className="mt-2 flex w-full items-center gap-3 rounded-lg bg-ice-100/[0.08] px-3 py-3 text-left text-sm text-ice-100 transition-colors duration-100 hover:bg-ice-100/[0.12]"
            >
              <Globe2 className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">
                Ver todos os resultados para “{search.trim()}”
              </span>
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SearchGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-3">
      <div className="px-3 py-2 text-[11px] font-bold uppercase text-slate-600">{label}</div>
      <div>{children}</div>
    </section>
  );
}

function SearchRow({
  icon,
  imageUrl,
  title,
  subtitle,
  status = false,
  onClick,
}: {
  icon: ReactNode;
  imageUrl?: string | null;
  title: string;
  subtitle: string;
  status?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-global-search-result
      onClick={onClick}
      onKeyDown={moveSearchFocus}
      className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-100 hover:bg-white/[0.055] focus-visible:bg-white/[0.055] focus-visible:outline-none"
    >
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.065] text-slate-300">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : icon}
        {status ? (
          <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-lime-300 ring-2 ring-[var(--surface-input)]" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-100">{title}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:text-ice-200" />
    </button>
  );
}

function getSearchResults() {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-global-search-result]"),
  );
}

function moveSearchFocus(event: React.KeyboardEvent<HTMLButtonElement>) {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;

  event.preventDefault();
  const results = getSearchResults();
  const currentIndex = results.indexOf(event.currentTarget);
  const offset = event.key === "ArrowDown" ? 1 : -1;
  const nextIndex = (currentIndex + offset + results.length) % results.length;
  results[nextIndex]?.focus();
}
