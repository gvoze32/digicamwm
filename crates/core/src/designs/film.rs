//! Analogue-film looks.

use super::{join, Ctx};
use crate::compose::Layout;
use crate::text::{Anchor, Font, Line, Style, N};
use std::fmt::Write;

const EDGE_INK: &str = "#f0a24a";

/// 35mm negative: dark base, sprocket holes along both long edges, orange edge print.
pub(super) fn film(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let band = 11.0 * u;
    let side = 3.0 * u;
    let mut layout = Layout::framed(w, h, [side, band, side, band], "#121110");
    let out = &mut layout.under;
    let total_w = w + 2.0 * side;
    let total_h = h + 2.0 * band;

    // Perforations: ~2:3 holes on a fixed pitch, centred across the strip.
    let (hole_w, hole_h, pitch) = (2.6 * u, 3.6 * u, 6.2 * u);
    let count = ((total_w - pitch) / pitch).floor().max(1.0);
    let start = (total_w - count * pitch) / 2.0 + (pitch - hole_w) / 2.0;
    let hole_cy = band * 0.36;
    for y in [hole_cy, total_h - hole_cy] {
        for i in 0..count as usize {
            let _ = write!(
                out,
                r##"<rect x="{}" y="{}" width="{}" height="{}" rx="{r}" ry="{r}" fill="#e6e0d3"/>"##,
                N(start + i as f64 * pitch),
                N(y - hole_h / 2.0),
                N(hole_w),
                N(hole_h),
                r = N(0.5 * u),
            );
        }
    }

    let ink = Style::new(Font::Mono, 1.35 * u, 700, EDGE_INK).spacing(0.12 * u);
    let room = w / 2.0 - 2.0 * u;
    let line = |text: String| Line::new(ink, text).fit(room);
    let settings = join(
        &[&ctx.meta.focal().unwrap_or_default(), &ctx.meta.aperture().unwrap_or_default(), &ctx.meta.shutter().unwrap_or_default()],
        "  ",
    );
    let top_y = band * 0.8;
    let bottom_y = total_h - band * 0.8;
    let (left_x, right_x) = (side + 1.0 * u, side + w - 1.0 * u);
    line(ctx.camera.to_uppercase()).write(out, left_x, top_y, Anchor::Start);
    line(ctx.meta.iso_label().unwrap_or_default()).write(out, right_x, top_y, Anchor::End);
    line(settings).write(out, left_x, bottom_y, Anchor::Start);
    let credit = if ctx.photographer.is_empty() { String::new() } else { format!("© {}", ctx.photographer.to_uppercase()) };
    line(join(&[&credit, &ctx.meta.taken().map(|t| t.date()).unwrap_or_default()], "   ")).write(out, right_x, bottom_y, Anchor::End);
    layout
}

/// No border: an LCD-style date imprinted in the lower-right corner of the photo.
pub(super) fn datestamp(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let mut layout = Layout::framed(w, h, [0.0; 4], "#000000");
    let Some(taken) = ctx.meta.taken() else { return layout };
    let style = Style::new(Font::Lcd, 3.4 * u, 700, "#ff9a3c").spacing(0.2 * u);
    let digits = Line::new(style, taken.imprint());
    let (x, y) = (w - 5.0 * u, h - 5.0 * u);
    let out = &mut layout.over;
    let _ = write!(
        out,
        r#"<defs><filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="{}"/></filter></defs><g filter="url(#glow)" opacity="0.85">"#,
        N(0.45 * u)
    );
    Line::new(Style { fill: "#ff5a00", ..style }, taken.imprint()).write(out, x, y, Anchor::End);
    out.push_str("</g>");
    digits.write(out, x, y, Anchor::End);
    layout
}
