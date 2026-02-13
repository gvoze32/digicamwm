use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct DesignInfo {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(rename = "thumbnailPath")]
    pub thumbnail_path: String,
}

pub fn get_design_list() -> Vec<DesignInfo> {
    vec![
        DesignInfo {
            id: "classic".into(),
            name: "Classic".into(),
            description: "Clean white frame with logo and camera information".into(),
            thumbnail_path: "assets/designs/classic-landscape.jpg".into(),
        },
        DesignInfo {
            id: "dark".into(),
            name: "Dark".into(),
            description: "Elegant dark frame for your photos".into(),
            thumbnail_path: "assets/designs/dark-landscape.jpg".into(),
        },
        DesignInfo {
            id: "minimal".into(),
            name: "Minimal".into(),
            description: "Sleek, modern design with minimal elements".into(),
            thumbnail_path: "assets/designs/minimal-landscape.jpg".into(),
        },
        DesignInfo {
            id: "vintage".into(),
            name: "Vintage".into(),
            description: "Classic film-inspired border".into(),
            thumbnail_path: "assets/designs/vintage-landscape.jpg".into(),
        },
        DesignInfo {
            id: "simple".into(),
            name: "Simple".into(),
            description: "Minimalist design with just camera logo and model".into(),
            thumbnail_path: "assets/designs/simple-landscape.jpg".into(),
        },
        DesignInfo {
            id: "micro".into(),
            name: "Micro".into(),
            description: "Ultra-thin frame with minimal information".into(),
            thumbnail_path: "assets/designs/micro-landscape.jpg".into(),
        },
    ]
}

pub struct PortraitParams {
    pub image_width: u32,
    pub frame_height: f64,
    pub center_x: f64,
    pub logo_element: String,
    pub camera_info: String,
    pub exposure_info: String,
    pub date_time_string: String,
    pub font_size: f64,
    pub small_font_size: f64,
    pub photographer_name: String,
}

pub struct LandscapeParams {
    pub image_width: u32,
    pub frame_height: f64,
    pub center_y: f64,
    pub text_adjustment: f64,
    #[allow(dead_code)]
    pub logo_adjustment: f64,
    pub logo_element: String,
    pub camera_info: String,
    pub exposure_info: String,
    pub date_time_string: String,
    pub left_text_x: f64,
    pub right_text_x: f64,
    pub exposure_y: f64,
    pub date_y: f64,
    pub divider_x: f64,
    pub adjusted_divider_top: f64,
    pub adjusted_divider_bottom: f64,
    pub font_size: f64,
    pub small_font_size: f64,
    pub photographer_name: String,
}

pub fn render_portrait(design_id: &str, p: &PortraitParams) -> String {
    match design_id {
        "classic" => render_classic_portrait(p),
        "dark" => render_dark_portrait(p),
        "minimal" => render_minimal_portrait(p),
        "vintage" => render_vintage_portrait(p),
        "simple" => render_simple_portrait(p),
        "micro" => render_micro_portrait(p),
        _ => render_classic_portrait(p),
    }
}

pub fn render_landscape(design_id: &str, p: &LandscapeParams) -> String {
    match design_id {
        "classic" => render_classic_landscape(p),
        "dark" => render_dark_landscape(p),
        "minimal" => render_minimal_landscape(p),
        "vintage" => render_vintage_landscape(p),
        "simple" => render_simple_landscape(p),
        "micro" => render_micro_landscape(p),
        _ => render_classic_landscape(p),
    }
}

// ─── Classic ──────────────────────────────────────────

