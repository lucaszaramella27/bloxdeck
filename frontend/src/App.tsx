import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useNavigate } from "react-router";
import { lazy, Suspense, useEffect, useState, type ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { DesktopFrame } from "@/components/layout/DesktopFrame";
import { useProfile } from "@/hooks/api-hooks";
import { isForcedSetupDismissed, isSetupComplete } from "@/lib/setup";
import { getStartupContext } from "@/lib/startup";
import { getStartupMode } from "@/lib/preferences";
import { isTauriRuntime, setCompactWindow } from "@/lib/window-mode";

let startupModeApplied = false;

const CollectionDetailPage = lazy(() =>
  import("@/pages/CollectionDetailPage").then((module) => ({ default: module.CollectionDetailPage })),
);
const CompactPage = lazy(() =>
  import("@/pages/CompactPage").then((module) => ({ default: module.CompactPage })),
);
const CollectionsPage = lazy(() =>
  import("@/pages/CollectionsPage").then((module) => ({ default: module.CollectionsPage })),
);
const CreatorPage = lazy(() =>
  import("@/pages/CreatorPage").then((module) => ({ default: module.CreatorPage })),
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })),
);
const FavoritesPage = lazy(() =>
  import("@/pages/FavoritesPage").then((module) => ({ default: module.FavoritesPage })),
);
const GameDetailPage = lazy(() =>
  import("@/pages/GameDetailPage").then((module) => ({ default: module.GameDetailPage })),
);
const GamesPage = lazy(() => import("@/pages/GamesPage").then((module) => ({ default: module.GamesPage })));
const HistoryPage = lazy(() =>
  import("@/pages/HistoryPage").then((module) => ({ default: module.HistoryPage })),
);
const LoginPage = lazy(() => import("@/pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const NotFoundPage = lazy(() =>
  import("@/pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })),
);
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);
const SetupPage = lazy(() => import("@/pages/SetupPage").then((module) => ({ default: module.SetupPage })));
const SocialPage = lazy(() => import("@/pages/SocialPage").then((module) => ({ default: module.SocialPage })));
const SmartDeckPage = lazy(() =>
  import("@/pages/SmartDeckPage").then((module) => ({ default: module.SmartDeckPage })),
);

function page(element: ReactNode) {
  return <Suspense fallback={<div className="p-6 text-sm text-slate-500">Carregando...</div>}>{element}</Suspense>;
}

function SetupGate() {
  const location = useLocation();
  const [forceSetup, setForceSetup] = useState(false);
  const [isCheckingStartup, setIsCheckingStartup] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void getStartupContext()
      .then((context) => {
        if (isMounted) {
          setForceSetup(context.forceSetup);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingStartup(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (isCheckingStartup) {
    return <div className="p-6 text-sm text-slate-500">Carregando...</div>;
  }

  if (!isSetupComplete() || (forceSetup && !isForcedSetupDismissed())) {
    return <Navigate to="/setup" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function AuthGate() {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useProfile();
  const [startupReady, setStartupReady] = useState(startupModeApplied);

  useEffect(() => {
    if (profile.isLoading || !profile.data?.robloxUserId || startupReady) return;

    if (startupModeApplied) {
      setStartupReady(true);
      return;
    }

    startupModeApplied = true;

    const applyStartupMode = async () => {
      if (isTauriRuntime() && getStartupMode() === "compact" && location.pathname !== "/compact") {
        await setCompactWindow(true);
        void navigate("/compact", { replace: true });
      }

      setStartupReady(true);
    };

    void applyStartupMode().catch(() => setStartupReady(true));
  }, [location.pathname, navigate, profile.data?.robloxUserId, profile.isLoading, startupReady]);

  if (profile.isLoading) {
    return <div className="p-6 text-sm text-slate-500">Carregando...</div>;
  }

  if (!profile.data?.robloxUserId) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!startupReady) {
    return <div className="p-6 text-sm text-slate-500">Carregando...</div>;
  }

  return <Outlet />;
}

const router = createBrowserRouter([
  {
    element: <DesktopFrame />,
    children: [
      { path: "/setup", element: page(<SetupPage />) },
      { path: "/auth/roblox/callback", element: page(<LoginPage />) },
      {
        path: "/",
        element: <SetupGate />,
        children: [
      { path: "login", element: page(<LoginPage />) },
      {
        element: <AuthGate />,
        children: [
          { path: "compact", element: page(<CompactPage />) },
          {
            element: <AppShell />,
            children: [
              { index: true, element: page(<DashboardPage />) },
              { path: "profile", element: page(<ProfilePage />) },
              { path: "profile/:userId", element: page(<ProfilePage />) },
              { path: "roblox", element: <Navigate to="/games" replace /> },
              { path: "social", element: page(<SocialPage />) },
              { path: "games", element: page(<GamesPage />) },
              { path: "games/:id", element: page(<GameDetailPage />) },
              { path: "favorites", element: page(<FavoritesPage />) },
              { path: "collections", element: page(<CollectionsPage />) },
              { path: "collections/:id", element: page(<CollectionDetailPage />) },
              { path: "creator", element: page(<CreatorPage />) },
              { path: "smart-decks/:deckId", element: page(<SmartDeckPage />) },
              { path: "history", element: page(<HistoryPage />) },
              { path: "settings", element: page(<SettingsPage />) },
              { path: "dashboard", element: <Navigate to="/" replace /> },
              { path: "*", element: page(<NotFoundPage />) },
            ],
          },
        ],
      },
        ],
      },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
