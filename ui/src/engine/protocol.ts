import type { DesignInfo, PhotoMeta } from "../types";

export interface Processed {
  bytes: Uint8Array;
  extension: string;
  mime: string;
}

/** Request shapes, keyed by `op`, with the value each one resolves to. */
export interface Ops {
  designs: { args: Record<never, never>; result: DesignInfo[] };
  /** Resolves with the camera label read from the photo ("" without EXIF). */
  load: { args: { bytes: Uint8Array; meta?: PhotoMeta }; result: string };
  render: { args: { design: string; photographer: string; size: "preview" | "thumb" }; result: Uint8Array };
  process: { args: { bytes: Uint8Array; design: string; photographer: string }; result: Processed };
}

export type Op = keyof Ops;

export type Request = { [K in Op]: { id: number; op: K } & Ops[K]["args"] }[Op];

export type Response = { id: number; ok: true; value: unknown } | { id: number; ok: false; error: string };