fn render_classic_portrait(p: &PortraitParams) -> String {
    let fh = p.frame_height;
    let total_h = (fh * 2.0) as u32;
    let camera_y = fh * 0.4;
    let exposure_y = fh * 1.4;
    let date_y = fh * 1.8;

    let date_display = if !p.photographer_name.is_empty() {
        format!("{} | Taken by {}", p.date_time_string, p.photographer_name)
    } else {
        p.date_time_string.clone()
    };

    format!(
        r##"<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1.0" />
      <stop offset="100%" style="stop-color:#F8F8F8;stop-opacity:1.0" />
    </linearGradient>
  </defs>
  <rect width="{w}" height="{h}" fill="url(#grad)"/>
  <text x="{cx}" y="{cy}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#111111" text-anchor="middle" dominant-baseline="middle">{camera}</text>
  {logo}
  <text x="{cx}" y="{ey}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="700" fill="#666666" text-anchor="middle" dominant-baseline="middle">{exposure}</text>
  <text x="{cx}" y="{dy}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="700" fill="#666666" text-anchor="middle" dominant-baseline="middle">{date}</text>
</svg>"##,
        w = p.image_width,
        h = total_h,
        cx = p.center_x,
        cy = camera_y,
        fs = p.font_size,
        camera = p.camera_info,
        logo = p.logo_element,
        ey = exposure_y,
        sfs = p.small_font_size,
        exposure = p.exposure_info,
        dy = date_y,
        date = date_display,
    )
}

fn render_classic_landscape(p: &LandscapeParams) -> String {
    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="500" fill="#333333" dominant-baseline="central">Taken by {name}</text>"##,
            x = p.left_text_x,
            y = p.center_y + p.text_adjustment + p.font_size * 0.9,
            fs = p.small_font_size,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    let exposure_el = if !p.exposure_info.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#333333" text-anchor="end" dominant-baseline="central">{info}</text>"##,
            x = p.right_text_x, y = p.exposure_y, fs = p.small_font_size, info = p.exposure_info,
        )
    } else {
        String::new()
    };

    let date_el = if !p.date_time_string.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#666666" text-anchor="end" dominant-baseline="central">{date}</text>"##,
            x = p.right_text_x, y = p.date_y, fs = p.small_font_size, date = p.date_time_string,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{fh}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#FFFFFF;stop-opacity:1.0" />
      <stop offset="100%" style="stop-color:#F8F8F8;stop-opacity:1.0" />
    </linearGradient>
  </defs>
  <rect width="{w}" height="{fh}" fill="url(#grad)"/>
  <text x="{ltx}" y="{cty}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#111111" dominant-baseline="central" letter-spacing="0.5">{camera}</text>
  {photographer}
  {logo}
  <line x1="{dx}" y1="{dt}" x2="{dx}" y2="{db}" stroke="#CCCCCC" stroke-width="2"/>
  {exposure_el}
  {date_el}
</svg>"##,
        w = p.image_width,
        fh = p.frame_height as u32,
        ltx = p.left_text_x,
        cty = p.center_y + p.text_adjustment,
        fs = p.font_size,
        camera = p.camera_info,
        photographer = photographer_el,
        logo = p.logo_element,
        dx = p.divider_x,
        dt = p.adjusted_divider_top,
        db = p.adjusted_divider_bottom,
        exposure_el = exposure_el,
        date_el = date_el,
    )
}

// ─── Dark ─────────────────────────────────────────────

fn render_dark_portrait(p: &PortraitParams) -> String {
    let fh = p.frame_height;
    let total_h = (fh * 2.0) as u32;
    let camera_y = fh * 0.4;
    let exposure_y = fh * 1.4;
    let date_y = fh * 1.8;

    let date_display = if !p.photographer_name.is_empty() {
        format!("{} | Taken by {}", p.date_time_string, p.photographer_name)
    } else {
        p.date_time_string.clone()
    };

    format!(
        r##"<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#222222;stop-opacity:1.0" />
      <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1.0" />
    </linearGradient>
  </defs>
  <rect width="{w}" height="{h}" fill="url(#grad)"/>
  <text x="{cx}" y="{cy}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle">{camera}</text>
  {logo}
  <text x="{cx}" y="{ey}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="700" fill="#AAAAAA" text-anchor="middle" dominant-baseline="middle">{exposure}</text>
  <text x="{cx}" y="{dy}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="700" fill="#888888" text-anchor="middle" dominant-baseline="middle">{date}</text>
</svg>"##,
        w = p.image_width,
        h = total_h,
        cx = p.center_x,
        cy = camera_y,
        fs = p.font_size,
        camera = p.camera_info,
        logo = p.logo_element,
        ey = exposure_y,
        sfs = p.small_font_size,
        exposure = p.exposure_info,
        dy = date_y,
        date = date_display,
    )
}

