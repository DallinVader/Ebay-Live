# eBay Live Stream Console

A browser-based control console for eBay Live streaming. Upload background music, configure your camera, and go fullscreen for a clean stream output.

## Features

- **Camera preview** with device selection
- **Microphone selection** with auto-matching to your phone camera (iPhone, DroidCam, etc.)
- **Mic volume** control and live level meter
- **Background music** — playlist from `Music/` folder or uploads, click to play, volume control, loop playlist
- **Overlay camera** — picture-in-picture or split screen (main top, overlay bottom), draggable in PiP mode
- **Mirror camera** toggle
- **Live badge overlay** toggle for fullscreen
- **Action graphics** — upload POW!/BAM! images and sound effects, trigger with hotkey (default Space), random size & rotation
- **Full screen camera** — press the button or use fullscreen; press `Esc` to return to the console
- **Direct adaptive WHIP streaming** at up to 720×1280/30 FPS, with automatic quality reduction under congestion

## Media folders

Drop images into `Images/`, sounds into `Sound/`, and music into `Music/`. The app keeps those lists up to date automatically:

- **Local dev:** `node dev-server.js` serves the site, watches the folders, and keeps `media-index.json` current
- **GitHub Pages:** deploy regenerates `media-index.json` from the repo folders on every push; the app also refreshes on a timer and when the tab regains focus

No manual refresh or commands needed — add or remove files in the folders and they appear in the console.

## Local development

Start the dev server:

```bash
node dev-server.js
```

Then open http://localhost:3456

### Standalone streaming

Streaming uses WHIP to go directly from the browser to eBay Live (no OBS). Requirements:

1. Open the app from an HTTPS host, or from `http://localhost:3456` during local development
2. Get the eBay Live **WHIP Stream URL** and **Stream key** from Seller Hub

Enter URL/key in Stream Settings and click **Start streaming**.

Video composition runs in a Chromium worker and publishes H.264 baseline video with Opus audio. The local server is only for static hosting and automatic media-folder indexing. It is not part of the streaming path.

## GitHub Pages

1. Push to `main` or `master`
2. In repo **Settings → Pages**, set source to **GitHub Actions**
3. The workflow deploys automatically on push

## Browser requirements

- Current desktop Chrome or Edge (the publisher uses Chromium insertable video streams and WebCodecs)
- HTTPS required for camera access on GitHub Pages

## Tests

Run `npm test` to verify composition math, adaptive quality behavior, and WHIP/SDP helpers.
