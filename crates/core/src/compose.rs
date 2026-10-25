//! Turns a design [`Layout`] plus the photo into the final pixel canvas.

use crate::text::{parse_svg, N};
use crate::Error;
use image::RgbaImage;
use resvg::tiny_skia::{
    Color, FillRule, FilterQuality, Mask, Paint, PathBuilder, Pattern, Pixmap, PixmapPaint,
    PixmapRef, Rect, SpreadMode, Transform,
};

pub(crate) enum Backdrop {
    /// Flat `#rrggbb` fill.
    Color(&'static str),
    /// The photo itself, scaled to cover the canvas and heavily blurred.
    Blurred,
}

/// Canvas geometry produced by a design. SVG bodies use canvas pixel coordinates.
pub(crate) struct Layout {
    pub width: u32,
    pub height: u32,
    pub photo_x: u32,
    pub photo_y: u32,
    /// Corner radius applied to the photo, in pixels.
    pub radius: f64,
    /// Soft shadow cast by the photo onto the backdrop.
    pub shadow: Option<Shadow>,
    pub backdrop: Backdrop,
    /// Drawn between the backdrop and the photo.
    pub under: String,
    /// Drawn on top of the photo.
    pub over: String,
}

impl Layout {
    /// Photo at the origin with extra canvas on each side.
    pub fn framed(w: f64, h: f64, [left, top, right, bottom]: [f64; 4], bg: &'static str) -> Self {
        let [left, top, right, bottom] = [left, top, right, bottom].map(|v| v.round().max(0.0));
        Layout {
            width: (w + left + right) as u32,
            height: (h + top + bottom) as u32,
            photo_x: left as u32,
            photo_y: top as u32,
            radius: 0.0,
            shadow: None,
            backdrop: Backdrop::Color(bg),
            under: String::new(),
            over: String::new(),
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) struct Shadow {
    /// Gaussian sigma in pixels.
    pub blur: f64,
    pub offset_y: f64,
    pub opacity: f32,
}

/// `image` holds premultiplied RGBA (see [`crate::Photo`]).
pub(crate) fn rasterize(image: &RgbaImage, layout: &Layout) -> Result<Pixmap, Error> {
    let mut canvas = Pixmap::new(layout.width, layout.height)
        .ok_or_else(|| Error::Render(format!("invalid canvas {}x{}", layout.width, layout.height)))?;
    let photo = PixmapRef::from_bytes(image.as_raw(), image.width(), image.height())
        .ok_or_else(|| Error::Render("invalid photo buffer".into()))?;

    match layout.backdrop {
        Backdrop::Color(hex) => {
            let [r, g, b] = rgb(hex);
            canvas.fill(Color::from_rgba8(r, g, b, 255));
        }
        Backdrop::Blurred => draw_blurred(&mut canvas, image)?,
    }
    draw_svg(&mut canvas, &layout.under)?;
    let photo_rect = Rect::from_xywh(
        layout.photo_x as f32,
        layout.photo_y as f32,
        photo.width() as f32,
        photo.height() as f32,
    )
    .ok_or_else(|| Error::Render("empty photo".into()))?;
    if let Some(shadow) = layout.shadow {
        draw_shadow(&mut canvas, photo_rect, layout.radius as f32, shadow)?;
    }

    let mask = (layout.radius > 0.0)
        .then(|| {
            let mut mask = Mask::new(canvas.width(), canvas.height())?;
            mask.fill_path(&rounded_rect(photo_rect, layout.radius as f32)?, FillRule::Winding, true, Transform::identity());
            Some(mask)
        })
        .flatten();
    canvas.draw_pixmap(
        layout.photo_x as i32,
        layout.photo_y as i32,
        photo,
        &PixmapPaint::default(),
        Transform::identity(),
        mask.as_ref(),
    );

    draw_svg(&mut canvas, &layout.over)?;
    Ok(canvas)
}

/// Rasterises the photo's silhouette at 1/`k` scale, blurs it there, and stretches it back with
/// bicubic filtering: a large-radius shadow for the cost of a thumbnail.
fn draw_shadow(canvas: &mut Pixmap, rect: Rect, radius: f32, shadow: Shadow) -> Result<(), Error> {
    let k = (shadow.blur / 3.0).max(1.0) as f32;
    let pad = (shadow.blur as f32 * 3.0 / k).ceil() + 2.0;
    let (sw, sh) = ((rect.width() / k + 2.0 * pad).ceil() as u32, (rect.height() / k + 2.0 * pad).ceil() as u32);
    let mut small = Pixmap::new(sw, sh).ok_or_else(|| Error::Render("invalid shadow buffer".into()))?;
    let silhouette = Rect::from_xywh(pad, pad, rect.width() / k, rect.height() / k)
        .and_then(|r| rounded_rect(r, radius / k))
        .ok_or_else(|| Error::Render("invalid shadow shape".into()))?;
    let mut black = Paint::default();
    black.set_color(Color::BLACK);
    small.fill_path(&silhouette, &black, FillRule::Winding, Transform::identity(), None);

    let blurred = RgbaImage::from_raw(sw, sh, small.take())
        .map(|img| image::imageops::blur(&img, (shadow.blur / f64::from(k)) as f32))
        .ok_or_else(|| Error::Render("invalid shadow buffer".into()))?;
    let small = Pixmap::from_vec(blurred.into_raw(), resvg::tiny_skia::IntSize::from_wh(sw, sh).unwrap())
        .ok_or_else(|| Error::Render("invalid shadow buffer".into()))?;

    let origin = (rect.left() - pad * k, rect.top() - pad * k + shadow.offset_y as f32);
    let paint = Paint {
        shader: Pattern::new(
            small.as_ref(),
            SpreadMode::Pad,
            FilterQuality::Bilinear,
            shadow.opacity,
            Transform::from_row(k, 0.0, 0.0, k, origin.0, origin.1),
        ),
        ..Paint::default()
    };
    let area = Rect::from_xywh(origin.0, origin.1, sw as f32 * k, sh as f32 * k).unwrap();
    canvas.fill_rect(area, &paint, Transform::identity(), None);
    Ok(())
}

fn draw_svg(canvas: &mut Pixmap, body: &str) -> Result<(), Error> {
    if body.is_empty() {
        return Ok(());
    }
    let svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>"#,
        w = N(canvas.width().into()),
        h = N(canvas.height().into()),
    );
    let tree = parse_svg(&svg).map_err(|e| Error::Render(e.to_string()))?;
    resvg::render(&tree, Transform::identity(), &mut canvas.as_mut());
    Ok(())
}

fn draw_blurred(canvas: &mut Pixmap, photo: &RgbaImage) -> Result<(), Error> {
    let scale = 48.0 / f64::from(photo.width().max(photo.height()));
    let (tw, th) = (
        ((f64::from(photo.width()) * scale).round() as u32).max(1),
        ((f64::from(photo.height()) * scale).round() as u32).max(1),
    );
    let small = image::imageops::blur(&image::imageops::thumbnail(photo, tw, th), 4.0);
    let small = Pixmap::from_vec(small.into_raw(), resvg::tiny_skia::IntSize::from_wh(tw, th).unwrap())
        .ok_or_else(|| Error::Render("invalid blur buffer".into()))?;

    let (cw, ch) = (canvas.width() as f32, canvas.height() as f32);
    let k = (cw / tw as f32).max(ch / th as f32) * 1.08;
    let offset = ((cw - tw as f32 * k) / 2.0, (ch - th as f32 * k) / 2.0);
    let paint = Paint {
        shader: Pattern::new(
            small.as_ref(),
            SpreadMode::Pad,
            FilterQuality::Bilinear,
            1.0,
            Transform::from_row(k, 0.0, 0.0, k, offset.0, offset.1),
        ),
        ..Paint::default()
    };
    let rect = Rect::from_xywh(0.0, 0.0, cw, ch).unwrap();
    canvas.fill_rect(rect, &paint, Transform::identity(), None);
    Ok(())
}

fn rounded_rect(r: Rect, radius: f32) -> Option<resvg::tiny_skia::Path> {
    let radius = radius.min(r.width() / 2.0).min(r.height() / 2.0);
    let k = radius * (1.0 - 0.552_284_8);
    let (l, t, rt, b) = (r.left(), r.top(), r.right(), r.bottom());
    let mut p = PathBuilder::new();
    p.move_to(l + radius, t);
    p.line_to(rt - radius, t);
    p.cubic_to(rt - k, t, rt, t + k, rt, t + radius);
    p.line_to(rt, b - radius);
    p.cubic_to(rt, b - k, rt - k, b, rt - radius, b);
    p.line_to(l + radius, b);
    p.cubic_to(l + k, b, l, b - k, l, b - radius);
    p.line_to(l, t + radius);
    p.cubic_to(l, t + k, l + k, t, l + radius, t);
    p.close();
    p.finish()
}

/// `#rrggbb` → bytes. Designs only pass literal colours, so malformed input is a bug.
pub(crate) fn rgb(hex: &str) -> [u8; 3] {
    let channel = |i: usize| u8::from_str_radix(&hex[1 + i * 2..3 + i * 2], 16).expect("#rrggbb colour");
    [channel(0), channel(1), channel(2)]
}
