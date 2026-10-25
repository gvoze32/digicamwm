#!/usr/bin/env bash
# Vercel build: the image has Node but no Rust, so install the WASM toolchain, then build the
# static site into dist/ (same UI as the desktop app).
set -euo pipefail

WASM_BINDGEN=0.2.127 # must match crates/wasm/Cargo.toml

if ! command -v cargo >/dev/null; then
  curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --target wasm32-unknown-unknown
fi
export PATH="$HOME/.cargo/bin:$PATH"
rustup target add wasm32-unknown-unknown

if [ "$(wasm-bindgen --version 2>/dev/null)" != "wasm-bindgen $WASM_BINDGEN" ]; then
  name="wasm-bindgen-$WASM_BINDGEN-x86_64-unknown-linux-musl"
  curl -sSfL "https://github.com/wasm-bindgen/wasm-bindgen/releases/download/$WASM_BINDGEN/$name.tar.gz" | tar xz -C /tmp
  install -m 755 "/tmp/$name/wasm-bindgen" "$HOME/.cargo/bin/wasm-bindgen"
fi

npm run web:build