fn render_dark_landscape(p: &LandscapeParams) -> String {
    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="500" fill="#AAAAAA" dominant-baseline="central">Taken by {name}</text>"##,
            x = p.left_text_x,
            y = p.center_y + p.text_adjustment + p.font_size * 0.9,
            fs = p.small_font_size,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    let exposure_el = if !p.exposure_info.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#AAAAAA" text-anchor="end" dominant-baseline="central">{info}</text>"##,
            x = p.right_text_x, y = p.exposure_y, fs = p.small_font_size, info = p.exposure_info,
        )
    } else {
        String::new()
    };

    let date_el = if !p.date_time_string.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#888888" text-anchor="end" dominant-baseline="central">{date}</text>"##,
            x = p.right_text_x, y = p.date_y, fs = p.small_font_size, date = p.date_time_string,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{fh}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#222222;stop-opacity:1.0" />
      <stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1.0" />
    </linearGradient>
  </defs>
  <rect width="{w}" height="{fh}" fill="url(#grad)"/>
  <text x="{ltx}" y="{cty}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="700" fill="#FFFFFF" dominant-baseline="central" letter-spacing="0.5">{camera}</text>
  {photographer}
  {logo}
  <line x1="{dx}" y1="{dt}" x2="{dx}" y2="{db}" stroke="#444444" stroke-width="2"/>
  {exposure_el}
  {date_el}
</svg>"##,
        w = p.image_width,
        fh = p.frame_height as u32,
        ltx = p.left_text_x,
        cty = p.center_y + p.text_adjustment,
        fs = p.font_size,
        camera = p.camera_info,
        photographer = photographer_el,
        logo = p.logo_element,
        dx = p.divider_x,
        dt = p.adjusted_divider_top,
        db = p.adjusted_divider_bottom,
        exposure_el = exposure_el,
        date_el = date_el,
    )
}

// ─── Minimal ──────────────────────────────────────────

fn render_minimal_portrait(p: &PortraitParams) -> String {
    let fh = p.frame_height;
    let total_h = (fh * 2.0) as u32;

    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{cx}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#999999" text-anchor="middle" dominant-baseline="middle">Taken by {name}</text>"##,
            cx = p.center_x,
            y = fh * 1.8,
            fs = p.small_font_size * 0.9,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{w}" height="{h}" fill="#FFFFFF"/>
  <line x1="0" y1="0" x2="{w}" y2="0" stroke="#EEEEEE" stroke-width="2"/>
  <text x="{cx}" y="{cy}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#333333" text-anchor="middle" dominant-baseline="middle">{camera}</text>
  <text x="{cx}" y="{iy}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="300" fill="#999999" text-anchor="middle" dominant-baseline="middle">{exposure} · {date}</text>
  {photographer}
</svg>"##,
        w = p.image_width,
        h = total_h,
        cx = p.center_x,
        cy = fh * 0.5,
        fs = p.font_size,
        camera = p.camera_info,
        iy = fh * 1.5,
        sfs = p.small_font_size,
        exposure = p.exposure_info,
        date = p.date_time_string,
        photographer = photographer_el,
    )
}

fn render_minimal_landscape(p: &LandscapeParams) -> String {
    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#999999" text-anchor="end" dominant-baseline="central">Taken by {name}</text>"##,
            x = p.image_width as f64 - 20.0,
            y = p.center_y + 80.0,
            fs = p.small_font_size,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{fh}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{w}" height="{fh}" fill="#FFFFFF"/>
  <line x1="0" y1="0" x2="{w}" y2="0" stroke="#EEEEEE" stroke-width="2"/>
  <text x="{ltx}" y="{cy}" font-family="Arial, sans-serif" font-size="{cfs}" font-weight="300" fill="#333333" dominant-baseline="central">{camera}</text>
  {photographer}
  <text x="{ltx}" y="{ey}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="300" fill="#999999" dominant-baseline="central">{exposure} · {date}</text>
</svg>"##,
        w = p.image_width,
        fh = p.frame_height as u32,
        ltx = p.left_text_x,
        cy = p.center_y - 5.0,
        cfs = p.small_font_size * 1.2,
        camera = p.camera_info,
        photographer = photographer_el,
        ey = p.center_y + 80.0,
        sfs = p.small_font_size,
        exposure = p.exposure_info,
        date = p.date_time_string,
    )
}

