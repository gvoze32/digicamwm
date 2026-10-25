#!/usr/bin/env bash
# Vercel build: make sure the Rust WASM toolchain is present, then build the static site into
# dist/ (same UI as the desktop app).
set -euo pipefail

WASM_BINDGEN=0.2.127 # must match crates/wasm/Cargo.toml
BIN="$HOME/.local/bin"
mkdir -p "$BIN"
export PATH="$BIN:$HOME/.cargo/bin:$PATH"

# Vercel's image ships rustup/cargo; install them only when missing.
if ! command -v cargo >/dev/null; then
  curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi
rustup target add wasm32-unknown-unknown

if [ "$(wasm-bindgen --version 2>/dev/null)" != "wasm-bindgen $WASM_BINDGEN" ]; then
  name="wasm-bindgen-$WASM_BINDGEN-x86_64-unknown-linux-musl"
  curl -sSfL "https://github.com/wasm-bindgen/wasm-bindgen/releases/download/$WASM_BINDGEN/$name.tar.gz" | tar xz -C /tmp
  install -m 755 "/tmp/$name/wasm-bindgen" "$BIN/wasm-bindgen"
fi

npm run web:build
