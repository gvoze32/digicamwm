//! Frame designs. Each design is a pure function from [`Ctx`] to a [`Layout`]; every length is a
//! multiple of `ctx.u` (1% of the photo's short side) so frames look the same at any resolution.

mod bars;
mod borders;
mod film;

use crate::compose::Layout;
use crate::logo::{self, Logo};
use crate::meta::PhotoMeta;
use crate::text::{Anchor, Line, N};
use serde::Serialize;
use std::fmt::Write;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub struct DesignInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub description: &'static str,
}

pub(crate) struct Design {
    info: DesignInfo,
    build: fn(&Ctx) -> Layout,
}

macro_rules! design {
    ($id:literal, $name:literal, $description:literal, $build:path) => {
        Design { info: DesignInfo { id: $id, name: $name, description: $description }, build: $build }
    };
}

static DESIGNS: &[Design] = &[
    design!("classic", "Classic", "White bar: camera on the left, settings and brand logo on the right", bars::classic),
    design!("dark", "Dark", "The classic layout on a near-black bar with a monochrome logo", bars::dark),
    design!("minimal", "Minimal", "One quiet centred line of camera and settings", bars::minimal),
    design!("simple", "Simple", "Centred brand logo with the camera model underneath", bars::simple),
    design!("micro", "Micro", "Hairline strip with everything on a single row", bars::micro),
    design!("vintage", "Vintage", "Grainy paper and typewriter type", bars::vintage),
    design!("polaroid", "Polaroid", "Instant-film border with a handwritten-style caption", borders::polaroid),
    design!("gallery", "Gallery", "Museum matte with a bevel and an exhibition label", borders::gallery),
    design!("frosted", "Frosted", "Rounded photo floating over its own blurred colours", borders::frosted),
    design!("film", "Film Strip", "35mm negative edges with sprocket holes and edge print", film::film),
    design!("datestamp", "Date Stamp", "Orange LCD date burned into the corner, like a 90s compact", film::datestamp),
];

/// All designs in display order.
pub fn designs() -> Vec<DesignInfo> {
    DESIGNS.iter().map(|d| d.info).collect()
}

pub(crate) fn find(id: &str) -> Option<&'static Design> {
    DESIGNS.iter().find(|d| d.info.id == id)
}

impl Design {
    pub fn layout(&self, meta: &PhotoMeta, photographer: &str, width: u32, height: u32) -> Layout {
        let (w, h) = (f64::from(width), f64::from(height));
        let ctx = Ctx {
            w,
            h,
            u: w.min(h) / 100.0,
            meta,
            photographer: photographer.trim(),
            camera: meta.camera(),
            brand: meta.brand(),
            logo: Logo::find(meta),
        };
        (self.build)(&ctx)
    }
}

/// Inputs every design sees.
pub(crate) struct Ctx<'a> {
    /// Photo size in pixels.
    pub w: f64,
    pub h: f64,
    /// 1% of the short side.
    pub u: f64,
    pub meta: &'a PhotoMeta,
    pub photographer: &'a str,
    pub camera: String,
    pub brand: String,
    pub logo: Option<&'static Logo>,
}

impl Ctx<'_> {
    pub fn exposure(&self, sep: &str) -> String {
        self.meta.exposure().join(sep)
    }

    pub fn date(&self) -> String {
        self.meta.taken().map(|t| t.dotted()).unwrap_or_default()
    }

    pub fn year(&self) -> Option<u16> {
        self.meta.taken().map(|t| t.year)
    }
}

/// Vertically stacked, horizontally centred rows (logo, text lines, gaps).
pub(crate) struct Stack {
    rows: Vec<Row>,
    tint: Option<&'static str>,
}

enum Row {
    Text(Line),
    Logo(&'static Logo, f64, f64),
    Gap(f64),
}

/// Line box height relative to font size.
const LEADING: f64 = 1.3;

impl Stack {
    /// `tint`: flat colour applied to the logo, for dark grounds.
    pub fn new(tint: Option<&'static str>) -> Self {
        Stack { rows: Vec::new(), tint }
    }

