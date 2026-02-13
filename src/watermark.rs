use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use image::{DynamicImage, GenericImageView, ImageBuffer, Rgba, imageops};
use image::codecs::jpeg::JpegEncoder;
use std::fs;
use std::io::Cursor;
use std::path::Path;

use crate::designs::{
    self, LandscapeParams, PortraitParams,
};

// ─── EXIF Parsing ─────────────────────────────────────

pub struct ExifInfo {
    pub camera_model: String,
    pub camera_make: String,
    pub focal_length: String,
    pub f_number: String,
    pub exposure_time: String,
    pub iso: String,
    pub date_time: String,
    pub orientation: u32,
}

pub fn parse_exif(image_data: &[u8]) -> ExifInfo {
    let mut info = ExifInfo {
        camera_model: "Unknown Camera".into(),
        camera_make: String::new(),
        focal_length: String::new(),
        f_number: String::new(),
        exposure_time: String::new(),
        iso: String::new(),
        date_time: String::new(),
        orientation: 1,
    };

    let reader = exif::Reader::new();
    let Ok(exif) = reader.read_from_container(&mut Cursor::new(image_data)) else {
        return info;
    };

    // Model
    if let Some(f) = exif.get_field(exif::Tag::Model, exif::In::PRIMARY) {
        info.camera_model = f.display_value().to_string().trim_matches('"').to_string();
    }
    // Make
    if let Some(f) = exif.get_field(exif::Tag::Make, exif::In::PRIMARY) {
        info.camera_make = f.display_value().to_string().trim_matches('"').to_string();
    }
    // FocalLength
    if let Some(f) = exif.get_field(exif::Tag::FocalLength, exif::In::PRIMARY) {
        if let exif::Value::Rational(ref v) = f.value {
            if let Some(r) = v.first() {
                if r.denom != 0 {
                    let fl = r.num as f64 / r.denom as f64;
                    info.focal_length = format!("{}mm", fl.round() as i32);
                }
            }
        }
    }
    // FNumber
    if let Some(f) = exif.get_field(exif::Tag::FNumber, exif::In::PRIMARY) {
        if let exif::Value::Rational(ref v) = f.value {
            if let Some(r) = v.first() {
                if r.denom != 0 {
                    let fnum = r.num as f64 / r.denom as f64;
                    info.f_number = format!("f/{:.1}", fnum);
                }
            }
        }
    }
    // ExposureTime
    if let Some(f) = exif.get_field(exif::Tag::ExposureTime, exif::In::PRIMARY) {
        if let exif::Value::Rational(ref v) = f.value {
            if let Some(r) = v.first() {
                if r.denom != 0 {
                    let et = r.num as f64 / r.denom as f64;
                    if et < 1.0 && et > 0.0 {
                        info.exposure_time = format!("1/{}", (1.0 / et).round() as i32);
                    } else {
                        info.exposure_time = format!("{}s", et);
                    }
                }
            }
        }
    }
    // ISO
    if let Some(f) = exif.get_field(exif::Tag::PhotographicSensitivity, exif::In::PRIMARY) {
        match &f.value {
            exif::Value::Short(v) => {
                if let Some(&iso) = v.first() {
                    info.iso = iso.to_string();
                }
            }
            exif::Value::Long(v) => {
                if let Some(&iso) = v.first() {
                    info.iso = iso.to_string();
                }
            }
            _ => {
                info.iso = f.display_value().to_string();
            }
        }
    }
    // DateTimeOriginal
    if let Some(f) = exif.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY) {
        let raw = f.display_value().to_string().trim_matches('"').to_string();
        // Convert "2024:01:15 14:30:00" → "2024.01.15 14:30:00"
        info.date_time = raw.replacen(':', ".", 1).replacen(':', ".", 1);
    }
    // Orientation
    if let Some(f) = exif.get_field(exif::Tag::Orientation, exif::In::PRIMARY) {
        if let exif::Value::Short(ref v) = f.value {
            if let Some(&o) = v.first() {
                info.orientation = o as u32;
            }
        }
    }

    info
}

// ─── Image orientation ───────────────────────────────

fn auto_orient(img: DynamicImage, orientation: u32) -> DynamicImage {
    match orientation {
        2 => img.fliph(),
        3 => img.rotate180(),
        4 => img.flipv(),
        5 => img.rotate90().fliph(),
        6 => img.rotate90(),
        7 => img.rotate270().fliph(),
        8 => img.rotate270(),
        _ => img,
    }
}

// ─── Logo lookup ──────────────────────────────────────

