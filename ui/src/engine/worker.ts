/// <reference lib="webworker" />
// Runs digicamwm-core (WASM) off the main thread. One request at a time, in arrival order.
import init, { designs, Photo, process } from "../wasm/digicamwm.js";
import wasmUrl from "../wasm/digicamwm_bg.wasm?url";
import type { Request, Response } from "./protocol";

/** Long side of the big preview and of the style thumbnails, in pixels. */
const PREVIEW_SIDE = 1600;
const THUMB_SIDE = 520;

const ready = init({ module_or_path: wasmUrl });
let preview: Photo | null = null;
let thumb: Photo | null = null;

const scope = self as unknown as DedicatedWorkerGlobalScope;

scope.onmessage = async ({ data }: MessageEvent<Request>) => {
  const reply = (message: Response, transfer: Transferable[] = []) => scope.postMessage(message, transfer);
  try {
    await ready;
    switch (data.op) {
      case "designs":
        return reply({ id: data.id, ok: true, value: designs() });
      case "load": {
        preview?.free();
        thumb?.free();
        preview = thumb = null;
        const photo = new Photo(data.bytes, PREVIEW_SIDE);
        if (data.meta) photo.setMeta(data.meta);
        preview = photo;
        thumb = photo.downscaled(THUMB_SIDE);
        return reply({ id: data.id, ok: true, value: photo.camera });
      }
      case "render": {
        const photo = data.size === "thumb" ? thumb : preview;
        if (!photo) throw new Error("No photo loaded");
        const jpeg = photo.render(data.design, data.photographer, data.size === "thumb" ? 80 : 88);
        return reply({ id: data.id, ok: true, value: jpeg }, [jpeg.buffer]);
      }
      case "process": {
        const output = process(data.bytes, data.design, data.photographer);
        const value = { bytes: output.takeBytes(), extension: output.extension, mime: output.mime };
        output.free();
        return reply({ id: data.id, ok: true, value }, [value.bytes.buffer]);
      }
    }
  } catch (error) {
    reply({ id: data.id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
