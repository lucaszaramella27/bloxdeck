import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { showToast } from "@/store/useToastStore";
import type { Collection } from "@/types";

const ROBLOX_DISCOVER_ROTATION_MS = 5 * 60 * 60 * 1000;

function currentDiscoverRotation() {
  return Math.floor(Date.now() / ROBLOX_DISCOVER_ROTATION_MS);
}

function useDiscoverRotation() {
  const [rotationId, setRotationId] = useState(currentDiscoverRotation);

  useEffect(() => {
    let timer: number | undefined;

    const syncRotation = () => {
      const currentRotation = currentDiscoverRotation();
      setRotationId(currentRotation);
      const nextRotationAt = (currentRotation + 1) * ROBLOX_DISCOVER_ROTATION_MS;
      timer = window.setTimeout(syncRotation, Math.max(1_000, nextRotationAt - Date.now() + 250));
    };

    const handleFocus = () => setRotationId(currentDiscoverRotation());

    syncRotation();
    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  return rotationId;
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: () => api.health(),
  });
}

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => api.getStats(),
    staleTime: 120_000,
    gcTime: 300_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreatorOverview() {
  return useQuery({
    queryKey: ["creator-overview"],
    queryFn: () => api.getCreatorOverview(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}

export function useCreatorAnalytics(universeId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["creator-analytics", universeId],
    queryFn: () => api.getCreatorAnalytics(universeId as string),
    enabled: Boolean(universeId) && enabled,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
  });
}

export function useAlerts(gameId?: string) {
  return useQuery({
    queryKey: ["alerts", gameId ?? "all"],
    queryFn: () => api.getAlerts(gameId),
    staleTime: 30_000,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof api.createAlert>[0]) => api.createAlert(input),
    onSuccess: async () => {
      showToast("Alerta criado", { tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
  });
}

export function useUpdateAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ alertId, enabled }: { alertId: string; enabled: boolean }) =>
      api.updateAlert(alertId, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useDeleteAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => api.deleteAlert(alertId),
    onSuccess: async () => {
      showToast("Alerta removido", { tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alerts"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
  });
}

export function useNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.getNotifications(),
    enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? 30_000 : false,
    refetchOnWindowFocus: true,
  });
}