fn find_brand_logo(camera_make: &str, models_dir: &Path) -> Option<String> {
    let Ok(entries) = fs::read_dir(models_dir) else {
        return None;
    };

    let available: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_string_lossy().to_string();
            if name.ends_with(".png") {
                Some(name.to_lowercase())
            } else {
                None
            }
        })
        .collect();

    let make_words: Vec<String> = camera_make
        .to_lowercase()
        .split_whitespace()
        .map(|s| s.to_string())
        .collect();

    for word in &make_words {
        if word.len() <= 2 {
            continue;
        }
        for logo in &available {
            let logo_name = logo.trim_end_matches(".png");
            if logo_name == word || word.contains(logo_name) || logo_name.contains(word.as_str()) {
                let logo_path = models_dir.join(logo);
                if let Ok(data) = fs::read(&logo_path) {
                    let b64 = BASE64.encode(&data);
                    return Some(format!("data:image/png;base64,{}", b64));
                }
            }
        }
    }
    None
}

// ─── SVG rendering ────────────────────────────────────

fn render_svg_to_rgba(svg_string: &str) -> Result<(Vec<u8>, u32, u32), String> {
    let mut opt = resvg::usvg::Options::default();
    opt.fontdb_mut().load_system_fonts();

    let tree = resvg::usvg::Tree::from_str(svg_string, &opt)
        .map_err(|e| format!("SVG parse error: {}", e))?;

    let size = tree.size().to_int_size();
    let mut pixmap = resvg::tiny_skia::Pixmap::new(size.width(), size.height())
        .ok_or("Failed to create pixmap")?;

    resvg::render(&tree, resvg::tiny_skia::Transform::default(), &mut pixmap.as_mut());

    let width = pixmap.width();
    let height = pixmap.height();
    // Convert from premultiplied RGBA to straight RGBA
    let data = pixmap.take();

    Ok((data, width, height))
}

// ─── Main processing ─────────────────────────────────

