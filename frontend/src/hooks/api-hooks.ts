import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { Collection } from "@/types";

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
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
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
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useRobloxDiscover(sortId: string) {
  return useQuery({
    queryKey: ["roblox-discover", sortId],
    queryFn: () => api.getRobloxDiscover(sortId),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useRobloxAutocomplete(query: string) {
  const normalizedQuery = query.trim();

  return useQuery({
    queryKey: ["roblox-autocomplete", normalizedQuery],
    queryFn: () => api.getRobloxAutocomplete(normalizedQuery),
    enabled: normalizedQuery.length > 1,
    staleTime: 30_000,
  });
}

export function useRobloxSocial() {
  return useQuery({
    queryKey: ["roblox-social"],
    queryFn: () => api.getRobloxSocial(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof api.createGame>[0]) => api.createGame(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["games"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
      ]);
    },
  });
}

export function useDeleteGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteGame(id),
    onSuccess: async () => {
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collections"] }),
        queryClient.invalidateQueries({ queryKey: ["stats"] }),
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
