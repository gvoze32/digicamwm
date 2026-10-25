//! Embedded camera-brand logos (trimmed PNGs in `crates/core/logos`).

use crate::meta::PhotoMeta;
use crate::text::N;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::fmt::Write;
use std::sync::OnceLock;

pub(crate) struct Logo {
    slug: &'static str,
    png: &'static [u8],
    data_uri: OnceLock<String>,
}

macro_rules! logos {
    ($($slug:literal),* $(,)?) => {
        [$(Logo {
            slug: $slug,
            png: include_bytes!(concat!("../logos/", $slug, ".png")),
            data_uri: OnceLock::new(),
        }),*]
    };
}

static LOGOS: [Logo; 16] = logos![
    "apple", "canon", "dji", "fujifilm", "gopro", "hasselblad", "kodak", "konicaminolta",
    "leica", "nikon", "olympus", "panasonic", "pentax", "samsung", "sigma", "sony",
];

/// Brands whose logo is a square badge rather than a word mark; drawn smaller.
const BADGES: &[&str] = &["apple", "kodak", "leica", "nikon"];

/// Logos printed on a coloured plate; flattening them to one colour would leave a blank square.
const PLATES: &[&str] = &["kodak", "leica", "nikon"];

impl Logo {
    /// Logo for the camera, matched on `Make` first and then `Model` (e.g. Ricoh-made PENTAX bodies).
    pub fn find(meta: &PhotoMeta) -> Option<&'static Logo> {
        let squash = |s: &str| -> String {
            s.chars().filter(char::is_ascii_alphanumeric).collect::<String>().to_ascii_lowercase()
        };
        [squash(&meta.make), squash(&meta.model)]
            .iter()
            .filter(|s| !s.is_empty())
            .find_map(|s| LOGOS.iter().find(|logo| s.contains(logo.slug)))
    }

    /// Width / height from the PNG IHDR chunk.
    pub fn aspect(&self) -> f64 {
        let be = |at: usize| u32::from_be_bytes(self.png[at..at + 4].try_into().unwrap());
        f64::from(be(16)) / f64::from(be(20))
    }

    pub fn is_badge(&self) -> bool {
        BADGES.contains(&self.slug)
    }

    fn data_uri(&self) -> &str {
        self.data_uri
            .get_or_init(|| format!("data:image/png;base64,{}", STANDARD.encode(self.png)))
    }

    /// Size that fits in `max_w` × `max_h` keeping aspect ratio. Badges get 85% of the height
    /// so word marks and square marks read at a similar visual weight.
    pub fn fit(&self, max_w: f64, max_h: f64) -> (f64, f64) {
        let max_h = if self.is_badge() { max_h * 0.85 } else { max_h };
        let aspect = self.aspect();
        let w = max_w.min(max_h * aspect);
        (w, w / aspect)
    }

    /// `<image>` element with its top-left corner at (`x`, `y`). `tint` recolours every opaque
    /// pixel (used for monochrome logos on dark grounds) through the `logo-tint` filter emitted
    /// by [`tint_filter`].
    pub fn svg(&self, out: &mut String, x: f64, y: f64, w: f64, h: f64, tinted: bool) {
        let tinted = tinted && !PLATES.contains(&self.slug);
        let _ = write!(
            out,
            r#"<image x="{}" y="{}" width="{}" height="{}" preserveAspectRatio="none"{} href="{}"/>"#,
            N(x),
            N(y),
            N(w),
            N(h),
            if tinted { r#" filter="url(#logo-tint)""# } else { "" },
            self.data_uri()
        );
    }
}

/// `<filter id="logo-tint">` that paints an image a flat `#rrggbb` colour while keeping its alpha.
pub(crate) fn tint_filter(out: &mut String, hex: &str) {
    let channel = |i: usize| {
        u8::from_str_radix(hex.get(1 + i * 2..3 + i * 2).unwrap_or("ff"), 16).unwrap_or(255)
    };
    let [r, g, b] = [0, 1, 2].map(|i| N(f64::from(channel(i)) / 255.0));
    let _ = write!(
        out,
        r#"<filter id="logo-tint" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 {r} 0 0 0 0 {g} 0 0 0 0 {b} 0 0 0 1 0"/></filter>"#
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    fn find(make: &str, model: &str) -> Option<&'static str> {
        let meta = PhotoMeta { make: make.into(), model: model.into(), ..Default::default() };
        Logo::find(&meta).map(|l| l.slug)
    }

    #[test]
    fn matches_make_then_model() {
        assert_eq!(find("NIKON CORPORATION", "NIKON Z 6"), Some("nikon"));
        assert_eq!(find("KONICA MINOLTA", "DiMAGE A2"), Some("konicaminolta"));
        assert_eq!(find("EASTMAN KODAK COMPANY", "KODAK P880"), Some("kodak"));
        assert_eq!(find("RICOH IMAGING COMPANY, LTD.", "PENTAX K-3 Mark III"), Some("pentax"));
        assert_eq!(find("Xiaomi", "2201123G"), None);
        assert_eq!(find("", ""), None);
    }

    #[test]
    fn aspect_comes_from_png_header() {
        let sony = LOGOS.iter().find(|l| l.slug == "sony").unwrap();
        assert!(sony.aspect() > 4.0);
        let (w, h) = sony.fit(100.0, 50.0);
        assert!(w <= 100.0 && h <= 50.0 && (w / h - sony.aspect()).abs() < 1e-9);
    }
}
