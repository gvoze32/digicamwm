//! Camera metadata: EXIF extraction plus the display strings designs render.

use exif::{In, Reader, Tag, Value};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

/// Shooting metadata shown in frames. Numeric fields stay raw so each design can format them.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PhotoMeta {
    pub make: String,
    pub model: String,
    pub lens: String,
    /// Millimetres.
    pub focal_length: Option<f64>,
    pub f_number: Option<f64>,
    /// Seconds.
    pub exposure_time: Option<f64>,
    pub iso: Option<u32>,
    /// EXIF format: `YYYY:MM:DD HH:MM:SS`.
    pub taken_at: Option<String>,
}

/// Calendar parts of [`PhotoMeta::taken_at`].
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct TakenAt {
    pub year: u16,
    pub month: u8,
    pub day: u8,
    pub hour: u8,
    pub minute: u8,
}

impl TakenAt {
    /// `2024.01.15 14:30`
    pub fn dotted(&self) -> String {
        format!(
            "{}.{:02}.{:02} {:02}:{:02}",
            self.year, self.month, self.day, self.hour, self.minute
        )
    }

    /// `2024.01.15`
    pub fn date(&self) -> String {
        format!("{}.{:02}.{:02}", self.year, self.month, self.day)
    }

    /// Film-camera date imprint: `'24 1 15`.
    pub fn imprint(&self) -> String {
        format!("'{:02} {} {:02}", self.year % 100, self.month, self.day)
    }
}

/// Reads EXIF metadata and the raw orientation tag (1 when absent).
pub(crate) fn read(bytes: &[u8]) -> (PhotoMeta, u8) {
    let Ok(exif) = Reader::new().read_from_container(&mut Cursor::new(bytes)) else {
        return (PhotoMeta::default(), 1);
    };
    let field = |tag| exif.get_field(tag, In::PRIMARY).map(|f| &f.value);
    let text = |tag| field(tag).and_then(ascii).unwrap_or_default();
    let rational = |tag| match field(tag) {
        Some(Value::Rational(v)) => v.first().filter(|r| r.denom != 0).map(|r| r.to_f64()),
        _ => None,
    };

    let meta = PhotoMeta {
        make: text(Tag::Make),
        model: text(Tag::Model),
        lens: text(Tag::LensModel),
        focal_length: rational(Tag::FocalLength).filter(|v| *v > 0.0),
        f_number: rational(Tag::FNumber).filter(|v| *v > 0.0),
        exposure_time: rational(Tag::ExposureTime).filter(|v| *v > 0.0),
        iso: field(Tag::PhotographicSensitivity)
            .and_then(|v| v.get_uint(0))
            .filter(|v| *v > 0),
        taken_at: field(Tag::DateTimeOriginal)
            .or_else(|| field(Tag::DateTime))
            .and_then(ascii),
    };
    let orientation = field(Tag::Orientation)
        .and_then(|v| v.get_uint(0))
        .and_then(|v| u8::try_from(v).ok())
        .unwrap_or(1);
    (meta, orientation)
}

fn ascii(value: &Value) -> Option<String> {
    let Value::Ascii(parts) = value else { return None };
    let s = String::from_utf8_lossy(parts.first()?);
    let s = s.trim_matches(|c: char| c == '\0' || c.is_whitespace());
    (!s.is_empty()).then(|| s.to_owned())
}

/// Corporate suffixes stripped from `Make` before display.
const MAKE_NOISE: &[&str] = &[
    "corporation", "corp.", "corp", "company", "co.,", "co.", "ltd.", "ltd", "limited", "inc.",
    "inc", "imaging", "camera", "ag", "gmbh", "optical", "electric", "digital", "solutions",
    "eastman", ",",
];

impl PhotoMeta {
    /// Short manufacturer name, e.g. `NIKON CORPORATION` → `NIKON`.
    pub fn brand(&self) -> String {
        let words: Vec<&str> = self
            .make
            .split_whitespace()
            .filter(|w| !MAKE_NOISE.contains(&w.to_lowercase().as_str()))
            .collect();
        words.join(" ").trim_end_matches(',').to_owned()
    }

