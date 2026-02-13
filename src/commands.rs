use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

use crate::designs::{self, DesignInfo};
use crate::watermark;

// ─── App State ────────────────────────────────────────

pub struct AppState {
    pub current_design_id: Mutex<String>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            current_design_id: Mutex::new("classic".into()),
        }
    }
}

// ─── Event Payloads ───────────────────────────────────

#[derive(Clone, Serialize)]
#[serde(tag = "type")]
pub enum ProcessStatus {
    #[serde(rename = "start")]
    Start { total: usize },
    #[serde(rename = "progress")]
    Progress {
        current: usize,
        #[serde(rename = "currentFile")]
        current_file: String,
        total: usize,
    },
    #[serde(rename = "complete")]
    Complete,
}

#[derive(Clone, Serialize)]
pub struct ImageProcessed {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    pub file: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Clone, Serialize)]
pub struct UpdateAvailable {
    pub version: String,
    #[serde(rename = "releaseUrl")]
    pub release_url: String,
}

#[derive(Serialize)]
pub struct ProcessResult {
    pub success: bool,
    pub message: String,
}

// ─── Commands ─────────────────────────────────────────

#[tauri::command]
pub fn get_designs() -> Vec<DesignInfo> {
    designs::get_design_list()
}

#[tauri::command]
pub fn set_design(state: State<'_, AppState>, design_id: String) -> Result<serde_json::Value, String> {
    let mut current = state.current_design_id.lock().map_err(|e| e.to_string())?;
    *current = design_id.clone();
    Ok(serde_json::json!({ "success": true, "designId": design_id }))
}

#[tauri::command]
pub fn get_current_design(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let current = state.current_design_id.lock().map_err(|e| e.to_string())?;
    let design_list = designs::get_design_list();
    let design = design_list
        .iter()
        .find(|d| d.id == *current)
        .cloned()
        .unwrap_or_else(|| design_list[0].clone());

    Ok(serde_json::json!({
        "id": design.id,
        "name": design.name,
        "description": design.description,
        "thumbnailPath": design.thumbnail_path,
    }))
}

#[tauri::command]
pub async fn start_processing(
    app: AppHandle,
    state: State<'_, AppState>,
    input_dir: String,
    output_dir: String,
    photographer_name: String,
) -> Result<ProcessResult, String> {
    let design_id = {
        let current = state.current_design_id.lock().map_err(|e| e.to_string())?;
        current.clone()
    };

    // Resolve models directory (bundled assets)
    let models_dir = app
        .path()
        .resource_dir()
        .map_err(|e| format!("Failed to resolve resource dir: {}", e))?
        .join("assets")
        .join("models");

    // Ensure output directory exists
    fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output dir: {}", e))?;

    // List image files
    let image_extensions = ["jpg", "jpeg", "png", "tiff", "webp"];
    let entries = fs::read_dir(&input_dir)
        .map_err(|e| format!("Failed to read input dir: {}", e))?;

    let mut image_files: Vec<String> = Vec::new();
    for entry in entries.flatten() {
        if let Some(name) = entry.file_name().to_str() {
            let lower = name.to_lowercase();
            if image_extensions.iter().any(|ext| lower.ends_with(&format!(".{}", ext))) {
                image_files.push(name.to_string());
            }
        }
    }

    image_files.sort();

    // Emit start event
    let _ = app.emit("process-status", ProcessStatus::Start {
        total: image_files.len(),
    });

    let total = image_files.len();
    for (i, file) in image_files.iter().enumerate() {
        let input_path = Path::new(&input_dir).join(file);
        let output_path = Path::new(&output_dir).join(file);

        // Emit progress
        let _ = app.emit("process-status", ProcessStatus::Progress {
            current: i + 1,
            current_file: file.clone(),
            total,
        });

        match watermark::add_watermark_frame(
            &input_path,
            &output_path,
            &design_id,
            &photographer_name,
            &models_dir,
        ) {
            Ok(_) => {
                let _ = app.emit("image-processed", ImageProcessed {
                    success: true,
                    path: Some(output_path.to_string_lossy().to_string()),
                    file: file.clone(),
                    error: None,
                });
            }
            Err(e) => {
                let _ = app.emit("image-processed", ImageProcessed {
                    success: false,
                    path: None,
                    file: file.clone(),
                    error: Some(e),
                });
            }
        }
    }

    // Emit complete
    let _ = app.emit("process-status", ProcessStatus::Complete);

    Ok(ProcessResult {
        success: true,
        message: format!("Processed {} images", total),
    })
}

#[tauri::command]
pub async fn check_for_updates(app: AppHandle) -> Result<(), String> {
    let version = app.package_info().version.to_string();
    tokio::spawn(async move {
        match do_update_check(&version).await {
            Ok(Some(update)) => {
                let _ = app.emit("update-available", update);
            }
            Ok(None) => {} // up to date
            Err(e) => {
                log::error!("Update check failed: {}", e);
            }
        }
    });
    Ok(())
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    html_url: String,
}

async fn do_update_check(current_version: &str) -> Result<Option<UpdateAvailable>, String> {
    let client = reqwest::Client::builder()
        .user_agent("DigiCamWM Update Checker")
        .build()
        .map_err(|e| e.to_string())?;

    let release: GithubRelease = client
        .get("https://api.github.com/repos/gvoze32/digicamwm/releases/latest")
        .send()
        .await
        .map_err(|e| e.to_string())?
        .json()
        .await
        .map_err(|e| e.to_string())?;

    let latest = release.tag_name.trim_start_matches('v');

    if is_newer_version(latest, current_version) {
        Ok(Some(UpdateAvailable {
            version: latest.to_string(),
            release_url: release.html_url,
        }))
    } else {
        Ok(None)
    }
}

fn is_newer_version(latest: &str, current: &str) -> bool {
    let latest_parts: Vec<u32> = latest.split('.').filter_map(|p| p.parse().ok()).collect();
    let current_parts: Vec<u32> = current.split('.').filter_map(|p| p.parse().ok()).collect();
    let len = latest_parts.len().max(current_parts.len());
    for i in 0..len {
        let l = latest_parts.get(i).copied().unwrap_or(0);
        let c = current_parts.get(i).copied().unwrap_or(0);
        if l > c {
            return true;
        }
        if l < c {
            return false;
        }
    }
    false
}
