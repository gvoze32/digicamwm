//! Designs that add a single strip under the photo.

use super::{block_width, join, rect, write_block, Ctx, Stack};
use crate::compose::Layout;
use crate::logo;
use crate::text::{Anchor, Font, Line, Span, Style, N};
use std::fmt::Write;

const SANS: Font = Font::Sans;

struct Palette {
    bg: &'static str,
    primary: &'static str,
    secondary: &'static str,
    rule: &'static str,
    /// Flat colour for logos that would vanish on `bg`.
    tint: Option<&'static str>,
}

const LIGHT: Palette = Palette {
    bg: "#ffffff",
    primary: "#141414",
    secondary: "#8a8a8a",
    rule: "#dadada",
    tint: None,
};

const DARK: Palette = Palette {
    bg: "#131313",
    primary: "#f4f4f4",
    secondary: "#8c8c8c",
    rule: "#3b3b3b",
    tint: Some("#f4f4f4"),
};

pub(super) fn classic(ctx: &Ctx) -> Layout {
    info_bar(ctx, &LIGHT)
}

pub(super) fn dark(ctx: &Ctx) -> Layout {
    info_bar(ctx, &DARK)
}

/// Camera + credit on the left; settings, a rule and the brand mark on the right. Falls back to
/// a centred stack when both sides do not fit next to each other (narrow portraits, long names).
fn info_bar(ctx: &Ctx, p: &Palette) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let title = Style::new(SANS, 2.3 * u, 600, p.primary);
    let small = Style::new(SANS, 1.55 * u, 400, p.secondary);
    let credit = if ctx.photographer.is_empty() {
        ctx.meta.lens.clone()
    } else {
        format!("Shot by {}", ctx.photographer)
    };
    let left = [Line::new(title, &ctx.camera), Line::new(small, credit.clone())];
    let right = [
        Line::new(Style::new(SANS, 1.8 * u, 600, p.primary), ctx.exposure("\u{2002}")),
        Line::new(small, ctx.date()),
    ];
    let brand = Line::new(Style::new(SANS, 2.4 * u, 700, p.primary), ctx.brand.to_uppercase());
    let mark = ctx.logo.map(|l| l.fit(15.0 * u, 3.6 * u));
    let mark_w = mark.map_or_else(|| brand.width(), |(lw, _)| lw);

    let pad = 3.6 * u;
    let rule_gap = 1.8 * u;
    let (left_w, right_w) = (block_width(&[&left[0], &left[1]]), block_width(&[&right[0], &right[1]]));
    let right_total = right_w + if mark_w > 0.0 && right_w > 0.0 { 2.0 * rule_gap } else { 0.0 } + mark_w;
    let fits = 2.0 * pad + left_w + 4.0 * u + right_total <= w;

    if !fits {
        let max_w = w - 2.0 * pad;
        let stack = Stack::new(p.tint)
            .mark(ctx, 18.0 * u, 4.2 * u, brand)
            .gap(1.8 * u)
            .line(left[0].clone(), max_w)
            .gap(0.5 * u)
            .line(right[0].clone(), max_w)
            .gap(0.3 * u)
            .line(Line::new(small, join(&[&ctx.date(), &credit], "\u{2003}")), max_w);
        let bar = (stack.height() + 7.0 * u).max(10.0 * u);
        let mut layout = Layout::framed(w, h, [0.0, 0.0, 0.0, bar], p.bg);
        stack.write(&mut layout.under, w / 2.0, h + (bar - stack.height()) / 2.0);
        return layout;
    }

    let bar = 10.0 * u;
    let cy = h + bar / 2.0;
    let mut layout = Layout::framed(w, h, [0.0, 0.0, 0.0, bar], p.bg);
    let out = &mut layout.under;
    write_block(out, &[&left[0], &left[1]], pad, cy, Anchor::Start);

    let mut x = w - pad;
    if mark_w > 0.0 {
        match (ctx.logo, mark) {
            (Some(logo), Some((lw, lh))) => {
                if let Some(hex) = p.tint {
                    out.push_str("<defs>");
                    logo::tint_filter(out, hex);
                    out.push_str("</defs>");
                }
                logo.svg(out, x - lw, cy - lh / 2.0, lw, lh, p.tint.is_some());
            }
            _ => brand.write(out, x, cy, Anchor::End),
        }
        x -= mark_w;
        if right_w > 0.0 {
            x -= rule_gap;
            let _ = write!(
                out,
                r#"<line x1="{x}" y1="{}" x2="{x}" y2="{}" stroke="{}" stroke-width="{}"/>"#,
                N(cy - 2.3 * u),
                N(cy + 2.3 * u),
                p.rule,
                N(0.13 * u),
                x = N(x),
            );
            x -= rule_gap;
        }
    }
    write_block(out, &[&right[0], &right[1]], x, cy, Anchor::End);
    layout
}

