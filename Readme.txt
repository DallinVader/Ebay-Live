# eBay Live Stream Console

A browser-based control console for eBay Live streaming. Upload background music, configure your camera, and go fullscreen for a clean stream output.

## Features

- **Camera preview** with device selection
- **Microphone selection** with auto-matching to your phone camera (iPhone, DroidCam, etc.)
- **Mic volume** control and live level meter
- **Background music** — playlist from `Music/` folder or uploads, click to play, volume control, loop playlist
- **Overlay camera** — draggable picture-in-picture second camera with size and mirror controls
- **Mirror camera** toggle
- **Live badge overlay** toggle for fullscreen
- **Action graphics** — upload POW!/BAM! images and sound effects, trigger with hotkey (default Space), random size & rotation
- **Full screen camera** — press the button or use fullscreen; press `Esc` to return to the console

## Media folders

Drop images into `Images/`, sounds into `Sound/`, and music into `Music/`. The app reads those folders automatically:

- **Local dev:** `node dev-server.js` (lists `Images/`, `Sound/`, and `Music/` live from disk)
- **GitHub Pages:** uses the GitHub API to list `Images/` and `Sound/` in the repo

No manifest files needed — just add files and refresh (or push for GitHub Pages).

## Local development

Start the dev server:

```bash
node dev-server.js
```

Then open http://localhost:3456

## GitHub Pages

1. Push to `main` or `master`
2. In repo **Settings → Pages**, set source to **GitHub Actions**
3. The workflow deploys automatically on push

## Browser requirements

- Modern browser with `getUserMedia` support (Chrome, Edge, Firefox)
- HTTPS required for camera access on GitHub Pages
