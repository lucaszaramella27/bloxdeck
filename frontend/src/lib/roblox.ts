function validatePlaceId(placeId: string) {
  if (!/^\d+$/.test(placeId)) {
    throw new Error("Invalid Roblox placeId");
  }
}

export function buildRobloxGameUrl(placeId: string) {
  validatePlaceId(placeId);

  return `https://www.roblox.com/games/${placeId}`;
}

export function buildRobloxGameStartUrl(placeId: string) {
  validatePlaceId(placeId);

  return `https://www.roblox.com/games/start?placeId=${placeId}`;
}

export function buildRobloxGameDeepLink(placeId: string) {
  validatePlaceId(placeId);

  return `roblox://placeId=${placeId}`;
}