// ─── Vintage ──────────────────────────────────────────

const GRAIN_PATTERN: &str = "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";

fn render_vintage_portrait(p: &PortraitParams) -> String {
    let fh = p.frame_height;
    let total_h = (fh * 2.0) as u32;
    let camera_y = fh * 0.4;
    let exposure_y = fh * 0.7;
    let date_y = fh * 1.8;

    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Courier, monospace" font-size="{fs}" font-weight="400" fill="#91785E" text-anchor="end" dominant-baseline="middle">Taken by {name}</text>"##,
            x = p.image_width as f64 - 20.0,
            y = fh * 1.6,
            fs = p.small_font_size * 0.8,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100">
      <image href="data:image/png;base64,{grain}" x="0" y="0" width="100" height="100" />
    </pattern>
  </defs>
  <rect width="{w}" height="{h}" fill="#F8F5E9"/>
  <rect width="{w}" height="{h}" fill="url(#grain)" opacity="0.1"/>
  <text x="20" y="{cy}" font-family="Courier, monospace" font-size="{fs}" font-weight="700" fill="#70573B">{camera}</text>
  <text x="20" y="{ey}" font-family="Courier, monospace" font-size="{sfs}" font-weight="400" fill="#91785E">{exposure}</text>
  <text x="{rx}" y="{dy}" font-family="Courier, monospace" font-size="{dsfs}" font-weight="400" fill="#91785E" text-anchor="end">{date}</text>
  {photographer}
</svg>"##,
        w = p.image_width,
        h = total_h,
        grain = GRAIN_PATTERN,
        cy = camera_y,
        fs = p.font_size,
        camera = p.camera_info,
        ey = exposure_y,
        sfs = p.small_font_size,
        exposure = p.exposure_info,
        rx = p.image_width as f64 - 20.0,
        dy = date_y,
        dsfs = p.small_font_size * 0.8,
        date = p.date_time_string,
        photographer = photographer_el,
    )
}

fn render_vintage_landscape(p: &LandscapeParams) -> String {
    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Courier, monospace" font-size="{fs}" font-weight="400" fill="#91785E" text-anchor="end">Taken by {name}</text>"##,
            x = p.image_width as f64 - 20.0,
            y = p.center_y + 70.0,
            fs = p.small_font_size * 0.8,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{fh}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grain" patternUnits="userSpaceOnUse" width="100" height="100">
      <image href="data:image/png;base64,{grain}" x="0" y="0" width="100" height="100" />
    </pattern>
  </defs>
  <rect width="{w}" height="{fh}" fill="#F8F5E9"/>
  <rect width="{w}" height="{fh}" fill="url(#grain)" opacity="0.1"/>
  <text x="20" y="{cy1}" font-family="Courier, monospace" font-size="{cfs}" font-weight="700" fill="#70573B">{camera}</text>
  {photographer}
  <text x="20" y="{ey}" font-family="Courier, monospace" font-size="{sfs}" font-weight="400" fill="#91785E">{exposure}</text>
  <text x="{rx}" y="{dcy}" font-family="Courier, monospace" font-size="{dsfs}" font-weight="400" fill="#91785E" text-anchor="end">{date}</text>
</svg>"##,
        w = p.image_width,
        fh = p.frame_height as u32,
        grain = GRAIN_PATTERN,
        cy1 = p.center_y - 10.0,
        cfs = p.small_font_size * 1.2,
        camera = p.camera_info,
        photographer = photographer_el,
        ey = p.center_y + 70.0,
        sfs = p.small_font_size,
        exposure = p.exposure_info,
        rx = p.image_width as f64 - 20.0,
        dcy = p.center_y,
        dsfs = p.small_font_size * 0.8,
        date = p.date_time_string,
    )
}

// ─── Simple ───────────────────────────────────────────

fn extract_logo_href(logo_element: &str) -> Option<String> {
    if let Some(start) = logo_element.find("href=\"") {
        let rest = &logo_element[start + 6..];
        if let Some(end) = rest.find('"') {
            return Some(rest[..end].to_string());
        }
    }
    None
}

