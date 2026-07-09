# eBay Live Stream Console

A browser-based control console for eBay Live streaming. Upload background music, configure your camera, and go fullscreen for a clean stream output.

## Features

- **Camera preview** with device selection
- **Microphone selection** (for future stream integration)
- **Background music** — upload a track, adjust volume, play/pause, loop
- **Mirror camera** toggle
- **Live badge overlay** toggle for fullscreen
- **Full screen camera** — press the button or use fullscreen; press `Esc` to return to the console

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
