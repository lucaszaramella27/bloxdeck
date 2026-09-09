import { invoke } from "@tauri-apps/api/core";

const COMPACT_MODE_KEY = "bloxdeck.preferences.compactMode";

export function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}

export async function runWindowAction(action: "minimize" | "toggle_maximize" | "close" | "start_dragging") {
  if (isTauriRuntime()) {
    await invoke("window_action", { action });
  }
}

export function isCompactModeEnabled() {
  return localStorage.getItem(COMPACT_MODE_KEY) === "true";
}

export async function setCompactWindow(compact: boolean) {
  localStorage.setItem(COMPACT_MODE_KEY, String(compact));
  document.body.classList.toggle("compact-mode", compact);

  if (isTauriRuntime()) {
    await invoke("set_compact_mode", { compact });
  }
}
