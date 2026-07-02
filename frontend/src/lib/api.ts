import { API_URL } from "@/config";
import type {
  Collection,
  CollectionDetail,
  Favorite,
  Game,
  HistoryEntry,
  Profile,
  RobloxAutocompleteResponse,
  RobloxExploreResponse,
  RobloxSocialOverview,
  Stats,
} from "@/types";

type ApiEnvelope<T> = { data: T };

type ApiErrorPayload = {
  error?: {
    code: string;
    message: string;
  };
};

function isApiErrorPayload(payload: unknown): payload is ApiErrorPayload {
  return typeof payload === "object" && payload !== null && "error" in payload;
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const message =
      isApiErrorPayload(payload) && payload.error?.message
        ? payload.error.message
        : "API request failed";
    throw new Error(message);
  }

  return payload as T;
}

export const api = {
  async health() {
    return apiRequest<{ ok: boolean; service: string; timestamp: string }>("/health");
  },
  async getGames(query?: string) {
    const params = query ? `?q=${encodeURIComponent(query)}` : "";
    const response = await apiRequest<ApiEnvelope<Game[]>>(`/games${params}`);
    return response.data;
  },
  async createGame(input: {
    placeId: string;
    name?: string;
    description?: string;
    imageUrl?: string | null;
  }) {
    const response = await apiRequest<ApiEnvelope<Game>>("/games", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async updateGame(
    id: string,
    input: Partial<{ placeId: string; name: string; description: string; imageUrl: string | null }>,
  ) {
    const response = await apiRequest<ApiEnvelope<Game>>(`/games/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async getGame(id: string) {
    const response = await apiRequest<ApiEnvelope<Game>>(`/games/${id}`);
    return response.data;
  },
  async deleteGame(id: string) {
    await apiRequest<void>(`/games/${id}`, { method: "DELETE" });
  },
  async getFavorites() {
    const response = await apiRequest<ApiEnvelope<Favorite[]>>("/favorites");
    return response.data;
  },
  async favoriteGame(gameId: string) {
    const response = await apiRequest<ApiEnvelope<Favorite>>(`/favorites/${gameId}`, {
      method: "POST",
    });
    return response.data;
  },
  async unfavoriteGame(gameId: string) {
    await apiRequest<void>(`/favorites/${gameId}`, { method: "DELETE" });
  },
  async getCollections() {
    const response = await apiRequest<ApiEnvelope<Collection[]>>("/collections");
    return response.data;
  },
  async createCollection(input: {
    name: string;
    type: Collection["type"];
    description?: string | null;
    color: string;
  }) {
    const response = await apiRequest<ApiEnvelope<Collection>>("/collections", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async getCollection(id: string) {
    const response = await apiRequest<ApiEnvelope<CollectionDetail>>(`/collections/${id}`);
    return response.data;
  },
  async addGameToCollection(collectionId: string, gameId: string) {
    await apiRequest(`/collections/${collectionId}/games/${gameId}`, { method: "POST" });
  },
  async removeGameFromCollection(collectionId: string, gameId: string) {
    await apiRequest(`/collections/${collectionId}/games/${gameId}`, { method: "DELETE" });
  },
  async getHistory(limit = 30) {
    const response = await apiRequest<ApiEnvelope<HistoryEntry[]>>(`/history?limit=${limit}`);
    return response.data;
  },
  async recordLaunch(gameId: string) {
    const response = await apiRequest<ApiEnvelope<HistoryEntry>>(`/history/${gameId}`, {
      method: "POST",
    });
    return response.data;
  },
  async getStats() {
    const response = await apiRequest<ApiEnvelope<Stats>>("/stats");
    return response.data;
  },
  async searchRobloxExperiences(input: { query: string; cursor?: string | null; limit?: number }) {
    const params = new URLSearchParams({
      q: input.query,
      limit: String(input.limit ?? 40),
    });

    if (input.cursor) {
      params.set("cursor", input.cursor);
    }

    const response = await apiRequest<ApiEnvelope<RobloxExploreResponse>>(
      `/roblox/search?${params.toString()}`,
    );
    return response.data;
  },
  async getRobloxDiscover(sortId = "top-playing-now") {
    const params = new URLSearchParams({ sortId, limit: "50" });
    const response = await apiRequest<ApiEnvelope<RobloxExploreResponse>>(
      `/roblox/discover?${params.toString()}`,
    );
    return response.data;
  },
  async getRobloxAutocomplete(query: string) {
    const response = await apiRequest<ApiEnvelope<RobloxAutocompleteResponse>>(
      `/roblox/autocomplete?q=${encodeURIComponent(query)}`,
    );
    return response.data;
  },
  async getRobloxSocial() {
    const response = await apiRequest<ApiEnvelope<RobloxSocialOverview>>("/roblox/social");
    return response.data;
  },
  async getProfile() {
    const response = await apiRequest<ApiEnvelope<Profile>>("/profile");
    return response.data;
  },
  async startRobloxAuth() {
    const response = await apiRequest<ApiEnvelope<{ authUrl: string; mode: string }>>("/auth/roblox/start");
    return response.data;
  },
  async completeRobloxAuth(input: { code: string; state?: string | null }) {
    const response = await apiRequest<ApiEnvelope<Profile>>("/auth/roblox/callback", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async updateProfile(
    input: Partial<Pick<Profile, "displayName" | "avatarUrl">> & {
      theme?: "DARK" | "SYSTEM";
      accentColor?: string;
    },
  ) {
    const response = await apiRequest<ApiEnvelope<Profile>>("/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    return response.data;
  },
};
