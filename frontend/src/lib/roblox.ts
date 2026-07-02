export function buildRobloxGameUrl(placeId: string) {
  if (!/^\d+$/.test(placeId)) {
    throw new Error("Invalid Roblox placeId");
  }

  return `https://www.roblox.com/games/${placeId}`;
}

