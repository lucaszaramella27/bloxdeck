import { invoke } from "@tauri-apps/api/core";

export type InstallOptions = {
  createDesktopShortcut: boolean;
  createStartMenuShortcut: boolean;
  launchAfterInstall: boolean;
};

export type InstallResult = {
  installDir: string;
  executablePath: string;
  desktopShortcutPath: string | null;
  startMenuShortcutPath: string | null;
};

export function installBloxDeck(options: InstallOptions) {
  return invoke<InstallResult>("install_bloxdeck", { options });
}
