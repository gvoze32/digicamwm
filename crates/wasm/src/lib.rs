//! JavaScript API over `digicamwm-core`, used by the UI's Web Worker.

use digicamwm_core as core;
use wasm_bindgen::prelude::*;

#[wasm_bindgen(start)]
fn start() {
    console_error_panic_hook::set_once();
}

fn js_error(e: impl std::fmt::Display) -> JsError {
    JsError::new(&e.to_string())
}

/// `DesignInfo[]`
#[wasm_bindgen]
pub fn designs() -> Result<JsValue, JsError> {
    serde_wasm_bindgen::to_value(&core::designs()).map_err(js_error)
}

/// A decoded photo kept in WASM memory so several designs can be previewed without re-decoding.
#[wasm_bindgen]
pub struct Photo(core::Photo);

#[wasm_bindgen]
impl Photo {
    /// Decodes `bytes`; when `max_side` is given the result is downscaled to fit it.
    #[wasm_bindgen(constructor)]
    pub fn new(bytes: &[u8], max_side: Option<u32>) -> Result<Photo, JsError> {
        let photo = core::Photo::decode(bytes).map_err(js_error)?;
        Ok(Photo(match max_side {
            Some(max) => photo.downscaled(max),
            None => photo,
        }))
    }

    /// Replaces the EXIF-derived metadata (used for the bundled sample photos).
    #[wasm_bindgen(js_name = setMeta)]
    pub fn set_meta(&mut self, meta: JsValue) -> Result<(), JsError> {
        self.0.meta = serde_wasm_bindgen::from_value(meta).map_err(js_error)?;
        Ok(())
    }

    /// Display name of the camera, e.g. `SONY ILCE-7M4` (empty when the photo has no EXIF).
    #[wasm_bindgen(getter)]
    pub fn camera(&self) -> String {
        self.0.meta.camera()
    }

    pub fn downscaled(&self, max_side: u32) -> Photo {
        Photo(self.0.downscaled(max_side))
    }

    /// Renders `design` and returns JPEG bytes.
    pub fn render(&self, design: &str, photographer: &str, quality: u8) -> Result<Vec<u8>, JsError> {
        let frame = self.0.render(design, photographer).map_err(js_error)?;
        frame.encode(core::OutputFormat::Jpeg, quality).map_err(js_error)
    }
}

#[wasm_bindgen]
pub struct Output {
    bytes: Vec<u8>,
    format: core::OutputFormat,
}

#[wasm_bindgen]
impl Output {
    /// Moves the encoded file out (the second call returns an empty array).
    #[wasm_bindgen(js_name = takeBytes)]
    pub fn take_bytes(&mut self) -> Vec<u8> {
        std::mem::take(&mut self.bytes)
    }

    #[wasm_bindgen(getter)]
    pub fn extension(&self) -> String {
        self.format.extension().into()
    }

    #[wasm_bindgen(getter)]
    pub fn mime(&self) -> String {
        self.format.mime().into()
    }
}

/// Full-resolution decode → frame → encode.
#[wasm_bindgen]
pub fn process(bytes: &[u8], design: &str, photographer: &str) -> Result<Output, JsError> {
    let out = core::process(bytes, design, photographer).map_err(js_error)?;
    Ok(Output { bytes: out.bytes, format: out.format })
}
