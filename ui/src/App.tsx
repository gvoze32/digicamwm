import { isTauri } from "@tauri-apps/api/core";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import { useEffect, useRef, useState, type ReactNode } from "react";
import * as desktop from "./desktop";
import { previewEngine } from "./engine/engine";
import type { DesignInfo, PhotoSource } from "./types";
import { usePreview, type Sample } from "./usePreview";
import { ACCEPT, download, isSupported, processFiles, type WebResult } from "./web";

const DESKTOP = isTauri();

interface Run {
  total: number;
  done: number;
  failed: { file: string; error: string }[];
  state: "running" | "finished" | "cancelled" | "error";
  error?: string;
}

function useStored(key: string, initial: string) {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? initial);
  useEffect(() => localStorage.setItem(key, value), [key, value]);
  return [value, setValue] as const;
}

const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function App() {
  const [designs, setDesigns] = useState<DesignInfo[]>([]);
  const [design, setDesign] = useStored("design", "classic");
  const [photographer, setPhotographer] = useStored("photographer", "");
  const [photos, setPhotos] = useState<PhotoSource[]>([]);
  const [index, setIndex] = useState(0);
  const [sample, setSample] = useState<Sample>("landscape");
  const [run, setRun] = useState<Run | null>(null);

  // Desktop: folders. Web: files.
  const [inputDir, setInputDir] = useState("");
  const [outputDir, setOutputDir] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<WebResult[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    previewEngine.call("designs", {}).then((list) => {
      setDesigns(list);
      if (!list.some((d) => d.id === design)) setDesign(list[0].id);
    });
    // Runs once: a stored design id from an older version falls back to the first design.
  }, []);

  const source = photos[Math.min(index, photos.length - 1)] ?? null;
  const { camera, preview, thumbs, error, busy } = usePreview(source, sample, designs, design, photographer);
  const selected = designs.find((d) => d.id === design);
  const running = run?.state === "running";

  const showPhotos = (list: PhotoSource[]) => {
    setPhotos(list);
    setIndex(0);
    setRun(null);
    setResults([]);
  };

  const chooseInput = async () => {
    const dir = await desktop.pickFolder("Choose the folder with your photos");
    if (!dir) return;
    setInputDir(dir);
    setOutputDir(await desktop.defaultOutput(dir));
    try {
      showPhotos(await desktop.folderPhotos(dir));
    } catch (e) {
      showPhotos([]);
      setRun({ total: 0, done: 0, failed: [], state: "error", error: errorText(e) });
    }
  };

  const chooseOutput = async () => {
    const dir = await desktop.pickFolder("Choose where to save the framed photos");
    if (dir) setOutputDir(dir);
  };

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []).filter(isSupported);
    setFiles(picked);
    showPhotos(picked.map((file) => ({ name: file.name, read: async () => new Uint8Array(await file.arrayBuffer()) })));
  };

  const track = (event: { kind: "done" | "failed"; file: string; error?: string }) =>
    setRun((r) =>
      r && (event.kind === "done" ? { ...r, done: r.done + 1 } : { ...r, failed: [...r.failed, { file: event.file, error: event.error ?? "" }] }),
    );

  const start = async () => {
    setRun({ total: photos.length, done: 0, failed: [], state: "running" });
    setResults([]);
    try {
      if (DESKTOP) {
        const summary = await desktop.processFolder({ inputDir, outputDir, design, photographer: photographer.trim() }, track);
        setRun((r) => r && { ...r, state: summary.cancelled ? "cancelled" : "finished" });
      } else {
        abort.current = new AbortController();
        const out = await processFiles(files, { design, photographer: photographer.trim(), signal: abort.current.signal }, track);
        setResults(out);
        setRun((r) => r && { ...r, state: abort.current?.signal.aborted ? "cancelled" : "finished" });
      }
    } catch (e) {
      setRun((r) => ({ ...(r ?? { total: 0, done: 0, failed: [] }), state: "error", error: errorText(e) }));
    }
  };

  const stop = async () => {
    if (DESKTOP) await desktop.cancelProcessing();
    else abort.current?.abort();
  };

  return (
    <div className="app">
      <Header />
      {DESKTOP && <UpdateBanner />}
      <main className="workspace">
        <section className="stage">
          <div className={`canvas${busy && preview ? " busy" : ""}`}>
            {error ? (
              <p className="canvas-message">Could not open this photo: {error}</p>
            ) : preview ? (
              <img src={preview} alt={`${selected?.name ?? ""} preview`} />
            ) : (
              <div className="spinner" aria-label="Loading" />
            )}
            {busy && preview && !error && <div className="spinner overlay" aria-label="Updating" />}
          </div>
          <div className="stage-bar">
            {source ? (
              <>
                <button className="ghost" disabled={photos.length < 2} onClick={() => setIndex((index + photos.length - 1) % photos.length)} aria-label="Previous photo">
                  ‹
                </button>
                <div className="stage-caption">
                  <strong>{source.name}</strong>
                  <span>
                    {index + 1} of {photos.length} · {camera === null ? "Reading…" : camera || "No camera details in this photo"}
                  </span>
                </div>
                <button className="ghost" disabled={photos.length < 2} onClick={() => setIndex((index + 1) % photos.length)} aria-label="Next photo">
                  ›
                </button>
              </>
            ) : (
              <>
                <div className="stage-caption">
                  <strong>Sample photo</strong>
                  <span>Choose your own photos to preview them here.</span>
                </div>
                <div className="segmented">
                  {(["landscape", "portrait"] as const).map((s) => (
                    <button key={s} className={sample === s ? "active" : ""} onClick={() => setSample(s)}>
                      {s === "landscape" ? "Wide" : "Tall"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="panel">
          <Step n={1} title="Choose your photos">
            {DESKTOP ? (
              <>
                <FolderField label="Photos from" path={inputDir} placeholder="No folder chosen" onPick={chooseInput} disabled={running} />
                {inputDir && <p className="hint">{photos.length ? `${photos.length} photo${photos.length > 1 ? "s" : ""} found` : "No photos found in this folder."}</p>}
              </>
            ) : (
              <FilePicker count={files.length} onFiles={addFiles} disabled={running} />
            )}
          </Step>

          <Step n={2} title="Pick a style">
            <div className="styles">
              {designs.map((d) => (
                <button key={d.id} className={`style-card${d.id === design ? " selected" : ""}`} onClick={() => setDesign(d.id)} title={d.description}>
                  <span className="style-thumb">{thumbs[d.id] ? <img src={thumbs[d.id]} alt="" /> : <span className="spinner small" />}</span>
                  <span className="style-name">{d.name}</span>
                </button>
              ))}
            </div>
            {selected && <p className="hint">{selected.description}</p>}
          </Step>

          <Step n={3} title="Your name (optional)">
            <input
              className="text-input"
              value={photographer}
              onChange={(e) => setPhotographer(e.target.value)}
              placeholder="Shown on the frame as the photographer"
              maxLength={60}
            />
          </Step>

          <Step n={4} title="Save">
            {DESKTOP && (
              <FolderField label="Save to" path={outputDir} placeholder="Choose photos first" onPick={chooseOutput} disabled={running || !inputDir} />
            )}
            <div className="actions">
              {running ? (
                <button className="secondary" onClick={stop}>
                  Stop
                </button>
              ) : (
                <button className="primary" disabled={photos.length === 0} onClick={start}>
                  {photos.length > 1 ? `Frame ${photos.length} photos` : "Frame photo"}
                </button>
              )}
            </div>
            {run && <Progress run={run} />}
            {run && run.state !== "running" && (DESKTOP ? run.done > 0 : results.length > 0) && (
              <div className="actions">
                {DESKTOP ? (
                  <button className="secondary" onClick={() => openPath(outputDir)}>
                    Open folder
                  </button>
                ) : (
                  <button className="primary" onClick={() => download(results)}>
                    {results.length > 1 ? `Download ${results.length} photos (.zip)` : "Download photo"}
                  </button>
                )}
              </div>
            )}
          </Step>
        </aside>
      </main>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="step">
      <h2>
        <span className="step-number">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function FolderField(props: { label: string; path: string; placeholder: string; onPick: () => void; disabled?: boolean }) {
  return (
    <div className="folder-field">
      <div className="folder-text">
        <span className="folder-label">{props.label}</span>
        <span className={`folder-path${props.path ? "" : " empty"}`} title={props.path}>
          {props.path || props.placeholder}
        </span>
      </div>
      <button className="secondary" onClick={props.onPick} disabled={props.disabled}>
        {props.path ? "Change" : "Choose…"}
      </button>
    </div>
  );
}

function FilePicker({ count, onFiles, disabled }: { count: number; onFiles: (files: FileList | null) => void; disabled?: boolean }) {
  const [dragging, setDragging] = useState(false);
  const folderInput = useRef<HTMLInputElement>(null);
  useEffect(() => folderInput.current?.setAttribute("webkitdirectory", ""), []);
  return (
    <label
      className={`dropzone${dragging ? " dragging" : ""}${disabled ? " disabled" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) onFiles(e.dataTransfer.files);
      }}
    >
      <input type="file" accept={ACCEPT} multiple hidden disabled={disabled} onChange={(e) => onFiles(e.target.files)} />
      <strong>{count ? `${count} photo${count > 1 ? "s" : ""} selected` : "Drop photos here or click to browse"}</strong>
      <span>JPG, PNG, WebP, TIFF or HEIC · your photos never leave this device</span>
      <button
        type="button"
        className="link"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          folderInput.current?.click();
        }}
      >
        or choose a whole folder
      </button>
      <input ref={folderInput} type="file" multiple hidden disabled={disabled} onChange={(e) => onFiles(e.target.files)} />
    </label>
  );
}

function Progress({ run }: { run: Run }) {
  const finished = run.done + run.failed.length;
  const pct = run.total ? Math.round((finished / run.total) * 100) : 0;
  const status = {
    running: `Framing… ${finished} of ${run.total}`,
    finished: `Done! ${run.done} photo${run.done === 1 ? "" : "s"} framed${run.failed.length ? `, ${run.failed.length} skipped` : ""}.`,
    cancelled: `Stopped after ${run.done} photo${run.done === 1 ? "" : "s"}.`,
    error: run.error ?? "Something went wrong.",
  }[run.state];
  return (
    <div className={`progress ${run.state}`}>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${run.state === "error" ? 0 : pct}%` }} />
      </div>
      <p>{status}</p>
      {run.failed.length > 0 && (
        <details>
          <summary>Why were some photos skipped?</summary>
          <ul>
            {run.failed.map((f) => (
              <li key={f.file}>
                <strong>{f.file}</strong> — {f.error}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Header() {
  return (
    <header className="topbar">
      <div className="brand">
        <img src="icon.png" alt="" />
        <div>
          <h1>DigiCamWM</h1>
          <span>Camera-info frames for your photos · v{__APP_VERSION__}</span>
        </div>
      </div>
      <nav className="links">
        <a className="donate" href="https://saweria.co/adena" target="_blank" rel="noreferrer">
          Donate
          <span className="qr">
            <img src="donate.png" alt="Donation QR code" />
            Scan or click to donate
          </span>
        </a>
        <a href="https://github.com/gvoze32/digicamwm" target="_blank" rel="noreferrer" aria-label="GitHub">
          <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
        </a>
      </nav>
    </header>
  );
}

function UpdateBanner() {
  const [update, setUpdate] = useState<{ version: string; releaseUrl: string } | null>(null);
  useEffect(() => {
    desktop
      .checkForUpdates()
      .then(setUpdate)
      .catch(() => {});
  }, []);
  if (!update) return null;
  return (
    <div className="banner">
      <span>
        Version <strong>{update.version}</strong> is available.
      </span>
      <button
        className="primary small"
        onClick={async () => {
          await openUrl(update.releaseUrl);
          setUpdate(null);
        }}
      >
        Download
      </button>
      <button className="ghost small" onClick={() => setUpdate(null)} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
