"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Design } from "@/types/design";

interface DesignResponse {
  designs: Design[];
  defaultDesignId: string;
}

interface ProgressState {
  total: number;
  processed: number;
  currentFile?: string;
}

export default function WatermarkApp(): JSX.Element {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesignId, setSelectedDesignId] = useState<string>("");
  const [photographerName, setPhotographerName] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string>("Ready to process images");
  const [progress, setProgress] = useState<ProgressState>({ total: 0, processed: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<{ src: string; label: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    async function loadDesigns() {
      try {
        const response = await fetch("/api/designs", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load designs: ${response.statusText}`);
        }
        const data: DesignResponse = await response.json();
        setDesigns(data.designs);
        setSelectedDesignId(data.defaultDesignId ?? data.designs[0]?.id ?? "");
      } catch (error) {
        console.error(error);
        setStatus("Unable to fetch watermark designs. Please refresh the page.");
      }
    }

    loadDesigns();
  }, []);

  useEffect(() => {
    if (folderInputRef.current) {
      const folderInput = folderInputRef.current;
      folderInput.setAttribute("webkitdirectory", "true");
      folderInput.setAttribute("mozdirectory", "true");
      folderInput.setAttribute("directory", "true");
    }
  }, []);

  useEffect(() => () => {
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
  }, [downloadUrl]);

  const selectedDesign = useMemo(
    () => designs.find((design) => design.id === selectedDesignId),
    [designs, selectedDesignId]
  );

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const pickedFiles = input.files;
    if (!pickedFiles) {
      setFiles([]);
      setProgress({ total: 0, processed: 0 });
      return;
    }

    const allFiles = Array.from(pickedFiles);
    const supportedFiles = allFiles.filter((file) => {
      const extensionMatch = /\.(jpe?g|png|webp|tiff)$/i.test(file.name);
      const mimeMatch = file.type?.startsWith("image/");
      return extensionMatch || mimeMatch;
    });

    const ignoredCount = allFiles.length - supportedFiles.length;

    setFiles(supportedFiles);
    setDownloadUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return null;
    });
    setProgress({ total: supportedFiles.length, processed: 0 });

    if (!supportedFiles.length) {
      setStatus("No supported images selected (JPG, PNG, TIFF, WebP).");
    } else {
      const ignoredMessage = ignoredCount ? ` (${ignoredCount} skipped)` : "";
      setStatus(`${supportedFiles.length} image(s) ready${ignoredMessage}`);
    }

    // Allow re-selecting the same files
    input.value = "";
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const openFolderPicker = () => {
    folderInputRef.current?.click();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!files.length) {
      setStatus("Select at least one image to start.");
      return;
    }
    if (!selectedDesignId) {
      setStatus("Please choose a watermark design first.");
      return;
    }

    try {
      setIsProcessing(true);
      setStatus("Uploading images…");
      setProgress({ total: files.length, processed: 0 });

    const formData = new FormData();
      formData.append("designId", selectedDesignId);
      formData.append("photographerName", photographerName);
    files.forEach((file: File) => formData.append("images", file, file.name));

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to process images");
      }

      setStatus("Rendering watermarks…");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl((previousUrl) => {
        if (previousUrl) URL.revokeObjectURL(previousUrl);
        return url;
      });

      setStatus("Processing complete! Download your images.");
      setProgress({ total: files.length, processed: files.length });
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Failed to process images");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setFiles([]);
    setProgress({ total: 0, processed: 0 });
    setStatus("Ready to process images");
    setDownloadUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return null;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (folderInputRef.current) folderInputRef.current.value = "";
  };

  return (
    <section className="panel">
      <header className="hero">
        <div className="title-area">
          <h1>DigiCamWM</h1>
          <h2>Digital Camera Watermarking, now on the web.</h2>
        </div>
        <div className="links">
          <div className="badge">
            Made by <a href="https://github.com/gvoze32" target="_blank" rel="noreferrer">gvoze32</a>
          </div>
          <a className="donate-button" href="https://saweria.co/adena" target="_blank" rel="noreferrer">
            <span className="heart">♥</span>
            Donate
          </a>
          <a className="icon" href="https://github.com/gvoze32/digicamwm" target="_blank" rel="noreferrer">
            <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <h3>Select your watermark design</h3>
          <p className="status">Choose a layout that matches your photo style. Use the buttons to view samples.</p>
          <div className="design-gallery">
            {designs.map((design) => {
              const isActive = design.id === selectedDesignId;
              return (
                <div
                  key={design.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  aria-label={`Select ${design.name} watermark`}
                  className={`design-card ${isActive ? "active" : ""}`}
                  onClick={() => setSelectedDesignId(design.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedDesignId(design.id);
                    }
                  }}
                >
                  <img src={design.thumbnails.landscape} alt={`${design.name} landscape preview`} />
                  <div className="design-card-details">
                    <h4>{design.name}</h4>
                    <p>{design.description}</p>
                  </div>
                  <div className="design-sample-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setModalImage({ src: design.thumbnails.landscape, label: `${design.name} · Landscape` });
                      }}
                    >
                      View landscape sample
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        setModalImage({ src: design.thumbnails.portrait, label: `${design.name} · Portrait` });
                      }}
                    >
                      View portrait sample
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3>Upload images</h3>
          <form onSubmit={handleSubmit} className="grid">
            <div className="field">
              <label htmlFor="photographer">Photographer name (optional)</label>
              <input
                id="photographer"
                type="text"
                placeholder="e.g., Alexander Lorem"
                value={photographerName}
                onChange={(event) => setPhotographerName(event.target.value)}
              />
            </div>

            <div className="file-input" role="group" aria-labelledby="file-picker-label">
              <strong id="file-picker-label">Select images</strong>
              <span>Supports JPG, PNG, TIFF, WebP. Choose individual files or import an entire folder (Chromium-based browsers).</span>
              <div className="file-input-actions">
                <button type="button" className="primary-outline" onClick={openFilePicker}>
                  Select files
                </button>
                <button type="button" className="secondary" onClick={openFolderPicker}>
                  Select folder
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tiff,image/*"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <input
                ref={folderInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/tiff,.jpg,.jpeg,.png,.webp,.tiff,image/*"
                multiple
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <span>{files.length ? `${files.length} file(s) ready` : "No files selected yet"}</span>
            </div>

            <div className="actions">
              <button className="primary" type="submit" disabled={isProcessing || !files.length}>
                {isProcessing ? "Processing…" : "Start processing"}
              </button>
              <button className="secondary" type="button" onClick={resetForm} disabled={isProcessing && !files.length}>
                Reset
              </button>
              {downloadUrl && (
                <a
                  className="primary-button"
                  href={downloadUrl}
                  download="digicamwm-watermarked.zip"
                  rel="noreferrer"
                >
                  <svg viewBox="0 0 24 24" aria-hidden>
                    <path
                      fill="currentColor"
                      d="M5 20h14a1 1 0 0 0 0-2H5a1 1 0 0 0 0 2Zm7-4a1 1 0 0 0 .71-.29l5-5a1 1 0 0 0-1.42-1.42L13 12.59V4a1 1 0 0 0-2 0v8.59l-3.29-3.3a1 1 0 0 0-1.42 1.42l5 5A1 1 0 0 0 12 16Z"
                    />
                  </svg>
                  <span>Download results</span>
                </a>
              )}
            </div>
          </form>

          <div className="progress">
            <p className="status">
              {status} {progress.total ? <span>({progress.processed}/{progress.total})</span> : null}
            </p>
            <div className="bar">
              <span style={{ width: progress.total ? `${(progress.processed / progress.total) * 100}%` : "0%" }} />
            </div>
          </div>

          {files.length > 0 && (
            <div className="preview-wrapper">
              <strong>Preview</strong>
              <img src={URL.createObjectURL(files[0])} alt="Preview of the first selected image" />
              <div className="preview-meta">Showing the first selected file ({files[0].name}). Output will include the watermark frame.</div>
            </div>
          )}
        </div>
      </div>

      <footer className="meta">
        <span>Design: {selectedDesign?.name ?? "—"}</span>
        <span>
          Need the desktop version?{" "}
          <a href="https://github.com/gvoze32/digicamwm" target="_blank" rel="noreferrer">
            Grab it on GitHub
          </a>
          .
        </span>
      </footer>

      {modalImage && (
        <div className="modal" onClick={() => setModalImage(null)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" aria-label="Close" onClick={() => setModalImage(null)}>
              ×
            </button>
            <img src={modalImage.src} alt={modalImage.label} />
            <span className="status">{modalImage.label}</span>
          </div>
        </div>
      )}
    </section>
  );
}
