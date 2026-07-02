import { buildRobloxGameUrl } from "@/lib/roblox";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export async function openRobloxGame(placeId: string) {
  const url = buildRobloxGameUrl(placeId);

  if (window.__TAURI_INTERNALS__) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

