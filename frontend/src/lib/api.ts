import { API_URL } from "@/config";
import type {
  Collection,
  CollectionDetail,
  CreatorAnalytics,
  CreatorOverview,
  Favorite,
  Game,
  GameAlert,
  GameAlertKind,
  HistoryEntry,
  NotificationCenterData,
  Profile,
  RobloxAutocompleteResponse,
  RobloxExploreResponse,
  RobloxInventoryResponse,
  RobloxPublicProfile,
  RobloxSocialOverview,
  RobloxUserSearchResponse,
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

async function apiRequest<T>(path: string, options: RequestInit = {}, timeoutMs = 30_000) {
  const headers = new Headers(options.headers);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("A conexão demorou demais. Verifique o serviço do BloxDeck e tente novamente.");
    }

    if (error instanceof TypeError) {
      throw new Error("Não foi possível conectar ao serviço do BloxDeck.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }

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
  }) {
    const response = await apiRequest<ApiEnvelope<Game>>("/games", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async updateGame(
    id: string,
    input: Partial<{ placeId: string; name: string; description: string }>,
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
  async deleteHistoryEntry(historyId: string) {
    await apiRequest<void>(`/history/${historyId}`, { method: "DELETE" });
  },
  async clearHistory() {
    await apiRequest<void>("/history", { method: "DELETE" });
  },
  async getStats() {
    const response = await apiRequest<ApiEnvelope<Stats>>("/stats");
    return response.data;
  },
  async getCreatorOverview() {
    const response = await apiRequest<ApiEnvelope<CreatorOverview>>("/creator/overview");
    return response.data;
  },
  async getCreatorAnalytics(universeId: string, days = 30) {
    const response = await apiRequest<ApiEnvelope<CreatorAnalytics>>(
      `/creator/experiences/${encodeURIComponent(universeId)}/analytics?days=${days}`,
      {},
      60_000,
    );
    return response.data;
  },
  async getAlerts(gameId?: string) {
    const params = gameId ? `?gameId=${encodeURIComponent(gameId)}` : "";
    const response = await apiRequest<ApiEnvelope<GameAlert[]>>(`/alerts${params}`);
    return response.data;
  },
  async createAlert(input: { gameId: string; kind: GameAlertKind; threshold?: number }) {
    const response = await apiRequest<ApiEnvelope<GameAlert>>("/alerts", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return response.data;
  },
  async updateAlert(alertId: string, enabled: boolean) {
    const response = await apiRequest<ApiEnvelope<GameAlert>>(`/alerts/${alertId}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    });
    return response.data;
  },
  async deleteAlert(alertId: string) {
    await apiRequest<void>(`/alerts/${alertId}`, { method: "DELETE" });
  },
  async getNotifications() {
    const response = await apiRequest<ApiEnvelope<NotificationCenterData>>("/notifications");
    return response.data;
  },
  async readNotification(notificationId: string) {
    await apiRequest(`/notifications/${notificationId}/read`, { method: "PATCH" });
  },
  async readAllNotifications() {
    await apiRequest<void>("/notifications/read-all", { method: "PATCH" });
  },
  async searchRobloxExperiences(input: { query: string; cursor?: string | null; limit?: number }) {
    const params = new URLSearchParams({
      q: input.query,
      limit: String(input.limit ?? 30),
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
    const params = new URLSearchParams({ sortId, limit: "30" });
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
  async searchRobloxUsers(input: { query: string; cursor?: string | null }) {
    const params = new URLSearchParams({ q: input.query });

    if (input.cursor) {
      params.set("cursor", input.cursor);
    }

    const response = await apiRequest<ApiEnvelope<RobloxUserSearchResponse>>(
      `/roblox/users/search?${params.toString()}`,
    );
    return response.data;
  },
  async getRobloxUserProfile(userId: string) {
    const response = await apiRequest<ApiEnvelope<RobloxPublicProfile>>(
      `/roblox/users/${encodeURIComponent(userId)}/profile`,
    );
    return response.data;
  },
  async getRobloxInventory(input: { category?: string; cursor?: string | null; limit?: number } = {}) {
    const params = new URLSearchParams({ limit: String(input.limit ?? 24) });

    if (input.category) {
      params.set("category", input.category);
    }

    if (input.cursor) {
      params.set("cursor", input.cursor);
    }

    const response = await apiRequest<ApiEnvelope<RobloxInventoryResponse>>(
      `/roblox/inventory?${params.toString()}`,
    );
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
  async disconnectRobloxAuth() {
    const response = await apiRequest<ApiEnvelope<Profile>>("/auth/roblox/session", {
      method: "DELETE",
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
