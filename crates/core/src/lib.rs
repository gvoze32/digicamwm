//! DigiCamWM rendering core: decode a photo, read its EXIF, and draw a camera-info frame.
//!
//! Shared by the Tauri app (native) and the browser build (`crates/wasm`), so every platform
//! renders identical output from identical embedded fonts and logos.

mod compose;
mod designs;
mod logo;
mod meta;
mod text;

use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::metadata::Orientation;
use image::{ExtendedColorType, ImageEncoder, ImageFormat, RgbaImage};
use resvg::tiny_skia::Pixmap;
use std::fmt;

pub use designs::{designs, DesignInfo};
pub use meta::{PhotoMeta, TakenAt};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Error {
    Decode(String),
    UnknownDesign(String),
    Render(String),
    Encode(String),
}

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Error::Decode(e) => write!(f, "cannot read image: {e}"),
            Error::UnknownDesign(id) => write!(f, "unknown design \"{id}\""),
            Error::Render(e) => write!(f, "render failed: {e}"),
            Error::Encode(e) => write!(f, "cannot encode image: {e}"),
        }
    }
}

impl std::error::Error for Error {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputFormat {
    Jpeg,
    Png,
}

impl OutputFormat {
    /// PNG stays lossless; every other input (JPEG, WebP, TIFF) is written as JPEG.
    fn for_input(format: ImageFormat) -> Self {
        match format {
            ImageFormat::Png => OutputFormat::Png,
            _ => OutputFormat::Jpeg,
        }
    }

    pub fn extension(self) -> &'static str {
        match self {
            OutputFormat::Jpeg => "jpg",
            OutputFormat::Png => "png",
        }
    }

    pub fn mime(self) -> &'static str {
        match self {
            OutputFormat::Jpeg => "image/jpeg",
            OutputFormat::Png => "image/png",
        }
    }
}

/// A decoded, upright photo plus its metadata.
pub struct Photo {
    /// Premultiplied RGBA, so the compositor can borrow it without conversion.
    pixels: RgbaImage,
    pub meta: PhotoMeta,
    /// Format a rendered frame should be saved in.
    pub format: OutputFormat,
}

impl Photo {
    /// Decodes JPEG, PNG, WebP, TIFF or HEIF/HEIC bytes and applies the stored orientation.
    pub fn decode(bytes: &[u8]) -> Result<Self, Error> {
        let (meta, orientation) = meta::read(bytes);
        if is_heif(bytes) {
            // heic-rs applies the container's irot/imir itself; per the HEIF spec those, not the
            // EXIF Orientation tag, are authoritative, so EXIF orientation is ignored here.
            let options = heic_rs::DecodeOptions::default().with_layout(heic_rs::PixelLayout::Rgba8);
            let img = heic_rs::decode(bytes, &options).map_err(|e| Error::Decode(format!("HEIF: {e}")))?;
            let mut pixels = RgbaImage::from_raw(img.width, img.height, img.data)
                .ok_or_else(|| Error::Decode("HEIF: truncated pixel data".into()))?;
            premultiply(&mut pixels);
            return Ok(Photo { pixels, meta, format: OutputFormat::Jpeg });
        }
        let format = image::guess_format(bytes).map_err(|e| Error::Decode(e.to_string()))?;
        let mut img = image::load_from_memory_with_format(bytes, format)
            .map_err(|e| Error::Decode(e.to_string()))?;
        if let Some(orientation) = Orientation::from_exif(orientation) {
            img.apply_orientation(orientation);
        }
        let mut pixels = img.into_rgba8();
        premultiply(&mut pixels);
        Ok(Photo { pixels, meta, format: OutputFormat::for_input(format) })
    }

    pub fn width(&self) -> u32 {
        self.pixels.width()
    }

    pub fn height(&self) -> u32 {
        self.pixels.height()
    }