fn render_simple_portrait(p: &PortraitParams) -> String {
    let fh = p.frame_height;
    let total_h = (fh * 2.0) as u32;
    let cx = p.center_x;
    let logo_y = fh * 0.5;
    let camera_y = fh * 1.3;
    let photographer_y = fh * 1.6;

    let logo_display = if let Some(href) = extract_logo_href(&p.logo_element) {
        format!(
            r##"<image href="{href}" x="{x}" y="{y}" width="180" height="150" preserveAspectRatio="xMidYMid meet" />"##,
            href = href,
            x = cx - 90.0,
            y = logo_y - 75.0,
        )
    } else {
        let brand = p.camera_info.split_whitespace().next().unwrap_or("");
        format!(
            r##"<text x="{cx}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="500" fill="#333333" text-anchor="middle" dominant-baseline="middle">{brand}</text>"##,
            cx = cx,
            y = logo_y,
            fs = p.font_size * 1.2,
            brand = brand,
        )
    };

    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{cx}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#777777" text-anchor="middle" dominant-baseline="middle">{name}</text>"##,
            cx = cx,
            y = photographer_y,
            fs = p.small_font_size * 0.8,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{w}" height="{h}" fill="#FFFFFF"/>
  {logo}
  <text x="{cx}" y="{cy}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="400" fill="#333333" text-anchor="middle" dominant-baseline="middle">{camera}</text>
  {photographer}
</svg>"##,
        w = p.image_width,
        h = total_h,
        logo = logo_display,
        cx = cx,
        cy = camera_y,
        fs = p.font_size * 0.9,
        camera = p.camera_info,
        photographer = photographer_el,
    )
}

fn render_simple_landscape(p: &LandscapeParams) -> String {
    let cx = p.image_width as f64 / 2.0;
    let logo_y = p.center_y - 45.0;
    let text_y = p.center_y + 80.0;

    let logo_display = if let Some(href) = extract_logo_href(&p.logo_element) {
        format!(
            r##"<image href="{href}" x="{x}" y="{y}" width="120" height="100" preserveAspectRatio="xMidYMid meet" />"##,
            href = href,
            x = cx - 60.0,
            y = logo_y - 50.0,
        )
    } else {
        let brand = p.camera_info.split_whitespace().next().unwrap_or("");
        format!(
            r##"<text x="{cx}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="500" fill="#333333" text-anchor="middle" dominant-baseline="middle">{brand}</text>"##,
            cx = cx,
            y = logo_y,
            fs = p.font_size * 1.2,
            brand = brand,
        )
    };

    let photographer_tspan = if !p.photographer_name.is_empty() {
        format!(
            r##"<tspan dx="10" font-size="{fs}" font-weight="300" fill="#999999">by {name}</tspan>"##,
            fs = p.small_font_size * 0.7,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{fh}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{w}" height="{fh}" fill="#FFFFFF"/>
  {logo}
  <text x="{cx}" y="{ty}" font-family="Arial, sans-serif" text-anchor="middle" dominant-baseline="central">
    <tspan font-size="{fs}" font-weight="400" fill="#333333">{camera}</tspan>
    {photographer}
  </text>
</svg>"##,
        w = p.image_width,
        fh = p.frame_height as u32,
        logo = logo_display,
        cx = cx,
        ty = text_y,
        fs = p.font_size * 0.9,
        camera = p.camera_info,
        photographer = photographer_tspan,
    )
}

// ─── Micro ────────────────────────────────────────────

fn render_micro_portrait(p: &PortraitParams) -> String {
    let fh = p.frame_height;
    let thin_h = (fh * 0.5).round() as u32;
    let middle_y = thin_h as f64 * 0.5;

    let (logo_display, logo_width) = if let Some(href) = extract_logo_href(&p.logo_element) {
        let lh = (thin_h as f64 * 0.65).round();
        let lw = (lh * 1.2).round();
        let svg = format!(
            r##"<image href="{href}" x="15" y="{y}" width="{lw}" height="{lh}" preserveAspectRatio="xMidYMid meet" />"##,
            href = href,
            y = middle_y - lh / 2.0,
            lw = lw,
            lh = lh,
        );
        (svg, lw)
    } else {
        (String::new(), 0.0)
    };

    let left_margin = if !logo_display.is_empty() { logo_width + 25.0 } else { 20.0 };
    let camera_y = middle_y - 4.0 + 2.0;
    let exposure_y = camera_y + 4.0 + p.small_font_size * 0.7;

    let est_text_w = p.camera_info.len() as f64 * (p.small_font_size * 0.6);
    let photographer_x = left_margin + est_text_w + 10.0;

    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#777777" dominant-baseline="middle">by {name}</text>"##,
            x = photographer_x,
            y = camera_y,
            fs = p.small_font_size * 0.7,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    let exposure_el = if !p.exposure_info.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#777777" dominant-baseline="middle">{info}</text>"##,
            x = left_margin,
            y = exposure_y,
            fs = p.small_font_size * 0.7,
            info = p.exposure_info,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{w}" height="{h}" fill="#FFFFFF"/>
  {logo}
  <text x="{lm}" y="{cy}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="500" fill="#333333" dominant-baseline="middle">{camera}</text>
  {photographer}
  {exposure}
</svg>"##,
        w = p.image_width,
        h = thin_h,
        logo = logo_display,
        lm = left_margin,
        cy = camera_y,
        sfs = p.small_font_size,
        camera = p.camera_info,
        photographer = photographer_el,
        exposure = exposure_el,
    )
}