pub(super) fn minimal(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let body = Style::new(SANS, 1.9 * u, 400, "#1d1d1d");
    let quiet = Style::new(SANS, 1.9 * u, 300, "#9a9a9a");
    let fine = Style::new(SANS, 1.3 * u, 300, "#a5a5a5").spacing(0.06 * u);
    let max_w = w - 8.0 * u;
    let stack = Stack::new(None)
        .line(
            Line::of(vec![
                Span::new(body, &ctx.camera),
                Span::new(quiet, ctx.exposure("\u{2002}")).after(if ctx.camera.is_empty() { 0.0 } else { 1.6 * u }),
            ]),
            max_w,
        )
        .gap(0.7 * u)
        .line(Line::new(fine, join(&[&ctx.date(), ctx.photographer], "  ·  ")), max_w);
    let bar = (stack.height() + 6.0 * u).max(7.0 * u);
    let mut layout = Layout::framed(w, h, [0.0, 0.0, 0.0, bar], "#ffffff");
    stack.write(&mut layout.under, w / 2.0, h + (bar - stack.height()) / 2.0);
    layout
}

pub(super) fn simple(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let max_w = w - 8.0 * u;
    let model = Style::new(SANS, 1.6 * u, 400, "#4a4a4a").spacing(0.04 * u);
    let by = Style::new(SANS, 1.6 * u, 300, "#9a9a9a");
    let credit = if ctx.photographer.is_empty() { String::new() } else { format!("by {}", ctx.photographer) };
    let stack = Stack::new(None)
        .mark(ctx, 22.0 * u, 5.0 * u, Line::new(Style::new(SANS, 3.0 * u, 700, "#111111"), ctx.brand.to_uppercase()))
        .gap(1.5 * u)
        .line(
            Line::of(vec![Span::new(model, &ctx.camera), Span::new(by, credit).after(if ctx.camera.is_empty() { 0.0 } else { 1.0 * u })]),
            max_w,
        );
    let bar = (stack.height() + 7.0 * u).max(7.0 * u);
    let mut layout = Layout::framed(w, h, [0.0, 0.0, 0.0, bar], "#ffffff");
    stack.write(&mut layout.under, w / 2.0, h + (bar - stack.height()) / 2.0);
    layout
}

