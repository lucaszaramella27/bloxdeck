export type CollectionType = "PLAY_LATER" | "WITH_FRIENDS" | "GRIND" | "COMPETITIVE" | "CUSTOM";

export type RobloxGameSnapshot = {
  placeId: string;
  universeId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  creatorName: string | null;
  creatorType: string | null;
  creatorVerified: boolean;
  playing: number | null;
  visits: number | null;
  maxPlayers: number | null;
  favoritedCount: number | null;
  genre: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  canonicalUrlPath: string | null;
  syncedAt: string;
};

export type Game = {
  id: string;
  placeId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  isFavorite: boolean;
  launchCount: number;
  lastLaunchedAt: string | null;
  roblox?: RobloxGameSnapshot | null;
  createdAt: string;
  updatedAt: string;
  collections?: Array<{
    id: string;
    name: string;
    type: CollectionType;
    color: string;
  }>;
};

export type RobloxExperience = {
  universeId: string;
  placeId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  creatorName: string | null;
  creatorType: string | null;
  creatorVerified: boolean;
  playing: number | null;
  visits: number | null;
  maxPlayers: number | null;
  favoritedCount: number | null;
  totalUpVotes: number | null;
  totalDownVotes: number | null;
  likeRatio: number | null;
  genre: string | null;
  minimumAge: number | null;
  ageRecommendationDisplayName: string | null;
  contentMaturity: string | null;
  isSponsored: boolean;
  canonicalUrlPath: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  source: "search" | "discover";
  syncedAt: string;
};

export type RobloxExploreResponse = {
  query?: string;
  sortId?: string;
  sortDisplayName?: string;
  subtitle?: string | null;
  results: RobloxExperience[];
  nextPageToken: string | null;
  syncedAt: string;
  source: "search" | "discover";
};

export type RobloxSuggestion = {
  query: string;
  universeId: number | null;
  title: string | null;
  thumbnailUrl: string | null;
};

export type RobloxAutocompleteResponse = {
  query: string;
  suggestions: RobloxSuggestion[];
  syncedAt?: string;
};

export type RobloxAvatarAsset = {
  id: number;
  name: string;
  typeId: number | null;
  typeName: string | null;
  availabilityStatus: string | null;
};

export type RobloxOutfit = {
  id: number;
  name: string;
  isEditable: boolean;
  outfitType: string | null;
  imageUrl: string | null;
};

export type RobloxFriend = {
  id: string;
  name: string;
  displayName: string;
  hasVerifiedBadge: boolean;
  avatarUrl: string | null;
};

export type RobloxSocialOverview = {
  userId: string;
  avatarImageUrl: string | null;
  avatar: {
    scales: Record<string, number> | null;
    playerAvatarType: string | number | null;
    bodyColor3s: Record<string, string | number> | null;
    assets: RobloxAvatarAsset[];
    emotes: Array<Record<string, unknown>>;
    defaultShirtApplied: boolean;
    defaultPantsApplied: boolean;
  };
  outfits: RobloxOutfit[];
  friends: RobloxFriend[];
  counts: {
    friends: number;
    followers: number;
    following: number;
    outfits: number;
    assets: number;
  };
  syncedAt: string;
};

export type Favorite = {
  id: string;
  createdAt: string;
  game: Game;
};

export type Collection = {
  id: string;
  name: string;
  type: CollectionType;
  description: string | null;
  color: string;
  gameCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CollectionDetail = Collection & {
  games: Game[];
};

export type HistoryEntry = {
  id: string;
  createdAt: string;
  gameLaunchCount: number;
  game: Omit<Game, "isFavorite" | "launchCount" | "lastLaunchedAt">;
};

export type Stats = {
  totals: {
    games: number;
    favorites: number;
    collections: number;
    launches: number;
  };
  roblox: {
    onlinePlayers: number;
    totalVisits: number;
    totalFavorites: number;
    trackedGames: number;
    snapshots: number;
    unavailable: number;
    syncedAt: string | null;
    trendingGames: Game[];
  };
  recent: Array<{
    id: string;
    createdAt: string;
    game: Omit<Game, "isFavorite" | "launchCount" | "lastLaunchedAt">;
  }>;
  topGames: Array<{
    game: Omit<Game, "isFavorite" | "launchCount" | "lastLaunchedAt">;
    launches: number;
  }>;
};

export type Profile = {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  robloxUserId: string | null;
  robloxUsername: string | null;
  settings: {
    id: string;
    userId: string;
    theme: "DARK" | "SYSTEM";
    accentColor: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export const collectionTypeLabels: Record<CollectionType, string> = {
  PLAY_LATER: "Jogar depois",
  WITH_FRIENDS: "Com amigos",
  GRIND: "Grind",
  COMPETITIVE: "Competitivo",
  CUSTOM: "Personalizada",
};
