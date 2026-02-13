# DigiCamWM

🇬🇧 English | [🇮🇩 Bahasa Indonesia](README.ID.md)

![GitHub release (latest by date)](https://img.shields.io/github/v/release/gvoze32/digicamwm)
![License](https://img.shields.io/github/license/gvoze32/digicamwm)

A powerful digital camera watermarking tool that adds professional-looking frames with camera information to your photos. Built with [Tauri v2](https://tauri.app/) and Rust for native performance on desktop and mobile.

![Screenshot of DigiCamWM](assets/thumbnails/screenshot.jpeg)

## Features

- 📷 Extracts EXIF data from photos (camera model, settings, date/time)
- 🖼️ Adds professional watermark frames with camera info
- 🏞️ Supports both portrait and landscape orientations
- 🚀 Batch processing capabilities
- 🎨 Clean, minimal UI that's easy to use
- 💻 Cross-platform (Windows, macOS, Linux, Android, iOS)
- ⚡ Native Rust backend for fast image processing

## Installation

### Download

Download the latest version from the [Releases page](https://github.com/gvoze32/digicamwm/releases).

### Supported Platforms

- **Windows**: Download the `.exe` (NSIS) or `.msi` installer
- **macOS**: Download the `.dmg` file (Apple Silicon & Intel)
- **Linux**: Download the `.AppImage`, `.deb`, or `.rpm` package
- **Android**: Download the `.apk` file
- **iOS**: Build from source with Xcode

### Troubleshooting Installation

#### macOS Security Issues

If you encounter security warnings on macOS when trying to open the application ("DigiCamWM is damaged and can’t be opened. You should move it to the Trash."), you can use the following Terminal command to remove the quarantine attribute:

```bash
xattr -c /Applications/DigiCamWM.app
```

This removes the quarantine flag that macOS applies to applications downloaded from the internet.

## Usage

### GUI Application

1. Launch the DigiCamWM application
2. Select your input folder containing photos
3. Choose an output folder for processed images
4. Click "Start Processing"
5. View the results in your output folder

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/) (v9 or newer)
- [Rust](https://www.rust-lang.org/tools/install) (via rustup)
- Platform-specific dependencies (see [Tauri prerequisites](https://tauri.app/start/prerequisites/))

### Setup

```bash
# Clone the repository
git clone https://github.com/gvoze32/digicamwm.git
cd digicamwm

# Install dependencies
npm install
```

### Running in Development Mode

```bash
# Desktop
npm run dev

# Android
npx tauri android dev

# iOS
npx tauri ios dev
```

### Building from Source

```bash
# Build for your current platform
npm run build

# Build for Android
npx tauri android build

# Build for iOS
npx tauri ios build
```

## Camera Brand Logo Support

DigiCamWM will automatically look for camera brand logos in the `assets/models` folder. The file should be named according to the camera manufacturer (lowercase) with a `.png` extension.

For example:

- `assets/models/sony.png`
- `assets/models/canon.png`
- `assets/models/nikon.png`

## Technologies

- [Tauri v2](https://tauri.app/) - Cross-platform app framework (desktop & mobile)
- [Rust](https://www.rust-lang.org/) - Backend for image processing
- [Vite](https://vitejs.dev/) - Frontend build tool
- [image](https://crates.io/crates/image) - Rust image processing
- [kamadak-exif](https://crates.io/crates/kamadak-exif) - EXIF metadata extraction
- [resvg](https://crates.io/crates/resvg) - SVG rendering

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the [LICENSE](https://github.com/gvoze32/digicamwm/blob/main/LICENSE) file for details.
