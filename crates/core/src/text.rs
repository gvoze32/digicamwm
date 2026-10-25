//! Embedded fonts, SVG text emission and text measurement.

use resvg::usvg::fontdb::{Database, Source};
use resvg::usvg::{Options, Tree};
use std::fmt::{self, Display, Write};
use std::sync::{Arc, LazyLock};

const FONTS: &[&[u8]] = &[
    include_bytes!("../fonts/Inter-Light.ttf"),
    include_bytes!("../fonts/Inter-Regular.ttf"),
    include_bytes!("../fonts/Inter-SemiBold.ttf"),
    include_bytes!("../fonts/Inter-Bold.ttf"),
    include_bytes!("../fonts/JetBrainsMono-Regular.ttf"),
    include_bytes!("../fonts/JetBrainsMono-Bold.ttf"),
    include_bytes!("../fonts/DMSerifDisplay-Regular.ttf"),
    include_bytes!("../fonts/DMSerifDisplay-Italic.ttf"),
    include_bytes!("../fonts/DSEG7Classic-Bold.ttf"),
];

static FONT_DB: LazyLock<Arc<Database>> = LazyLock::new(|| {
    let mut db = Database::new();
    for font in FONTS {
        db.load_font_source(Source::Binary(Arc::new(*font)));
    }
    #[cfg(feature = "system-fonts")]
    db.load_system_fonts();
    db.set_sans_serif_family(Font::Sans.family());
    db.set_serif_family(Font::Serif.family());
    db.set_monospace_family(Font::Mono.family());
    Arc::new(db)
});

