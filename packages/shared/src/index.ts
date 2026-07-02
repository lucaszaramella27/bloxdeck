export const collectionTypeValues = [
  "PLAY_LATER",
  "WITH_FRIENDS",
  "GRIND",
  "COMPETITIVE",
  "CUSTOM",
] as const;

export type CollectionType = (typeof collectionTypeValues)[number];

export const collectionTypeLabels: Record<CollectionType, string> = {
  PLAY_LATER: "Jogar depois",
  WITH_FRIENDS: "Com amigos",
  GRIND: "Grind",
  COMPETITIVE: "Competitivo",
  CUSTOM: "Personalizada",
};

export function buildRobloxGameUrl(placeId: string) {
  if (!/^\d+$/.test(placeId)) {
    throw new Error("Invalid Roblox placeId");
  }

  return `https://www.roblox.com/games/${placeId}`;
}