export function useReadNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => api.readNotification(notificationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useReadAllNotifications() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.readAllNotifications(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useGames(query?: string) {
  return useQuery({
    queryKey: ["games", query ?? ""],
    queryFn: () => api.getGames(query),
    refetchInterval: 60_000,
  });
}

export function useGame(id: string) {
  return useQuery({
    queryKey: ["games", id],
    queryFn: () => api.getGame(id),
    enabled: Boolean(id),
    refetchInterval: 60_000,
  });
}

export function useRobloxSearch(query: string) {
  const normalizedQuery = query.trim();

  return useInfiniteQuery({
    queryKey: ["roblox-search", normalizedQuery],
    queryFn: ({ pageParam }) =>
      api.searchRobloxExperiences({
        query: normalizedQuery,
        cursor: pageParam,
      }),
    enabled: normalizedQuery.length > 1,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

export function useRobloxDiscover(sortId: string) {
  const rotationId = useDiscoverRotation();

  return useQuery({
    queryKey: ["roblox-discover", sortId, rotationId],
    queryFn: () => api.getRobloxDiscover(sortId),
    staleTime: ROBLOX_DISCOVER_ROTATION_MS,
    gcTime: ROBLOX_DISCOVER_ROTATION_MS * 2,
    refetchOnWindowFocus: false,
  });
}

export function useRobloxAutocomplete(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ["roblox-autocomplete", normalizedQuery],
    queryFn: () => api.getRobloxAutocomplete(normalizedQuery),
    enabled: normalizedQuery.length > 1,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

export function useRobloxSocial(enabled = true) {
  return useQuery({
    queryKey: ["roblox-social"],
    queryFn: () => api.getRobloxSocial(),
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useRobloxUserSearch(query: string) {
  const normalizedQuery = query.trim().replace(/^@/, "");

  return useInfiniteQuery({
    queryKey: ["roblox-user-search", normalizedQuery],
    queryFn: ({ pageParam }) =>
      api.searchRobloxUsers({ query: normalizedQuery, cursor: pageParam }),
    enabled: normalizedQuery.length >= 3,
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor ?? undefined,
    staleTime: 300_000,
    gcTime: 600_000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useRobloxUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["roblox-user-profile", userId],
    queryFn: () => api.getRobloxUserProfile(userId as string),
    enabled: Boolean(userId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useRobloxInventory(category = "all") {
  return useInfiniteQuery({
    queryKey: ["roblox-inventory", category],
    queryFn: ({ pageParam }) =>
      api.getRobloxInventory({
        category,
        cursor: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextPageToken ?? undefined,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof api.createGame>[0]) => api.createGame(input),
    onSuccess: async () => {
      showToast("Jogo salvo no Deck", { tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteGame(id),
    onSuccess: async () => {
      showToast("Jogo removido do Deck", { tone: "success" });
      await queryClient.invalidateQueries();
    },
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.getFavorites(),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gameId, isFavorite }: { gameId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        await api.unfavoriteGame(gameId);
        return { gameId, isFavorite: false };
      }

      await api.favoriteGame(gameId);
      return { gameId, isFavorite: true };
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["favorites"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
      ]);
    },
  });
}

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: () => api.getCollections(),
  });
}

export function useCollection(id: string) {
  return useQuery({
    queryKey: ["collections", id],
    queryFn: () => api.getCollection(id),
    enabled: Boolean(id),
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof api.createCollection>[0]) => api.createCollection(input),
    onSuccess: async () => {
      showToast("Coleção criada", { tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
  });
}

export function useAddGameToCollection(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => api.addGameToCollection(collectionId, gameId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["collections", collectionId] }),
      ]);
    },
  });
}

export function useAddGameToAnyCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ collectionId, gameId }: { collectionId: string; gameId: string }) =>
      api.addGameToCollection(collectionId, gameId),
    onSuccess: async () => {
      showToast("Jogo adicionado à coleção", { tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["games"] }),
      ]);
    },
  });
}

export function useRemoveGameFromCollection(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => api.removeGameFromCollection(collectionId, gameId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["collections", collectionId] }),
      ]);
    },
  });
}

export function useHistory(limit = 30) {
  return useQuery({
    queryKey: ["history", limit],
    queryFn: () => api.getHistory(limit),
  });
}

export function useRecordLaunch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (gameId: string) => api.recordLaunch(gameId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["history"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
  });
}

export function useDeleteHistoryEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (historyId: string) => api.deleteHistoryEntry(historyId),
    onSuccess: async () => {
      showToast("Item removido do histórico", { tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["history"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.clearHistory(),
    onSuccess: async () => {
      showToast("Histórico limpo", { tone: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["history"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
      ]);
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: () => api.getProfile(),
  });
}

export function useStartRobloxAuth() {
  return useMutation({
    mutationFn: () => api.startRobloxAuth(),
  });
}

export function useCompleteRobloxAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { code: string; state?: string | null }) => api.completeRobloxAuth(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useDisconnectRobloxAuth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.disconnectRobloxAuth(),
    onSuccess: async (profile) => {
      queryClient.setQueryData(["profile"], profile);
      queryClient.removeQueries({ queryKey: ["roblox-social"] });
      queryClient.removeQueries({ queryKey: ["roblox-inventory"] });
      queryClient.removeQueries({ queryKey: ["roblox-user-profile"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof api.updateProfile>[0]) => api.updateProfile(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export const collectionTypes: Array<{ value: Collection["type"]; label: string }> = [
  { value: "PLAY_LATER", label: "Jogar depois" },
  { value: "WITH_FRIENDS", label: "Com amigos" },
  { value: "GRIND", label: "Grind" },
  { value: "COMPETITIVE", label: "Competitivo" },
  { value: "CUSTOM", label: "Personalizada" },
];
