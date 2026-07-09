# eBay Live Stream Console

A browser-based control console for eBay Live streaming. Upload background music, configure your camera, and go fullscreen for a clean stream output.

## Features

- **Camera preview** with device selection
- **Microphone selection** with auto-matching to your phone camera (iPhone, DroidCam, etc.)
- **Mic volume** control and live level meter
- **Background music** — upload a track, adjust volume, play/pause, loop
- **Mirror camera** toggle
- **Live badge overlay** toggle for fullscreen
- **Action graphics** — upload POW!/BAM! images and sound effects, trigger with hotkey (default Space), random size & rotation
- **Full screen camera** — press the button or use fullscreen; press `Esc` to return to the console

## Action graphics folder

Drop images into `Images/` and sounds into `Sound/` — they load automatically via each folder's `manifest.json`. After adding files locally, run:

```bash
node scripts/generate-manifests.js
```

The GitHub Pages deploy workflow runs this for you on every push.

## Local development

This is a static site — no build step required. Serve the folder with any static server:

```bash
npx serve .
```

Or open `index.html` directly (camera access may require HTTPS or localhost).

## GitHub Pages

1. Push to `main` or `master`
2. In repo **Settings → Pages**, set source to **GitHub Actions**
3. The workflow deploys automatically on push

## Browser requirements

- Modern browser with `getUserMedia` support (Chrome, Edge, Firefox)
- HTTPS required for camera access on GitHub Pages
