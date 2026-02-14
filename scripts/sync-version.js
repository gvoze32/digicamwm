const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const version = pkg.version;

// Sync Cargo.toml
const cargoPath = path.join(root, "Cargo.toml");
let cargo = fs.readFileSync(cargoPath, "utf8");
cargo = cargo.replace(/^version = ".*?"/m, `version = "${version}"`);
fs.writeFileSync(cargoPath, cargo);

// Sync tauri.conf.json
const tauriConfPath = path.join(root, "tauri.conf.json");
let tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
tauriConf.version = version;
fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n");

// Sync Info.plist (CFBundleShortVersionString & CFBundleVersion)
const plistPath = path.join(
  root,
  "gen",
  "apple",
  "digicamwm_iOS",
  "Info.plist",
);
if (fs.existsSync(plistPath)) {
  let plist = fs.readFileSync(plistPath, "utf8");
  plist = plist.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>).*?(<\/string>)/,
    `$1${version}$2`,
  );
  plist = plist.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>).*?(<\/string>)/,
    `$1${version}$2`,
  );
  fs.writeFileSync(plistPath, plist);
}

// Sync project.yml (CFBundleShortVersionString & CFBundleVersion)
const projectYmlPath = path.join(root, "gen", "apple", "project.yml");
if (fs.existsSync(projectYmlPath)) {
  let yml = fs.readFileSync(projectYmlPath, "utf8");
  yml = yml.replace(
    /CFBundleShortVersionString: .*/,
    `CFBundleShortVersionString: ${version}`,
  );
  yml = yml.replace(/CFBundleVersion: .*/, `CFBundleVersion: "${version}"`);
  fs.writeFileSync(projectYmlPath, yml);
}

console.log(`Synced version to ${version}`);
