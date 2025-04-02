# digicamwm

digicamwm is a Node.js-based tool for adding elegant watermarks to images. It extracts EXIF metadata from images to create customized watermarks that include camera details, exposure settings, and brand logos.

## Features

- Automatically extracts EXIF metadata (camera make, model, focal length, aperture, ISO, etc.).
- Supports both portrait and landscape image orientations.
- Dynamically embeds brand logos based on the camera make.
- Generates watermarks with a clean and professional design.
- Bulk processes images from a folder.

## Requirements

- Node.js (v14 or higher)
- `sharp` library for image processing
- `exif-parser` library for extracting EXIF metadata

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/gvoze32/digicamwm.git
   cd digicamwm
   ```

2. Install dependencies:

   ```bash
   npm install
   npm postinstall
   ```

## Usage

### Command-Line Interface

1. Place your raw images in a folder (e.g., `raw`).
2. Run the script to process the images:

   ```bash
   npm start
   ```

3. The processed images with watermarks will be saved in the specified `processed` folder.

## Supported Camera Brands

Ensure the `assets` folder contains SVG logos for the following brands:

- Canon
- Apple
- Sony
- Nikon
- Fujifilm
- Panasonic
- Leica
- Olympus
- Kodak

If a logo is missing, the camera make will be displayed as text instead. Help contribute by uploading missing logos to [https://tally.so/r/wMVyoX](https://tally.so/r/wMVyoX).

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve the project.
