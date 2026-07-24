import { isTauriRuntime } from "@/lib/window-mode";

const LAUNCH_CONFIRMATION_KEY = "bloxdeck.preferences.confirmLaunch";
const MINIMIZE_ON_LAUNCH_KEY = "bloxdeck.preferences.minimizeOnLaunch";
const STARTUP_MODE_KEY = "bloxdeck.preferences.startupMode";
const RADAR_NOTIFICATIONS_KEY = "bloxdeck.preferences.radarNotifications";
const REDUCED_MOTION_KEY = "bloxdeck.preferences.reducedMotion";

export const PREFERENCES_CHANGED_EVENT = "bloxdeck:preferences-changed";

export type StartupMode = "normal" | "compact";

function readBoolean(key: string, fallback: boolean) {
  const value = localStorage.getItem(key);
  return value == null ? fallback : value === "true";
}

function writePreference(key: string, value: string | boolean) {
  localStorage.setItem(key, String(value));
  window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT));
}

export function isLaunchConfirmationEnabled() {
  return readBoolean(LAUNCH_CONFIRMATION_KEY, true);
}

export function setLaunchConfirmationEnabled(enabled: boolean) {
  writePreference(LAUNCH_CONFIRMATION_KEY, enabled);
}

export function shouldMinimizeOnLaunch() {
  return readBoolean(MINIMIZE_ON_LAUNCH_KEY, true);
}

export function setMinimizeOnLaunch(enabled: boolean) {
  writePreference(MINIMIZE_ON_LAUNCH_KEY, enabled);
}

export function getStartupMode(): StartupMode {
  return localStorage.getItem(STARTUP_MODE_KEY) === "compact" ? "compact" : "normal";
}

export function setStartupMode(mode: StartupMode) {
  writePreference(STARTUP_MODE_KEY, mode);
}

export function areRadarNotificationsEnabled() {
  return readBoolean(RADAR_NOTIFICATIONS_KEY, true);
}

export function setRadarNotificationsEnabled(enabled: boolean) {
  writePreference(RADAR_NOTIFICATIONS_KEY, enabled);
}

export function isReducedMotionEnabled() {
  return readBoolean(REDUCED_MOTION_KEY, false);
}

export function setReducedMotionEnabled(enabled: boolean) {
  writePreference(REDUCED_MOTION_KEY, enabled);
  applyReducedMotionPreference();
}

export function applyReducedMotionPreference() {
  document.documentElement.classList.toggle("reduce-motion", isReducedMotionEnabled());
}

export async function getAutostartEnabled() {
  if (!isTauriRuntime()) return false;

  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean) {
  if (!isTauriRuntime()) return;

  const { disable, enable } = await import("@tauri-apps/plugin-autostart");

  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
