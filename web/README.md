# DigiCamWM Web

Next.js port of the DigiCamWM watermarking tool for browser use.

## Features

- Upload multiple images or an entire folder (via `webkitdirectory`) and apply the existing watermark designs.
- Uses the original Sharp + EXIF pipeline from the Electron app.
- Provides download of processed images as a ZIP archive.
- Reuses the same design assets and camera brand logos.

## Getting started

### Prerequisites

- Node.js 18 LTS or newer (Next.js 14 requirement)

### Setup

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Then visit http://localhost:3000.

To create a production build:

```bash
npm run build
npm run start
```

### Assets

Design preview images and camera logos are pulled from the original `assets/` directory. They are copied into `web/public/assets/` for the web build. If you add or modify designs, re-run the `rsync` commands shown during setup or copy the files manually.

## Project structure

- `app/` – Next.js App Router pages and API routes (`/api/designs`, `/api/process`, `/api/assets/designs/*`).
- `components/` – React components (`WatermarkApp`).
- `lib/` – Shared watermarking logic that wraps the existing Sharp pipeline.
- `types/` – Type definitions (e.g., custom typings for `exif-parser`).

## Notes

- The upload form uses `webkitdirectory` to mimic the desktop folder picker. On unsupported browsers the user can select multiple files instead.
- Sharp runs on the server (API route) to replicate the Electron processing pipeline. Deploy to a Node.js-capable environment (Vercel Node runtime, self-hosted server, etc.).
- Processed results are delivered as a ZIP archive for easy downloading of multiple files.
