use digicamwm_core as core;
use rayon::prelude::*;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::Arc;
use tauri::ipc::{Channel, Response};
use tauri::{AppHandle, State};

/// Inputs the desktop app picks up from a folder (case-insensitive).
const EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "tif", "tiff", "heic", "heif"];

/// Concurrent decodes are memory-bound (a 50 MP photo needs ~600 MB in flight), so cap them.
const MAX_WORKERS: usize = 4;

#[derive(Default)]
pub struct Batch {
    running: AtomicBool,
    cancel: AtomicBool,
}

fn is_image(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| EXTENSIONS.contains(&e.to_ascii_lowercase().as_str()))
}

/// Image file names directly inside `dir`, sorted.
#[tauri::command]
pub fn list_images(dir: String) -> Result<Vec<String>, String> {
    let mut names: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| format!("Cannot open {dir}: {e}"))?
        .flatten()
        .filter(|e| e.file_type().is_ok_and(|t| t.is_file()) && is_image(&e.path()))
        .filter_map(|e| e.file_name().into_string().ok())
        .collect();
    names.sort_by_key(|n| n.to_lowercase());
    Ok(names)
}

/// Raw bytes of one photo, for the in-app preview.
#[tauri::command]
pub async fn read_image(path: String) -> Result<Response, String> {
    let path = PathBuf::from(path);
    if !is_image(&path) {
        return Err("Not a supported image".into());
    }
    tauri::async_runtime::spawn_blocking(move || fs::read(&path))
        .await
        .map_err(|e| e.to_string())?
        .map(Response::new)
        .map_err(|e| e.to_string())
}

#[derive(Clone, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum BatchEvent {
    Done { file: String, output: String },
    Failed { file: String, error: String },
}

#[derive(Serialize)]
pub struct BatchSummary {
    done: usize,
    failed: usize,
    cancelled: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchRequest {
    input_dir: String,
    output_dir: String,
    design: String,
    photographer: String,
}

/// Frames every image in `input_dir` into `output_dir`, reporting each file on `on_event`.
#[tauri::command]
pub async fn process_folder(
    batch: State<'_, Arc<Batch>>,
    request: BatchRequest,
    on_event: Channel<BatchEvent>,
) -> Result<BatchSummary, String> {
    if !core::designs().iter().any(|d| d.id == request.design) {
        return Err(format!("Unknown style \"{}\"", request.design));
    }
    if batch.running.swap(true, Ordering::SeqCst) {
        return Err("Already processing".into());
    }
    batch.cancel.store(false, Ordering::SeqCst);
    let batch = Arc::clone(&batch);
    let result = tauri::async_runtime::spawn_blocking({
        let batch = Arc::clone(&batch);
        move || run_batch(&batch, &request, &on_event)
    })
    .await
    .map_err(|e| e.to_string())
    .and_then(|r| r);
    batch.running.store(false, Ordering::SeqCst);
    result
}

fn run_batch(batch: &Batch, req: &BatchRequest, events: &Channel<BatchEvent>) -> Result<BatchSummary, String> {
    let input = PathBuf::from(&req.input_dir);
    let output = PathBuf::from(&req.output_dir);
    fs::create_dir_all(&output).map_err(|e| format!("Cannot create {}: {e}", output.display()))?;
    if fs::canonicalize(&input).ok() == fs::canonicalize(&output).ok() {
        return Err("Pick a different folder to save into, so your originals are not overwritten.".into());
    }

    let files = list_images(req.input_dir.clone())?;
    let targets = output_names(&files);
    let done = AtomicUsize::new(0);
    let failed = AtomicUsize::new(0);
    let threads = std::thread::available_parallelism().map_or(2, |n| n.get()).min(MAX_WORKERS);
    let pool = rayon::ThreadPoolBuilder::new().num_threads(threads).build().map_err(|e| e.to_string())?;

    pool.install(|| {
        files.par_iter().zip(targets.par_iter()).for_each(|(file, stem)| {
            if batch.cancel.load(Ordering::SeqCst) {
                return;
            }
            let result = fs::read(input.join(file))
                .map_err(|e| e.to_string())
                .and_then(|bytes| core::process(&bytes, &req.design, &req.photographer).map_err(|e| e.to_string()))
                .and_then(|encoded| {
                    // The decoded data decides the format (a mislabelled .png may really be a JPEG).
                    let path = output.join(format!("{stem}.{}", encoded.format.extension()));
                    fs::write(&path, encoded.bytes).map_err(|e| e.to_string())?;
                    Ok(path)
                });
            let event = match result {
                Ok(path) => {
                    done.fetch_add(1, Ordering::SeqCst);
                    BatchEvent::Done { file: file.clone(), output: path.to_string_lossy().into_owned() }
                }
                Err(error) => {
                    failed.fetch_add(1, Ordering::SeqCst);
                    log::warn!("{file}: {error}");
                    BatchEvent::Failed { file: file.clone(), error }
                }
            };
            let _ = events.send(event);
        });
    });

    Ok(BatchSummary {
        done: done.into_inner(),
        failed: failed.into_inner(),
        cancelled: batch.cancel.load(Ordering::SeqCst),
    })
}

/// Output file stem per input. Inputs that would land on the same file name
/// (`a.jpg` and `a.webp` both become `a.jpg`) keep their original extension in the stem.
fn output_names(files: &[String]) -> Vec<String> {
    let target = |f: &String| {
        let path = Path::new(f);
        let stem = path.file_stem().map_or_else(|| f.clone(), |s| s.to_string_lossy().into_owned());
        let png = path.extension().is_some_and(|e| e.eq_ignore_ascii_case("png"));
        let ext = if png { core::OutputFormat::Png } else { core::OutputFormat::Jpeg }.extension();
        (stem.clone(), format!("{}.{ext}", stem.to_lowercase()))
    };
    let planned: Vec<(String, String)> = files.iter().map(target).collect();
    let mut seen = HashSet::new();
    let clashes: HashSet<&String> = planned.iter().map(|(_, name)| name).filter(|name| !seen.insert(*name)).collect();
    planned
        .iter()
        .zip(files)
        .map(|((stem, name), file)| {
            if clashes.contains(name) {
                let ext = Path::new(file).extension().map_or(String::new(), |e| e.to_string_lossy().to_lowercase());
                format!("{stem}-{ext}")
            } else {
                stem.clone()
            }
        })
        .collect()
}

#[tauri::command]
pub fn cancel_processing(batch: State<'_, Arc<Batch>>) {
    batch.cancel.store(true, Ordering::SeqCst);
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    release_url: String,
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    html_url: String,
}

/// Latest GitHub release when it is newer than this build.
#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let current = app.package_info().version.to_string();
    let release: GithubRelease = reqwest::Client::builder()
        .user_agent("DigiCamWM Update Checker")
        .build()
        .map_err(|e| e.to_string())?
        .get("https://api.github.com/repos/gvoze32/digicamwm/releases/latest")
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;
    let latest = release.tag_name.trim_start_matches('v');
    Ok(is_newer(latest, &current).then(|| UpdateInfo { version: latest.into(), release_url: release.html_url }))
}