    /// Camera line: model, prefixed with the brand when the model does not already name it.
    pub fn camera(&self) -> String {
        let brand = self.brand();
        let model = self.model.trim();
        if model.is_empty() {
            return brand;
        }
        let first = brand.split_whitespace().next().unwrap_or("");
        if first.is_empty() || model.to_lowercase().contains(&first.to_lowercase()) {
            model.to_owned()
        } else {
            format!("{brand} {model}")
        }
    }

    /// Phone lenses (< 10 mm) keep one decimal: `5.7mm`, not `6mm`.
    pub fn focal(&self) -> Option<String> {
        self.focal_length.map(|v| format!("{}mm", trim_float(v, if v < 10.0 { 1 } else { 0 })))
    }

    pub fn aperture(&self) -> Option<String> {
        self.f_number.map(|v| format!("f/{}", trim_float(v, 1)))
    }

    pub fn shutter(&self) -> Option<String> {
        self.exposure_time.map(|t| {
            if t < 1.0 {
                format!("1/{}s", (1.0 / t).round())
            } else {
                format!("{}s", trim_float(t, 1))
            }
        })
    }

    pub fn iso_label(&self) -> Option<String> {
        self.iso.map(|v| format!("ISO {v}"))
    }

    /// Present exposure settings in display order: focal, aperture, shutter, ISO.
    pub fn exposure(&self) -> Vec<String> {
        [self.focal(), self.aperture(), self.shutter(), self.iso_label()]
            .into_iter()
            .flatten()
            .collect()
    }

    pub fn taken(&self) -> Option<TakenAt> {
        let s = self.taken_at.as_deref()?;
        let num = |range: std::ops::Range<usize>| s.get(range)?.parse::<u16>().ok();
        let taken = TakenAt {
            year: num(0..4)?,
            month: num(5..7)? as u8,
            day: num(8..10)? as u8,
            hour: num(11..13).unwrap_or(0) as u8,
            minute: num(14..16).unwrap_or(0) as u8,
        };
        (taken.year > 0 && (1..=12).contains(&taken.month) && (1..=31).contains(&taken.day))
            .then_some(taken)
    }
}

/// Rounds to `decimals` and drops a trailing `.0`.
fn trim_float(v: f64, decimals: usize) -> String {
    let s = format!("{v:.decimals$}");
    if s.contains('.') {
        s.trim_end_matches('0').trim_end_matches('.').to_owned()
    } else {
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn meta(make: &str, model: &str) -> PhotoMeta {
        PhotoMeta { make: make.into(), model: model.into(), ..Default::default() }
    }

    #[test]
    fn camera_line_does_not_repeat_brand() {
        assert_eq!(meta("NIKON CORPORATION", "NIKON Z 6").camera(), "NIKON Z 6");
        assert_eq!(meta("SONY", "ILCE-7M4").camera(), "SONY ILCE-7M4");
        assert_eq!(meta("Apple", "iPhone 15 Pro").camera(), "Apple iPhone 15 Pro");
        assert_eq!(
            meta("EASTMAN KODAK COMPANY", "KODAK P880 ZOOM DIGITAL CAMERA").camera(),
            "KODAK P880 ZOOM DIGITAL CAMERA"
        );
        assert_eq!(meta("FUJIFILM", "").camera(), "FUJIFILM");
        assert_eq!(meta("", "").camera(), "");
    }

    #[test]
    fn exposure_formatting() {
        let m = PhotoMeta {
            focal_length: Some(35.0),
            f_number: Some(2.0),
            exposure_time: Some(1.0 / 250.0),
            iso: Some(100),
            ..Default::default()
        };
        assert_eq!(m.exposure(), ["35mm", "f/2", "1/250s", "ISO 100"]);
        let slow = PhotoMeta { exposure_time: Some(2.5), f_number: Some(5.6), ..Default::default() };
        assert_eq!(slow.exposure(), ["f/5.6", "2.5s"]);
    }

    #[test]
    fn taken_at_rejects_blank_exif_dates() {
        let m = |s: &str| PhotoMeta { taken_at: Some(s.into()), ..Default::default() };
        assert_eq!(m("2024:01:15 14:30:00").taken().unwrap().dotted(), "2024.01.15 14:30");
        assert_eq!(m("2024:01:05 09:03:00").taken().unwrap().imprint(), "'24 1 05");
        assert!(m("0000:00:00 00:00:00").taken().is_none());
        assert!(m("    :  :     :  :  ").taken().is_none());
    }
}
