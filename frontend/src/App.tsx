import { createBrowserRouter, Navigate, RouterProvider } from "react-router";

import { AppShell } from "@/components/layout/AppShell";
import { CollectionDetailPage } from "@/pages/CollectionDetailPage";
import { CollectionsPage } from "@/pages/CollectionsPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { LoginPage } from "@/pages/LoginPage";
import { GameDetailPage } from "@/pages/GameDetailPage";
import { GamesPage } from "@/pages/GamesPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { RobloxPage } from "@/pages/RobloxPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SocialPage } from "@/pages/SocialPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "roblox", element: <RobloxPage /> },
      { path: "social", element: <SocialPage /> },
      { path: "games", element: <GamesPage /> },
      { path: "games/:id", element: <GameDetailPage /> },
      { path: "favorites", element: <FavoritesPage /> },
      { path: "collections", element: <CollectionsPage /> },
      { path: "collections/:id", element: <CollectionDetailPage /> },
      { path: "history", element: <HistoryPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "dashboard", element: <Navigate to="/" replace /> },
      { path: "login", element: <LoginPage /> },
      { path: "auth/roblox/callback", element: <LoginPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
