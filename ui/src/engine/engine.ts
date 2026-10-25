import type { Op, Ops, Request, Response } from "./protocol";

/** Promise wrapper around one rendering worker. */
export class Engine {
  private worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private nextId = 1;

  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<Response>) => {
      const call = this.pending.get(data.id);
      if (!call) return;
      this.pending.delete(data.id);
      if (data.ok) call.resolve(data.value);
      else call.reject(new Error(data.error));
    };
  }

  /** `transfer` hands buffers to the worker without copying; they are unusable afterwards. */
  call<K extends Op>(op: K, args: Ops[K]["args"], transfer: Transferable[] = []): Promise<Ops[K]["result"]> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, op, ...args } as Request, transfer);
    });
  }

  terminate() {
    this.worker.terminate();
    for (const call of this.pending.values()) call.reject(new Error("Stopped"));
    this.pending.clear();
  }
}

/** Shared worker for previews and thumbnails. */
export const previewEngine = new Engine();