    /// Copy whose longer side is at most `max_side` pixels (for previews).
    pub fn downscaled(&self, max_side: u32) -> Photo {
        let (w, h) = (self.width(), self.height());
        let k = f64::from(max_side) / f64::from(w.max(h));
        let pixels = if k >= 1.0 {
            self.pixels.clone()
        } else {
            let size = |v: u32| ((f64::from(v) * k).round() as u32).max(1);
            image::imageops::thumbnail(&self.pixels, size(w), size(h))
        };
        Photo { pixels, meta: self.meta.clone(), format: self.format }
    }

    /// Draws `design` around the photo.
    pub fn render(&self, design: &str, photographer: &str) -> Result<Frame, Error> {
        let design = designs::find(design).ok_or_else(|| Error::UnknownDesign(design.into()))?;
        let layout = design.layout(&self.meta, photographer, self.width(), self.height());
        compose::rasterize(&self.pixels, &layout).map(Frame)
    }
}

/// A rendered, fully opaque canvas.
pub struct Frame(Pixmap);

impl Frame {
    pub fn width(&self) -> u32 {
        self.0.width()
    }

    pub fn height(&self) -> u32 {
        self.0.height()
    }

    /// `quality` applies to JPEG only (1–100).
    pub fn encode(&self, format: OutputFormat, quality: u8) -> Result<Vec<u8>, Error> {
        // The canvas is opaque, so premultiplied RGBA == straight RGB with the alpha dropped.
        let rgb: Vec<u8> = self.0.data().as_chunks::<4>().0.iter().flat_map(|p| [p[0], p[1], p[2]]).collect();
        let (w, h) = (self.width(), self.height());
        let mut out = Vec::with_capacity(rgb.len() / 6);
        let result = match format {
            OutputFormat::Jpeg => JpegEncoder::new_with_quality(&mut out, quality.clamp(1, 100))
                .write_image(&rgb, w, h, ExtendedColorType::Rgb8),
            OutputFormat::Png => PngEncoder::new(&mut out).write_image(&rgb, w, h, ExtendedColorType::Rgb8),
        };
        result.map_err(|e| Error::Encode(e.to_string()))?;
        Ok(out)
    }
}

/// Final output of [`process`].
pub struct Encoded {
    pub bytes: Vec<u8>,
    pub format: OutputFormat,
}

/// JPEG quality for saved results.
pub const OUTPUT_QUALITY: u8 = 93;

/// Decode → frame → encode in the input's format family.
pub fn process(bytes: &[u8], design: &str, photographer: &str) -> Result<Encoded, Error> {
    let photo = Photo::decode(bytes)?;
    let frame = photo.render(design, photographer)?;
    Ok(Encoded { bytes: frame.encode(photo.format, OUTPUT_QUALITY)?, format: photo.format })
}

fn premultiply(img: &mut RgbaImage) {
    for p in img.pixels_mut() {
        let a = u16::from(p[3]);
        if a < 255 {
            for c in &mut p.0[..3] {
                *c = ((u16::from(*c) * a + 127) / 255) as u8;
            }
        }
    }
}

/// ISO-BMFF `ftyp` with a HEIF still-image brand.
fn is_heif(bytes: &[u8]) -> bool {
    const BRANDS: [&[u8; 4]; 8] = [b"heic", b"heix", b"hevc", b"hevx", b"heim", b"heis", b"mif1", b"msf1"];
    bytes.get(4..8) == Some(b"ftyp") && bytes.get(8..12).is_some_and(|b| BRANDS.iter().any(|x| x[..] == *b))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heif_is_routed_by_brand_and_corrupt_files_fail_cleanly() {
        let mut file = b"\0\0\0\x18ftypheic\0\0\0\0mif1heic".to_vec();
        assert!(is_heif(&file));
        assert!(matches!(Photo::decode(&file), Err(Error::Decode(e)) if e.starts_with("HEIF")));
        file[8..12].copy_from_slice(b"avif");
        assert!(!is_heif(&file));
    }
}
