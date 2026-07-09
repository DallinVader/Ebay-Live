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

## Media folders

Drop images into `Images/`, sounds into `Sound/`, and music into `Music/`. The app keeps those lists up to date automatically:

- **Local dev:** `node dev-server.js` reads the folders live from disk every 15 seconds (and when you return to the tab)
- **GitHub Pages:** deploy regenerates `media-index.json` from the repo folders on every push; the app also refreshes on a timer and when the tab regains focus

No manual refresh or commands needed — add or remove files in the folders and they appear in the console.

## Local development

Install dependencies once:

```bash
npm install
```

Start the dev server:

```bash
node dev-server.js
```

Then open http://localhost:3456

### Standalone streaming

Streaming goes directly from the console to eBay Live (no OBS). Requirements:

1. Run the app from `node dev-server.js` (not plain static hosting)
2. [FFmpeg](https://ffmpeg.org/download.html) installed and on your PATH
3. eBay Live **Stream URL** and **Stream key** from Seller Hub

Enter URL/key in Stream Settings and click **Start streaming**.

## GitHub Pages

1. Push to `main` or `master`
2. In repo **Settings → Pages**, set source to **GitHub Actions**
3. The workflow deploys automatically on push

## Browser requirements

- Modern browser with `getUserMedia` support (Chrome, Edge, Firefox)
- HTTPS required for camera access on GitHub Pages
