# Video compressor

Drop in videos, get MP4s under a target size (default 10 MB). Runs entirely in the browser using ffmpeg.wasm, so nothing is uploaded anywhere.

## Put it on GitHub Pages

1. Create a new public repo on github.com (e.g. `video-compressor`).
2. Click "uploading an existing file", drag in everything from this folder (including the `vendor` folder and `.nojekyll`), and commit.
3. Go to Settings > Pages. Under "Build and deployment", pick "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
4. After a minute it's live at `https://<your-username>.github.io/video-compressor/`. Bookmark it.

Tip: on macOS, `.nojekyll` is hidden in Finder. Press Cmd+Shift+. to show it before dragging.

## Settings

- Target size: the output will land just under this.
- Max resolution: caps the short edge. Use 720p for long clips where the bitrate gets thin.
- Encode: Faster is fine for most things; Sharper takes about twice as long for slightly cleaner detail.
- Remove audio: drops the soundtrack and gives that space to the picture.

Settings are remembered in your browser.

## Run it locally instead

Browsers won't load the encoder from a double-clicked file, so serve the folder:

    python3 -m http.server 8000

then open http://localhost:8000.

## What's inside

- `index.html`: the whole app
- `vendor/ffmpeg`: @ffmpeg/ffmpeg 0.12.15
- `vendor/core`: @ffmpeg/core 0.12.10 (the 31 MB encoder)