pub(crate) fn parse_svg(svg: &str) -> Result<Tree, resvg::usvg::Error> {
    let opt = Options {
        fontdb: FONT_DB.clone(),
        font_family: Font::Sans.family().to_owned(),
        ..Options::default()
    };
    Tree::from_str(svg, &opt)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Font {
    Sans,
    Mono,
    Serif,
    Lcd,
}

impl Font {
    fn family(self) -> &'static str {
        match self {
            Font::Sans => "Inter",
            Font::Mono => "JetBrains Mono",
            Font::Serif => "DM Serif Display",
            Font::Lcd => "DSEG7 Classic",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Anchor {
    Start,
    Middle,
    End,
}

impl Anchor {
    fn svg(self) -> &'static str {
        match self {
            Anchor::Start => "start",
            Anchor::Middle => "middle",
            Anchor::End => "end",
        }
    }
}

/// Typographic style for one run of text. `size` and `spacing` are in canvas pixels.
#[derive(Debug, Clone, Copy)]
pub(crate) struct Style {
    pub font: Font,
    pub size: f64,
    pub weight: u16,
    pub fill: &'static str,
    pub opacity: f64,
    pub spacing: f64,
    pub italic: bool,
}

impl Style {
    pub fn new(font: Font, size: f64, weight: u16, fill: &'static str) -> Self {
        Style { font, size, weight, fill, opacity: 1.0, spacing: 0.0, italic: false }
    }

    pub fn opacity(mut self, opacity: f64) -> Self {
        self.opacity = opacity;
        self
    }

    pub fn spacing(mut self, spacing: f64) -> Self {
        self.spacing = spacing;
        self
    }

    pub fn italic(mut self) -> Self {
        self.italic = true;
        self
    }

    pub fn sized(mut self, size: f64) -> Self {
        self.spacing *= size / self.size;
        self.size = size;
        self
    }

    fn attrs(&self, out: &mut String) {
        let _ = write!(
            out,
            r#" font-family="{}" font-size="{}" font-weight="{}" fill="{}""#,
            self.font.family(),
            N(self.size),
            self.weight,
            self.fill
        );
        if self.opacity < 1.0 {
            let _ = write!(out, r#" fill-opacity="{}""#, N(self.opacity));
        }
        if self.spacing != 0.0 {
            let _ = write!(out, r#" letter-spacing="{}""#, N(self.spacing));
        }
        if self.italic {
            out.push_str(r#" font-style="italic""#);
        }
    }
}

/// A styled run inside a single line; `gap` is horizontal space before it.
#[derive(Debug, Clone)]
pub(crate) struct Span {
    pub style: Style,
    pub text: String,
    pub gap: f64,
}

impl Span {
    pub fn new(style: Style, text: impl Into<String>) -> Self {
        Span { style, text: text.into(), gap: 0.0 }
    }

    pub fn after(mut self, gap: f64) -> Self {
        self.gap = gap;
        self
    }
}

/// One line of text, vertically centred on `y`.
#[derive(Debug, Clone)]
pub(crate) struct Line {
    pub spans: Vec<Span>,
}

impl Line {
    pub fn new(style: Style, text: impl Into<String>) -> Self {
        Line { spans: vec![Span::new(style, text)] }
    }

    pub fn of(spans: Vec<Span>) -> Self {
        Line { spans: spans.into_iter().filter(|s| !s.text.is_empty()).collect() }
    }

    pub fn is_empty(&self) -> bool {
        self.spans.iter().all(|s| s.text.is_empty())
    }

    /// Tallest font size in the line.
    pub fn size(&self) -> f64 {
        self.spans.iter().map(|s| s.style.size).fold(0.0, f64::max)
    }

    /// Rendered ink width in pixels.
    pub fn width(&self) -> f64 {
        if self.is_empty() {
            return 0.0;
        }
        let mut svg = String::from(r#"<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1">"#);
        self.write(&mut svg, 0.0, 0.0, Anchor::Start);
        svg.push_str("</svg>");
        parse_svg(&svg)
            .map(|tree| f64::from(tree.root().abs_bounding_box().width()))
            .unwrap_or(0.0)
    }

    /// Scales every span down so the line fits `max_width`. Never enlarges.
    pub fn fit(mut self, max_width: f64) -> Self {
        let width = self.width();
        if width > max_width && width > 0.0 {
            let k = max_width / width;
            for span in &mut self.spans {
                span.style = span.style.sized(span.style.size * k);
                span.gap *= k;
            }
        }
        self
    }

    pub fn write(&self, out: &mut String, x: f64, y: f64, anchor: Anchor) {
        if self.is_empty() {
            return;
        }
        let _ = write!(
            out,
            r#"<text x="{}" y="{}" text-anchor="{}" dominant-baseline="central">"#,
            N(x),
            N(y),
            anchor.svg()
        );
        for span in &self.spans {
            out.push_str("<tspan");
            span.style.attrs(out);
            if span.gap != 0.0 {
                let _ = write!(out, r#" dx="{}""#, N(span.gap));
            }
            out.push('>');
            escape_into(out, &span.text);
            out.push_str("</tspan>");
        }
        out.push_str("</text>");
    }
}

pub(crate) fn escape_into(out: &mut String, s: &str) {
    for c in s.chars() {
        match c {
            '&' => out.push_str("&amp;"),
            '<' => out.push_str("&lt;"),
            '>' => out.push_str("&gt;"),
            '"' => out.push_str("&quot;"),
            c if c.is_control() => {}
            c => out.push(c),
        }
    }
}

/// Compact number formatting for SVG attributes.
#[derive(Clone, Copy)]
pub(crate) struct N(pub f64);

impl Display for N {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let v = (self.0 * 100.0).round() / 100.0;
        if v == v.trunc() {
            write!(f, "{}", v as i64)
        } else {
            write!(f, "{v}")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn escapes_markup_in_user_text() {
        let mut out = String::new();
        escape_into(&mut out, "Tom & \"Jerry\" <b>\u{7}");
        assert_eq!(out, "Tom &amp; &quot;Jerry&quot; &lt;b&gt;");
    }

    #[test]
    fn measured_width_scales_with_size_and_fit_caps_it() {
        let style = Style::new(Font::Sans, 40.0, 400, "#000");
        let small = Line::new(style, "SONY ILCE-7M4").width();
        let big = Line::new(style.sized(80.0), "SONY ILCE-7M4").width();
        assert!(small > 100.0, "text must be measured with embedded fonts, got {small}");
        assert!((big / small - 2.0).abs() < 0.05);
        let fitted = Line::new(style.sized(80.0), "SONY ILCE-7M4").fit(small).width();
        assert!((fitted - small).abs() < 2.0);
    }
}
