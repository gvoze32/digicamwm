// Browser-only batch processing: WASM workers in parallel, results zipped for download.
import { zipSync } from "fflate";
import { Engine } from "./engine/engine";
import type { Processed } from "./engine/protocol";

export const ACCEPT = ".jpg,.jpeg,.png,.webp,.tif,.tiff,.heic,.heif";
const SUPPORTED = /\.(jpe?g|png|webp|tiff?|heic|heif)$/i;

export const isSupported = (file: File) => SUPPORTED.test(file.name);

/** Each worker can hold ~0.5 GB while framing a large photo; two keep phones and laptops safe. */
const WORKERS = Math.min(2, navigator.hardwareConcurrency || 2);

export type WebEvent = { kind: "done"; file: string } | { kind: "failed"; file: string; error: string };

export interface WebResult {
  name: string;
  data: Processed;
}

/** Frames `files`; resolves with the successful outputs. `signal` stops after in-flight files. */
export async function processFiles(
  files: File[],
  options: { design: string; photographer: string; signal: AbortSignal },
  onEvent: (event: WebEvent) => void,
): Promise<WebResult[]> {
  const results: WebResult[] = [];
  const queue = [...files];
  const engines = Array.from({ length: Math.min(WORKERS, files.length) }, () => new Engine());
  await Promise.all(
    engines.map(async (engine) => {
      for (let file = queue.shift(); file && !options.signal.aborted; file = queue.shift()) {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          const data = await engine.call(
            "process",
            { bytes, design: options.design, photographer: options.photographer },
            [bytes.buffer],
          );
          results.push({ name: file.name, data });
          onEvent({ kind: "done", file: file.name });
        } catch (error) {
          onEvent({ kind: "failed", file: file.name, error: error instanceof Error ? error.message : String(error) });
        }
      }
      engine.terminate();
    }),
  );
  return results;
}

/** One result downloads as-is; several are bundled into a ZIP. */
export function download(results: WebResult[]) {
  const used = new Set<string>();
  const named = results.map(({ name, data }) => {
    const stem = name.replace(/\.[^.]+$/, "");
    let file = `${stem}.${data.extension}`;
    for (let n = 2; used.has(file.toLowerCase()); n++) file = `${stem}-${n}.${data.extension}`;
    used.add(file.toLowerCase());
    return { file, data };
  });

  const blob =
    named.length === 1
      ? new Blob([named[0].data.bytes as BlobPart], { type: named[0].data.mime })
      : new Blob([zipSync(Object.fromEntries(named.map(({ file, data }) => [file, [data.bytes, { level: 0 }]]))) as BlobPart], {
          type: "application/zip",
        });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = named.length === 1 ? named[0].file : "DigiCamWM.zip";
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
}