pub fn add_watermark_frame(
    input_path: &Path,
    output_path: &Path,
    design_id: &str,
    photographer_name: &str,
    models_dir: &Path,
) -> Result<(), String> {
    // Read file
    let image_data = fs::read(input_path)
        .map_err(|e| format!("Failed to read {}: {}", input_path.display(), e))?;

    // Parse EXIF
    let exif_info = parse_exif(&image_data);

    // Load image
    let img = image::load_from_memory(&image_data)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    // Auto-orient
    let img = auto_orient(img, exif_info.orientation);
    let (image_width, image_height) = img.dimensions();

    // Camera info
    let mut camera_info = exif_info.camera_model.clone();
    if camera_info.contains("iPhone") {
        camera_info = format!("Apple {}", camera_info);
    }

    // Exposure info
    let mut parts: Vec<String> = Vec::new();
    if !exif_info.focal_length.is_empty() {
        parts.push(exif_info.focal_length.clone());
    }
    if !exif_info.f_number.is_empty() {
        parts.push(exif_info.f_number.clone());
    }
    if !exif_info.exposure_time.is_empty() {
        parts.push(exif_info.exposure_time.clone());
    }
    if !exif_info.iso.is_empty() {
        parts.push(format!("ISO {}", exif_info.iso));
    }
    let exposure_info = parts.join(" | ");

    // Frame dimensions
    let frame_height = (image_height as f64 * 0.1).round();
    let font_size = f64::max(14.0, frame_height * 0.3);
    let small_font_size = f64::max(11.0, font_size * 0.75);

    // Find brand logo
    let brand_logo = find_brand_logo(&exif_info.camera_make, models_dir);

    let is_portrait = image_height > image_width;

    // Generate SVG watermark
    let svg_string = if is_portrait {
        let center_x = image_width as f64 / 2.0;

        // Build logo element
        let logo_height = (frame_height * 0.5).round();
        let logo_width = logo_height * 1.5;
        let logo_y = frame_height * 0.8 - logo_height / 2.0;
        let logo_x = center_x - logo_width / 2.0;

        let logo_element = if let Some(ref logo_data) = brand_logo {
            format!(
                r##"<image x="{}" y="{}" width="{}" height="{}" href="{}" preserveAspectRatio="xMidYMid meet" />"##,
                logo_x, logo_y, logo_width, logo_height, logo_data
            )
        } else {
            format!(
                r##"<text x="{}" y="{}" font-family="Arial, sans-serif" font-size="{}" font-weight="700" fill="#333333" text-anchor="middle" dominant-baseline="central">{}</text>"##,
                center_x, frame_height * 0.8, font_size, exif_info.camera_make
            )
        };

        let params = PortraitParams {
            image_width,
            frame_height,
            center_x,
            logo_element,
            camera_info: camera_info.clone(),
            exposure_info: exposure_info.clone(),
            date_time_string: exif_info.date_time.clone(),
            font_size,
            small_font_size,
            photographer_name: photographer_name.to_string(),
        };

        designs::render_portrait(design_id, &params)
    } else {
        // Landscape
        let left_padding = f64::max(30.0, image_width as f64 * 0.02);
        let right_padding = f64::max(30.0, image_width as f64 * 0.02);
        let center_y = frame_height / 2.0;
        let text_adjustment = (frame_height * 0.08).round();
        let logo_adjustment = (frame_height * 0.03).round();

        let logo_height = (frame_height * 0.6).round();
        let logo_width = logo_height * 1.5;
        let logo_x = image_width as f64 - right_padding - logo_width;
        let logo_y = center_y - logo_height / 2.0 + logo_adjustment;

        let divider_x = logo_x - font_size * 2.0;
        let divider_height = frame_height * 0.6;

        let left_text_x = left_padding;
        let right_text_x = divider_x - font_size;

        let (exposure_y, date_y) = if !exposure_info.is_empty() && !exif_info.date_time.is_empty() {
            let line_spacing = small_font_size * 1.5;
            (
                center_y - line_spacing / 2.0 + text_adjustment,
                center_y + line_spacing / 2.0 + text_adjustment,
            )
        } else {
            (center_y + text_adjustment, center_y + text_adjustment)
        };

        let adjusted_divider_top = center_y - divider_height / 2.0 + logo_adjustment;
        let adjusted_divider_bottom = center_y + divider_height / 2.0 + logo_adjustment;

        let logo_element = if let Some(ref logo_data) = brand_logo {
            format!(
                r##"<image x="{}" y="{}" width="{}" height="{}" href="{}" preserveAspectRatio="xMidYMid meet" />"##,
                logo_x, logo_y, logo_width, logo_height, logo_data
            )
        } else {
            format!(
                r##"<text x="{}" y="{}" font-family="Arial, sans-serif" font-size="{}" font-weight="700" fill="#333333" text-anchor="middle" dominant-baseline="central">{}</text>"##,
                logo_x + logo_width / 2.0, center_y + text_adjustment, font_size, exif_info.camera_make
            )
        };

        let params = LandscapeParams {
            image_width,
            frame_height,
            center_y,
            text_adjustment,
            logo_adjustment,
            logo_element,
            camera_info: camera_info.clone(),
            exposure_info: exposure_info.clone(),
            date_time_string: exif_info.date_time.clone(),
            left_text_x,
            right_text_x,
            exposure_y,
            date_y,
            divider_x,
            adjusted_divider_top,
            adjusted_divider_bottom,
            font_size,
            small_font_size,
            photographer_name: photographer_name.to_string(),
        };

        designs::render_landscape(design_id, &params)
    };

    // Render SVG to pixels
    let (svg_pixels, svg_w, svg_h) = render_svg_to_rgba(&svg_string)?;

    // Calculate actual frame height for the final image
    let final_frame_height = designs::get_frame_svg_height(design_id, frame_height, is_portrait);

    // Create canvas with extended height
    let new_height = image_height + final_frame_height;
    let mut canvas: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_pixel(image_width, new_height, Rgba([255, 255, 255, 255]));

    // Copy original image onto canvas
    let img_rgba = img.to_rgba8();
    imageops::overlay(&mut canvas, &img_rgba, 0, 0);

    // Copy SVG watermark below the image
    if svg_w > 0 && svg_h > 0 {
        let watermark: ImageBuffer<Rgba<u8>, Vec<u8>> =
            ImageBuffer::from_raw(svg_w, svg_h, svg_pixels)
                .ok_or("Failed to create watermark image buffer")?;
        imageops::overlay(&mut canvas, &watermark, 0, image_height as i64);
    }

    // Save output
    let ext = output_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();

    // Ensure output directory exists
    if let Some(parent) = output_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create output directory: {}", e))?;
    }

    match ext.as_str() {
        "jpg" | "jpeg" => {
            let file = fs::File::create(output_path)
                .map_err(|e| format!("Failed to create output file: {}", e))?;
            let mut buf = std::io::BufWriter::new(file);
            let encoder = JpegEncoder::new_with_quality(&mut buf, 95);
            canvas.write_with_encoder(encoder)
                .map_err(|e| format!("Failed to write JPEG: {}", e))?;
        }
        "png" => {
            canvas.save(output_path)
                .map_err(|e| format!("Failed to save PNG: {}", e))?;
        }
        "webp" => {
            canvas.save(output_path)
                .map_err(|e| format!("Failed to save WebP: {}", e))?;
        }
        _ => {
            // Default: save as JPEG
            let file = fs::File::create(output_path)
                .map_err(|e| format!("Failed to create output file: {}", e))?;
            let mut buf = std::io::BufWriter::new(file);
            let encoder = JpegEncoder::new_with_quality(&mut buf, 95);
            canvas.write_with_encoder(encoder)
                .map_err(|e| format!("Failed to write output: {}", e))?;
        }
    }

    log::info!("Watermarked image saved: {}", output_path.display());
    Ok(())
}