fn is_newer(latest: &str, current: &str) -> bool {
    let parse = |v: &str| -> Vec<u32> {
        let mut parts: Vec<u32> = v.split('.').map(|p| p.parse().unwrap_or(0)).collect();
        while parts.last() == Some(&0) {
            parts.pop();
        }
        parts
    };
    parse(latest) > parse(current)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_comparison_is_numeric() {
        assert!(is_newer("1.0.10", "1.0.9"));
        assert!(is_newer("2.0", "1.9.9"));
        assert!(!is_newer("1.0.8", "1.0.8"));
        assert!(!is_newer("1.0.7", "1.0.8"));
        assert!(!is_newer("1.0.8.0", "1.0.8"));
    }

    #[test]
    fn clashing_outputs_keep_their_source_extension() {
        let files = ["a.jpg", "a.webp", "b.png", "c.HEIC"].map(String::from);
        assert_eq!(output_names(&files), ["a-jpg", "a-webp", "b", "c"]);
    }

    fn request(input: &Path, output: &Path) -> BatchRequest {
        BatchRequest {
            input_dir: input.to_string_lossy().into(),
            output_dir: output.to_string_lossy().into(),
            design: "classic".into(),
            photographer: "Test".into(),
        }
    }

    fn scratch(name: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("digicamwm-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn batch_frames_photos_and_reports_broken_ones() {
        let input = scratch("batch-in");
        let sample = Path::new(env!("CARGO_MANIFEST_DIR")).join("ui/public/samples/landscape.jpg");
        fs::copy(&sample, input.join("a.jpg")).unwrap();
        fs::copy(&sample, input.join("a.webp")).unwrap(); // JPEG data behind a .webp name
        fs::write(input.join("broken.png"), b"not an image").unwrap();
        fs::write(input.join("notes.txt"), b"ignored").unwrap();
        let output = input.join("DigiCamWM");

        let events = Arc::new(std::sync::Mutex::new(0));
        let counter = Arc::clone(&events);
        let channel = Channel::new(move |_| {
            *counter.lock().unwrap() += 1;
            Ok(())
        });
        let summary = run_batch(&Batch::default(), &request(&input, &output), &channel).unwrap();

        assert_eq!((summary.done, summary.failed, summary.cancelled), (2, 1, false));
        assert_eq!(*events.lock().unwrap(), 3);
        let mut written: Vec<String> = fs::read_dir(&output)
            .unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        written.sort();
        assert_eq!(written, ["a-jpg.jpg", "a-webp.jpg"]);
        let framed = fs::read(output.join("a-jpg.jpg")).unwrap();
        let photo = core::Photo::decode(&framed).unwrap();
        assert!(photo.height() > 1350, "frame adds height below the 1800x1350 sample");
        fs::remove_dir_all(&input).unwrap();
    }

    #[test]
    fn batch_refuses_to_overwrite_originals() {
        let dir = scratch("batch-same");
        let channel = Channel::new(|_| Ok(()));
        let err = run_batch(&Batch::default(), &request(&dir, &dir), &channel).err().unwrap();
        assert!(err.contains("different folder"));
        fs::remove_dir_all(&dir).unwrap();
    }
}
