// Typed wrappers over the Tauri commands in src/commands.rs. Only imported when running in the app.
import { Channel, invoke } from "@tauri-apps/api/core";
import { join } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import type { PhotoSource } from "./types";

export type BatchEvent = { kind: "done"; file: string; output: string } | { kind: "failed"; file: string; error: string };

export interface BatchSummary {
  done: number;
  failed: number;
  cancelled: boolean;
}

export interface UpdateInfo {
  version: string;
  releaseUrl: string;
}

export async function pickFolder(title: string): Promise<string | null> {
  const folder = await open({ directory: true, multiple: false, title });
  return typeof folder === "string" ? folder : null;
}

/** Photos directly inside `dir`, read on demand for previews. */
export async function folderPhotos(dir: string): Promise<PhotoSource[]> {
  const names = await invoke<string[]>("list_images", { dir });
  return Promise.all(
    names.map(async (name) => {
      const path = await join(dir, name);
      return { name, read: async () => new Uint8Array(await invoke<ArrayBuffer>("read_image", { path })) };
    }),
  );
}

/** Where results go unless the user picks another folder. */
export const defaultOutput = (input: string) => join(input, "DigiCamWM");

export function processFolder(
  request: { inputDir: string; outputDir: string; design: string; photographer: string },
  onEvent: (event: BatchEvent) => void,
): Promise<BatchSummary> {
  const channel = new Channel<BatchEvent>();
  channel.onmessage = onEvent;
  return invoke<BatchSummary>("process_folder", { request, onEvent: channel });
}

export const cancelProcessing = () => invoke<void>("cancel_processing");

export const checkForUpdates = () => invoke<UpdateInfo | null>("check_for_updates");