pub(super) fn micro(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    let bar = 4.6 * u;
    let cy = h + bar / 2.0;
    let pad = 2.4 * u;
    let strong = Style::new(SANS, 1.35 * u, 600, "#222222");
    let light = Style::new(SANS, 1.35 * u, 400, "#8c8c8c");
    let faint = Style::new(SANS, 1.2 * u, 400, "#a3a3a3");

    let mark = ctx.logo.map(|l| (l, l.fit(9.0 * u, 2.1 * u)));
    let text_x = pad + mark.map_or(0.0, |(_, (lw, _))| lw + 1.3 * u);
    let left = Line::of(vec![
        Span::new(strong, &ctx.camera),
        Span::new(light, ctx.exposure("\u{2002}")).after(if ctx.camera.is_empty() { 0.0 } else { 1.2 * u }),
    ]);
    let credit = if ctx.photographer.is_empty() { String::new() } else { format!("© {}", ctx.photographer) };
    let right = Line::of(vec![Span::new(faint, ctx.date()), Span::new(faint, credit).after(1.2 * u)]);

    let room = w - pad - text_x;
    let (left_w, right_w) = (left.width(), right.width());
    let show_right = left_w + right_w + 3.0 * u <= room;

    let mut layout = Layout::framed(w, h, [0.0, 0.0, 0.0, bar], "#ffffff");
    let out = &mut layout.under;
    if let Some((logo, (lw, lh))) = mark {
        logo.svg(out, pad, cy - lh / 2.0, lw, lh, false);
    }
    left.fit(room).write(out, text_x, cy, Anchor::Start);
    if show_right {
        right.write(out, w - pad, cy, Anchor::End);
    }
    layout
}

pub(super) fn vintage(ctx: &Ctx) -> Layout {
    let (w, h, u) = (ctx.w, ctx.h, ctx.u);
    const INK: &str = "#4b3a29";
    const FADED: &str = "#86704f";
    let mono = Font::Mono;
    let left = [
        Line::new(Style::new(mono, 1.9 * u, 700, INK).spacing(0.05 * u), ctx.camera.to_uppercase()),
        Line::new(Style::new(mono, 1.4 * u, 400, FADED), ctx.exposure("  ")),
    ];
    let date = ctx.meta.taken().map(|t| t.date()).unwrap_or_default();
    let credit = if ctx.photographer.is_empty() { String::new() } else { format!("by {}", ctx.photographer) };
    let right = [
        Line::new(Style::new(mono, 1.4 * u, 400, FADED), date),
        Line::new(Style::new(mono, 1.4 * u, 400, FADED), credit),
    ];

    let pad = 3.6 * u;
    let fits = 2.0 * pad + block_width(&[&left[0], &left[1]]) + 4.0 * u + block_width(&[&right[0], &right[1]]) <= w;
    let stack = (!fits).then(|| {
        let max_w = w - 2.0 * pad;
        Stack::new(None)
            .line(left[0].clone(), max_w)
            .gap(0.6 * u)
            .line(left[1].clone(), max_w)
            .gap(0.3 * u)
            .line(right[0].clone(), max_w)
            .gap(0.3 * u)
            .line(right[1].clone(), max_w)
    });
    let rules = 2.4 * u;
    let bar = stack.as_ref().map_or(11.0 * u, |s| (s.height() + 6.0 * u + rules).max(11.0 * u));

    let mut layout = Layout::framed(w, h, [0.0, 0.0, 0.0, bar], "#ece3cf");
    let out = &mut layout.under;
    // Paper grain over the strip only.
    let _ = write!(
        out,
        r#"<defs><filter id="grain" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="{}" numOctaves="2" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 0.3  0 0 0 0 0.24  0 0 0 0 0.16  0 0 0 0.55 0"/></filter></defs>"#,
        N(5.4 / u.max(1.0))
    );
    rect(out, 0.0, h, w, bar, r#"filter="url(#grain)" opacity="0.5""#);
    for (y, sw) in [(h + 1.0 * u, 0.16 * u), (h + 1.5 * u, 0.06 * u)] {
        let _ = write!(
            out,
            r#"<line x1="{}" y1="{y}" x2="{}" y2="{y}" stroke="{INK}" stroke-opacity="0.45" stroke-width="{}"/>"#,
            N(pad),
            N(w - pad),
            N(sw),
            y = N(y),
        );
    }
    let cy = h + rules / 2.0 + bar / 2.0;
    match stack {
        Some(stack) => stack.write(out, w / 2.0, cy - stack.height() / 2.0),
        None => {
            write_block(out, &[&left[0], &left[1]], pad, cy, Anchor::Start);
            write_block(out, &[&right[0], &right[1]], w - pad, cy, Anchor::End);
        }
    }
    layout
}
