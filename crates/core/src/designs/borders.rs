//! Designs that surround the photo on every side.

use super::{join, rect, Ctx, Stack};
use crate::compose::{Backdrop, Layout, Shadow};
use crate::text::{Anchor, Font, Line, Style, N};

pub(super) fn polaroid(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let side = 4.6 * u;
    let bottom = 19.0 * u;
    let mut layout = Layout::framed(w, h, [side, side, side, bottom], "#fbfaf6");
    let out = &mut layout.under;
    // Hairline where the emulsion meets the card.
    rect(out, side - 0.1 * u, side - 0.1 * u, w + 0.2 * u, h + 0.2 * u, r##"fill="#e2ded5""##);

    let caption_text = if ctx.photographer.is_empty() { ctx.camera.clone() } else { ctx.photographer.to_owned() };
    let detail_top = if ctx.photographer.is_empty() { ctx.date() } else { ctx.camera.clone() };
    let inner = w;
    let caption = Line::new(Style::new(Font::Serif, 4.2 * u, 400, "#2a2a2a").italic(), caption_text).fit(inner * 0.56);
    let details = [
        Line::new(Style::new(Font::Sans, 1.35 * u, 600, "#6b6b6b"), detail_top).fit(inner * 0.38),
        Line::new(Style::new(Font::Sans, 1.25 * u, 400, "#9a9a9a"), ctx.exposure("\u{2002}")).fit(inner * 0.38),
    ];
    let cy = side + h + bottom * 0.46;
    caption.write(out, side + 0.8 * u, cy, Anchor::Start);
    super::write_block(out, &[&details[0], &details[1]], side + w - 0.8 * u, cy, Anchor::End);
    layout
}

pub(super) fn gallery(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let side = 8.0 * u;
    let max_w = w;
    let credit = match (ctx.photographer.is_empty(), ctx.year()) {
        (false, Some(year)) => format!("{}, {year}", ctx.photographer),
        (false, None) => ctx.photographer.to_owned(),
        (true, _) => ctx.meta.lens.clone(),
    };
    let title = if ctx.camera.is_empty() { ctx.brand.clone() } else { ctx.camera.clone() };
    let stack = Stack::new(None)
        .line(Line::new(Style::new(Font::Serif, 3.2 * u, 400, "#1d1d1d"), title), max_w)
        .gap(1.1 * u)
        .line(
            Line::new(Style::new(Font::Sans, 1.25 * u, 600, "#8b867d").spacing(0.32 * u), ctx.exposure("  ·  ").to_uppercase()),
            max_w,
        )
        .gap(0.9 * u)
        .line(Line::new(Style::new(Font::Serif, 1.8 * u, 400, "#5b5750").italic(), credit), max_w);
    let text_h = stack.height();
    let bottom = if text_h > 0.0 { text_h + 13.0 * u } else { side };

    let mut layout = Layout::framed(w, h, [side, side, side, bottom], "#f3f1ec");
    let out = &mut layout.under;
    // White core of the bevelled mat cut, then a faint shadow line on its outer edge.
    let bevel = 0.7 * u;
    rect(
        out,
        side - bevel,
        side - bevel,
        w + 2.0 * bevel,
        h + 2.0 * bevel,
        &format!(r##"fill="#ffffff" stroke="#dcd7cd" stroke-width="{}""##, N(0.08 * u)),
    );
    stack.write(out, side + w / 2.0, side + h + 5.0 * u + (bottom - 13.0 * u - text_h).max(0.0) / 2.0);
    layout
}

pub(super) fn frosted(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let side = 5.5 * u;
    let radius = 2.4 * u;
    let max_w = w;
    let stack = Stack::new(Some("#ffffff"))
        .mark(ctx, 16.0 * u, 3.4 * u, Line::new(Style::new(Font::Sans, 2.4 * u, 700, "#ffffff"), ctx.brand.to_uppercase()))
        .gap(1.3 * u)
        .line(Line::new(Style::new(Font::Sans, 1.9 * u, 600, "#ffffff"), &ctx.camera), max_w)
        .gap(0.5 * u)
        .line(
            Line::new(
                Style::new(Font::Sans, 1.35 * u, 400, "#ffffff").opacity(0.75),
                join(&[&ctx.exposure("\u{2002}"), ctx.photographer], "\u{2002}·\u{2002}"),
            ),
            max_w,
        );
    let text_h = stack.height();
    let bottom = if text_h > 0.0 { text_h + 9.0 * u } else { side };

    let mut layout = Layout::framed(w, h, [side, side, side, bottom], "#000000");
    layout.backdrop = Backdrop::Blurred;
    layout.radius = radius;
    layout.shadow = Some(Shadow { blur: 1.8 * u, offset_y: 0.9 * u, opacity: 0.55 });
    let out = &mut layout.under;
    let (cw, ch) = (w + 2.0 * side, h + side + bottom);
    rect(out, 0.0, 0.0, cw, ch, r##"fill="#000000" fill-opacity="0.28""##);
    stack.write(out, cw / 2.0, side + h + 4.0 * u + (bottom - 9.0 * u - text_h).max(0.0) / 2.0);
    layout
}
