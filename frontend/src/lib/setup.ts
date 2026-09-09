const SETUP_COMPLETE_KEY = "bloxdeck.setup.complete";
const FORCE_SETUP_DISMISSED_KEY = "bloxdeck.setup.force.dismissed";

export function isSetupComplete() {
  return localStorage.getItem(SETUP_COMPLETE_KEY) === "true";
}

export function completeSetup() {
  localStorage.setItem(SETUP_COMPLETE_KEY, "true");
}

export function resetSetup() {
  localStorage.removeItem(SETUP_COMPLETE_KEY);
  sessionStorage.removeItem(FORCE_SETUP_DISMISSED_KEY);
}

export function isForcedSetupDismissed() {
  return sessionStorage.getItem(FORCE_SETUP_DISMISSED_KEY) === "true";
}

export function dismissForcedSetup() {
  sessionStorage.setItem(FORCE_SETUP_DISMISSED_KEY, "true");
}
