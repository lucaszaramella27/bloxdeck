import { invoke } from "@tauri-apps/api/core";

type StartupContext = {
  forceSetup: boolean;
  installDir: string;
};

export async function getStartupContext(): Promise<StartupContext> {
  try {
    return await invoke<StartupContext>("startup_context");
  } catch {
    return { forceSetup: false, installDir: "" };
  }
}
