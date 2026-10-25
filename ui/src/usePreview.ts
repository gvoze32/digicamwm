import { useEffect, useRef, useState } from "react";
import { previewEngine } from "./engine/engine";
import type { DesignInfo, PhotoMeta, PhotoSource } from "./types";

export type Sample = "landscape" | "portrait";

/** EXIF for the bundled sample photos (their files carry none). */
const SAMPLE_META: PhotoMeta = {
  make: "EASTMAN KODAK COMPANY",
  model: "KODAK P880 ZOOM DIGITAL CAMERA",
  lens: "",
  focalLength: 5.8,
  fNumber: 2.8,
  exposureTime: 1 / 400,
  iso: 50,
  takenAt: "2005:11:14 16:49:07",
};

const toUrl = (jpeg: Uint8Array) => URL.createObjectURL(new Blob([jpeg as BlobPart], { type: "image/jpeg" }));

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/**
 * Renders the selected design large and every design as a thumbnail, from the user's photo or a
 * bundled sample. Superseded renders are dropped, and blob URLs are revoked when replaced.
 */
export function usePreview(
  source: PhotoSource | null,
  sample: Sample,
  designs: DesignInfo[],
  design: string,
  photographer: string,
) {
  const name = useDebounced(photographer.trim(), 300);
  const [loaded, setLoaded] = useState<{ token: number; camera: string } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const loads = useRef(0);

  useEffect(() => {
    const token = ++loads.current;
    setError(null);
    setBusy(true);
    (async () => {
      const bytes = source
        ? await source.read()
        : new Uint8Array(await (await fetch(`samples/${sample}.jpg`)).arrayBuffer());
      if (token !== loads.current) return;
      const camera = await previewEngine.call("load", { bytes, meta: source ? undefined : SAMPLE_META }, [bytes.buffer]);
      if (token === loads.current) setLoaded({ token, camera });
    })().catch((e: unknown) => {
      if (token !== loads.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    });
  }, [source, sample]);

  useEffect(() => {
    if (!loaded || !design) return;
    let live = true;
    setBusy(true);
    previewEngine
      .call("render", { design, photographer: name, size: "preview" })
      .then((jpeg) => {
        if (!live) return;
        const url = toUrl(jpeg);
        setPreview((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        setBusy(false);
      })
      .catch((e: unknown) => {
        if (!live) return;
        setError(e instanceof Error ? e.message : String(e));
        setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [loaded, design, name]);

  useEffect(() => {
    if (!loaded || designs.length === 0) return;
    let live = true;
    (async () => {
      for (const { id } of designs) {
        const jpeg = await previewEngine.call("render", { design: id, photographer: name, size: "thumb" });
        if (!live) return;
        const url = toUrl(jpeg);
        setThumbs((old) => {
          if (old[id]) URL.revokeObjectURL(old[id]);
          return { ...old, [id]: url };
        });
      }
    })().catch(() => {});
    return () => {
      live = false;
    };
  }, [loaded, designs, name]);

  return { camera: loaded?.camera ?? null, preview, thumbs, error, busy };
}
