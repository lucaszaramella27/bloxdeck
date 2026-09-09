import { buildRobloxGameDeepLink } from "@/lib/roblox";
import { shouldMinimizeOnLaunch } from "@/lib/preferences";
import { runWindowAction } from "@/lib/window-mode";

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export async function openRobloxGame(placeId: string) {
  const deepLink = buildRobloxGameDeepLink(placeId);

  if (window.__TAURI_INTERNALS__) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(deepLink);
    if (shouldMinimizeOnLaunch()) {
      await runWindowAction("minimize");
    }
    return;
  }

  window.location.href = deepLink;
}