    /// Adds `line` (scaled to `max_w`) unless it is empty.
    pub fn line(mut self, line: Line, max_w: f64) -> Self {
        if !line.is_empty() {
            self.rows.push(Row::Text(line.fit(max_w)));
        }
        self
    }

    /// Space before the next row; collapses when nothing precedes or follows it.
    pub fn gap(mut self, v: f64) -> Self {
        if matches!(self.rows.last(), Some(Row::Text(_) | Row::Logo(..))) {
            self.rows.push(Row::Gap(v));
        }
        self
    }

    /// The brand logo in a `max_w` × `max_h` box, or `fallback` text when no logo is known.
    pub fn mark(mut self, ctx: &Ctx, max_w: f64, max_h: f64, fallback: Line) -> Self {
        match ctx.logo {
            Some(logo) => {
                let (w, h) = logo.fit(max_w, max_h);
                self.rows.push(Row::Logo(logo, w, h));
                self
            }
            None => self.line(fallback, max_w),
        }
    }

    fn trimmed(&self) -> &[Row] {
        match self.rows.last() {
            Some(Row::Gap(_)) => &self.rows[..self.rows.len() - 1],
            _ => &self.rows,
        }
    }

    pub fn height(&self) -> f64 {
        self.trimmed()
            .iter()
            .map(|row| match row {
                Row::Text(line) => line.size() * LEADING,
                Row::Logo(_, _, h) => *h,
                Row::Gap(v) => *v,
            })
            .sum()
    }

    pub fn write(&self, out: &mut String, cx: f64, top: f64) {
        if let (Some(hex), true) = (self.tint, self.trimmed().iter().any(|r| matches!(r, Row::Logo(..)))) {
            out.push_str("<defs>");
            logo::tint_filter(out, hex);
            out.push_str("</defs>");
        }
        let mut y = top;
        for row in self.trimmed() {
            match row {
                Row::Text(line) => {
                    let h = line.size() * LEADING;
                    line.write(out, cx, y + h / 2.0, Anchor::Middle);
                    y += h;
                }
                Row::Logo(logo, w, h) => {
                    logo.svg(out, cx - w / 2.0, y, *w, *h, self.tint.is_some());
                    y += h;
                }
                Row::Gap(v) => y += v,
            }
        }
    }
}

/// Up to two lines forming one side of a bar, centred vertically on `cy`.
pub(crate) fn write_block(out: &mut String, lines: &[&Line], x: f64, cy: f64, anchor: Anchor) {
    let lines: Vec<&&Line> = lines.iter().filter(|l| !l.is_empty()).collect();
    match lines.as_slice() {
        [] => {}
        [one] => one.write(out, x, cy, anchor),
        [first, rest @ ..] => {
            let mut sizes = vec![first.size()];
            sizes.extend(rest.iter().map(|l| l.size()));
            // Distance between successive line centres.
            let steps: Vec<f64> = sizes.windows(2).map(|p| (p[0] + p[1]) * 0.62).collect();
            let mut y = cy - steps.iter().sum::<f64>() / 2.0;
            first.write(out, x, y, anchor);
            for (line, step) in rest.iter().zip(steps) {
                y += step;
                line.write(out, x, y, anchor);
            }
        }
    }
}

/// Widest of `lines`.
pub(crate) fn block_width(lines: &[&Line]) -> f64 {
    lines.iter().map(|l| l.width()).fold(0.0, f64::max)
}

pub(crate) fn rect(out: &mut String, x: f64, y: f64, w: f64, h: f64, attrs: &str) {
    let _ = write!(out, r#"<rect x="{}" y="{}" width="{}" height="{}" {attrs}/>"#, N(x), N(y), N(w), N(h));
}

/// Joins the non-empty parts with `sep`.
pub(crate) fn join(parts: &[&str], sep: &str) -> String {
    parts.iter().filter(|p| !p.is_empty()).copied().collect::<Vec<_>>().join(sep)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids_are_unique() {
        let mut ids: Vec<_> = designs().iter().map(|d| d.id).collect();
        ids.sort_unstable();
        ids.dedup();
        assert_eq!(ids.len(), DESIGNS.len());
    }
}
