# Compressor

Drop in videos and images, get smaller files. Runs entirely in the browser, so nothing is uploaded anywhere.

- Videos: MP4 under a target size (default 10 MB), via ffmpeg.wasm
- PNG: 256-colour palette with transparency via libimagequant (the engine behind pngquant and TinyPNG), then oxipng
- JPG: re-encoded with mozjpeg
- WebP: re-encoded with libwebp, or convert anything to WebP with the toggle

Files are sorted automatically. Only the settings for what's in the list are shown. Each engine loads the first time it's needed, so an images-only visit never downloads the video encoder.

## Put it on GitHub Pages

1. Create a new public repo on github.com (e.g. `compressor`).
2. Click "uploading an existing file", drag in everything from this folder (including the `vendor` folder and `.nojekyll`), and commit.
3. Go to Settings > Pages. Under "Build and deployment", pick "Deploy from a branch", branch `main`, folder `/ (root)`, and save.
4. After a minute it's live at `https://<your-username>.github.io/compressor/`. Bookmark it.

Tip: `.nojekyll` is hidden in Finder. Press Cmd+Shift+. to show it before dragging.

Note: open it from the Pages link, not by double-clicking `index.html`. Browsers block the encoders on local files.

The 31 MB video encoder loads from jsDelivr (GitHub's web uploader rejects files over 25 MB). To self-host it instead, put `ffmpeg-core.js` and `ffmpeg-core.wasm` from `@ffmpeg/core@0.12.10/dist/esm` in `vendor/core/` using git or GitHub Desktop; the page uses that copy when it exists.

## Using it

- Change a setting, then hit Redo on any file to run it again with the new setting.
- Download all bundles every finished file into one zip.
- Images keep their original filename (like TinyPNG). Videos get `_compressed` added.
- If an image is already as small as it can go, the original is kept.
- Settings are remembered in your browser.

## Run it locally

Browsers won't run this from a double-clicked file, so serve the folder:

    python3 -m http.server 8000

then open http://localhost:8000.

## What's inside

- `index.html`: the app
- `img-worker.js`: image compression, runs off the main thread
- `vendor/`: ffmpeg.wasm 0.12 (core from CDN), libimagequant-wasm 0.3, jSquash oxipng / mozjpeg / webp, fflate
