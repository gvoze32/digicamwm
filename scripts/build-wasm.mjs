// Builds crates/wasm and generates the JS bindings the UI worker imports from ui/src/wasm/.
// Needs: rustup target add wasm32-unknown-unknown; cargo install wasm-bindgen-cli --version 0.2.127
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });

run("cargo", ["build", "-p", "digicamwm-wasm", "--target", "wasm32-unknown-unknown", "--profile", "wasm"]);
run("wasm-bindgen", [
  "--target", "web",
  "--out-dir", "ui/src/wasm",
  "--out-name", "digicamwm",
  "target/wasm32-unknown-unknown/wasm/digicamwm_wasm.wasm",
]);
