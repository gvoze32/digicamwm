// Copies package.json's version into Cargo.toml, tauri.conf.json and the iOS project.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const file = (...parts) => path.join(root, ...parts);
const { version } = JSON.parse(fs.readFileSync(file("package.json"), "utf8"));

const edit = (target, transform) => {
  if (fs.existsSync(target)) fs.writeFileSync(target, transform(fs.readFileSync(target, "utf8")));
};

// The [package] section is the first `version = ` line in the root manifest.
edit(file("Cargo.toml"), (s) => s.replace(/^version = ".*?"/m, `version = "${version}"`));

edit(file("tauri.conf.json"), (s) => JSON.stringify({ ...JSON.parse(s), version }, null, 2) + "\n");

edit(file("gen", "apple", "digicamwm_iOS", "Info.plist"), (s) =>
  s
    .replace(/(<key>CFBundleShortVersionString<\/key>\s*<string>).*?(<\/string>)/, `$1${version}$2`)
    .replace(/(<key>CFBundleVersion<\/key>\s*<string>).*?(<\/string>)/, `$1${version}$2`),
);

edit(file("gen", "apple", "project.yml"), (s) =>
  s
    .replace(/CFBundleShortVersionString: .*/, `CFBundleShortVersionString: ${version}`)
    .replace(/CFBundleVersion: .*/, `CFBundleVersion: "${version}"`),
);

console.log(`Synced version to ${version}`);