fn render_micro_landscape(p: &LandscapeParams) -> String {
    let fh = p.frame_height;
    let thin_h = (fh * 0.5).round() as u32;
    let middle_y = thin_h as f64 * 0.5;

    let (logo_display, logo_width) = if let Some(href) = extract_logo_href(&p.logo_element) {
        let lh = (thin_h as f64 * 0.65).round();
        let lw = (lh * 1.2).round();
        let svg = format!(
            r##"<image href="{href}" x="15" y="{y}" width="{lw}" height="{lh}" preserveAspectRatio="xMidYMid meet" />"##,
            href = href,
            y = middle_y - lh / 2.0,
            lw = lw,
            lh = lh,
        );
        (svg, lw)
    } else {
        (String::new(), 0.0)
    };

    let left_margin = if !logo_display.is_empty() { logo_width + 25.0 } else { 20.0 };
    let camera_y = middle_y - 4.0 + 2.0;
    let exposure_y = camera_y + 4.0 + p.small_font_size * 0.7;

    let est_text_w = p.camera_info.len() as f64 * (p.small_font_size * 0.6);
    let photographer_x = left_margin + est_text_w + 10.0;

    let photographer_el = if !p.photographer_name.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#777777" dominant-baseline="middle">by {name}</text>"##,
            x = photographer_x,
            y = camera_y,
            fs = p.small_font_size * 0.7,
            name = p.photographer_name,
        )
    } else {
        String::new()
    };

    let exposure_el = if !p.exposure_info.is_empty() {
        format!(
            r##"<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{fs}" font-weight="300" fill="#777777" dominant-baseline="middle">{info}</text>"##,
            x = left_margin,
            y = exposure_y,
            fs = p.small_font_size * 0.7,
            info = p.exposure_info,
        )
    } else {
        String::new()
    };

    format!(
        r##"<svg width="{w}" height="{h}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{w}" height="{h}" fill="#FFFFFF"/>
  {logo}
  <text x="{lm}" y="{cy}" font-family="Arial, sans-serif" font-size="{sfs}" font-weight="500" fill="#333333" dominant-baseline="middle">{camera}</text>
  {photographer}
  {exposure}
</svg>"##,
        w = p.image_width,
        h = thin_h,
        logo = logo_display,
        lm = left_margin,
        cy = camera_y,
        sfs = p.small_font_size,
        camera = p.camera_info,
        photographer = photographer_el,
        exposure = exposure_el,
    )
}

/// Returns the SVG height used by the watermark for the given design/orientation.
pub fn get_frame_svg_height(design_id: &str, frame_height: f64, is_portrait: bool) -> u32 {
    let is_micro = design_id == "micro";
    if is_portrait {
        if is_micro {
            (frame_height * 0.5).round() as u32
        } else {
            (frame_height * 2.0) as u32
        }
    } else {
        if is_micro {
            (frame_height * 0.5).round() as u32
        } else {
            frame_height as u32
        }
    }
}
