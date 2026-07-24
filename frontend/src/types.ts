export type CollectionType = "PLAY_LATER" | "WITH_FRIENDS" | "GRIND" | "COMPETITIVE" | "CUSTOM";
export type SubscriptionPlan = "FREE" | "PREMIUM";
export type SubscriptionStatus = "INACTIVE" | "ACTIVE" | "TRIALING" | "PAST_DUE" | "CANCELED";

export type SubscriptionEntitlement = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  effectivePlan: SubscriptionPlan;
  isPremium: boolean;
  premiumUntil: string | null;
  limits: {
    games: number | null;
    collections: number | null;
    historyEntries: number | null;
    alerts: number | null;
  };
  usage: {
    games: number;
    collections: number;
    historyEntries: number;
    alerts: number;
  } | null;
};

export type GameAlertKind = "GAME_UPDATE" | "PLAYER_THRESHOLD";

export type GameAlert = {
  id: string;
  gameId: string;
  kind: GameAlertKind;
  threshold: number | null;
  enabled: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
  game: Game;
};

export type BloxNotification = {
  id: string;
  type: GameAlertKind;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  game: Omit<Game, "isFavorite" | "launchCount" | "lastLaunchedAt"> | null;
};

export type NotificationCenterData = {
  items: BloxNotification[];
  unread: number;
};

export type CreatorExperience = {
  universeId: string;
  placeId: string;
  name: string;
  description: string;
  imageUrl: string | null;
  playing: number | null;
  visits: number | null;
  favoritedCount: number | null;
  maxPlayers: number | null;
  genre: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  creator: {
    id: string;
    type: string;
  };
};

export type CreatorOverview = {
  creator: {
    userId: string;
    username: string | null;
    displayName: string;
  };
  totals: {
    experiences: number;
    playing: number;
    visits: number;
    favorites: number;
  };
  openCloud: {
    analyticsConfigured: boolean;
  };
  experiences: CreatorExperience[];
};

export type CreatorAnalyticsMetric = {
  available: boolean;
  points: Array<{ time: string; value: number }>;
  latest: number | null;
  total: number | null;
  error?: string;
};

export type CreatorAnalytics = {
  configured: boolean;
  available: boolean;
  reason: string | null;
  range?: {
    startAt: string;
    endAt: string;
    days: number;
  };
  metrics: Partial<
    Record<"dailyActiveUsers" | "dailyRevenue" | "d1Retention", CreatorAnalyticsMetric>
  >;
};

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
  rotationId?: number;
  rotatesAt?: string;
  rateLimited?: boolean;
  message?: string;
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
  rateLimited?: boolean;
  message?: string;
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
  presence: {
    type: "offline" | "online" | "in_game" | "studio";
    isOnline: boolean;
    isInGame: boolean;
    lastLocation: string | null;
    placeId: string | null;
    rootPlaceId: string | null;
    gameId: string | null;
    universeId: string | null;
    lastOnline: string | null;
  };
};

export type RobloxUserSearchResult = {
  id: string;
  name: string;
  displayName: string;
  hasVerifiedBadge: boolean;
  previousUsernames: string[];
  avatarUrl: string | null;
  presence: RobloxFriend["presence"];
};

export type RobloxUserSearchResponse = {
  query: string;
  results: RobloxUserSearchResult[];
  nextPageCursor: string | null;
  rateLimited: boolean;
  retryAfterSeconds: number | null;
  syncedAt: string;
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

export type RobloxPublicUser = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  createdAt: string | null;
  isBanned: boolean;
  hasVerifiedBadge: boolean;
  externalAppDisplayName: string | null;
  avatarUrl: string | null;
};

export type RobloxPublicProfile = {
  user: RobloxPublicUser;
  social: RobloxSocialOverview;
  syncedAt: string;
};

export type RobloxInventoryItem = {
  id: string;
  path: string | null;
  kind: "asset" | "badge" | "gamePass" | "privateServer" | "unknown";
  category:
    | "clothing"
    | "accessories"
    | "body"
    | "animations"
    | "emotes"
    | "gear"
    | "collectibles"
    | "badge"
    | "gamePass"
    | "privateServer"
    | "other"
    | "unknown";
  assetId: number | null;
  name: string;
  type: string | null;
  creatorName: string | null;
  isLimited: boolean;
  imageUrl: string | null;
  createdAt: string | null;
  isWearable: boolean;
};

export type RobloxInventoryResponse = {
  items: RobloxInventoryItem[];
  nextPageToken: string | null;
  category: string | null;
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
  subscription: SubscriptionEntitlement;
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
  radar: {
    updatedSinceLastPlay: Game[];
    gainingNow: Array<{
      game: Game;
      playingDelta: number;
      comparedAt: string | null;
    }>;
    capturedAt: string | null;
  };
  weekly: {
    launches: number;
    previousLaunches: number;
    launchDelta: number;
    uniqueGames: number;
    activeDays: number;
    topGame: Game | null;
    topGameLaunches: number;
  };
  smartDecks: Array<{
    id: "continue" | "playing-now" | "updated" | "rediscover";
    title: string;
    description: string;
    gameCount: number;
    premiumOnly: boolean;
    locked: boolean;
    games: Game[];
  }>;
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
  subscription: SubscriptionEntitlement;
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
