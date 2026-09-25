// Image compression worker. Codecs load on first use only.
// PNG: libimagequant (the engine behind pngquant/TinyPNG) + oxipng. JPEG: mozjpeg. WebP: libwebp.

const PRESETS = {
  //          pngquant quality range   lossy JPEG/WebP quality
  smaller:  { png: [40, 70],           q: 68 },
  balanced: { png: [65, 85],           q: 78 },
  higher:   { png: [80, 98],           q: 88 },
};

let iqP, oxiP, jpegP, webpP;
const iq = () => (iqP ||= import("./vendor/imagequant/libimagequant_wasm.js").then(async (m) => { await m.default(); return m; }));
const oxi = () => (oxiP ||= import("./vendor/oxipng/squoosh_oxipng.js").then(async (m) => { await m.default(); return m; }));
const jpeg = () => (jpegP ||= import("./vendor/jpeg/encode.js"));
const webp = () => (webpP ||= import("./vendor/webp/encode.js"));

async function decodeWithBrowser(bytes, type) {
  const bmp = await createImageBitmap(new Blob([bytes], { type }), { imageOrientation: "from-image", premultiplyAlpha: "none", colorSpaceConversion: "default" });
  const c = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  return ctx.getImageData(0, 0, c.width, c.height);
}

async function decode(bytes, kind, type) {
  if (kind === "png") {
    try {
      const m = await iq();
      const [data, width, height] = m.decode_png_to_rgba(bytes);
      if (data.length === width * height * 4) return { data: new Uint8ClampedArray(data), width, height };
    } catch { /* fall back to the browser decoder */ }
  }
  return decodeWithBrowser(bytes, type);
}

async function compressPng(img, preset, original) {
  const m = await iq();
  const o = await oxi();
  let quantized = null;
  const q = new m.ImageQuantizer();
  try {
    q.setSpeed(3);
    q.setQuality(preset.png[0], preset.png[1]);
    const res = q.quantizeImage(img.data, img.width, img.height);
    try {
      res.setDithering(1.0);
      const idx = res.getPaletteIndices(img.data, img.width, img.height);
      quantized = m.encode_palette_to_png(idx, res.getPalette(), img.width, img.height);
    } finally { res.free(); }
  } catch {
    // Image can't hit the minimum quality with 256 colours (e.g. photos). Fall through to lossless.
  } finally { q.free(); }

  const source = quantized || original;
  return o.optimise(new Uint8Array(source), 2, false, true);
}

// Animated PNG (acTL chunk) or animated WebP (ANIM chunk): re-encoding would keep only the first frame
function isAnimated(b, kind) {
  const find = (tag, limit) => {
    const t = [...tag].map((c) => c.charCodeAt(0)), n = Math.min(b.length - 4, limit);
    for (let i = 0; i < n; i++) if (b[i] === t[0] && b[i + 1] === t[1] && b[i + 2] === t[2] && b[i + 3] === t[3]) return i;
    return -1;
  };
  if (kind === "png") { const a = find("acTL", 1 << 20); return a !== -1 && (find("IDAT", 1 << 20) === -1 || a < find("IDAT", 1 << 20)); }
  if (kind === "webp") return find("ANIM", 4096) !== -1;
  return false;
}
const exact = (u8) => (u8.byteOffset === 0 && u8.byteLength === u8.buffer.byteLength ? u8.buffer : u8.slice().buffer);

self.onmessage = async ({ data: job }) => {
  const { id, bytes, kind, type, preset: presetName, toWebp } = job;
  try {
    const preset = PRESETS[presetName] || PRESETS.balanced;
    const original = new Uint8Array(bytes);
    let out, outType;

    if (isAnimated(original, kind)) {
      self.postMessage({ id, ok: true, bytes: original.buffer, type, kept: true, animated: true }, [original.buffer]);
      return;
    }

    if (toWebp) {
      const img = await decode(original, kind, type);
      const { default: encode } = await webp();
      out = new Uint8Array(await encode(img, { quality: preset.q, method: 4 }));
      outType = "image/webp";
    } else if (kind === "png") {
      const img = await decode(original, kind, type);
      out = await compressPng(img, preset, original);
      outType = "image/png";
    } else if (kind === "jpeg") {
      const img = await decode(original, kind, type);
      const { default: encode } = await jpeg();
      out = new Uint8Array(await encode(img, { quality: preset.q }));
      outType = "image/jpeg";
    } else if (kind === "webp") {
      const img = await decode(original, kind, type);
      const { default: encode } = await webp();
      out = new Uint8Array(await encode(img, { quality: preset.q, method: 4 }));
      outType = "image/webp";
    } else {
      throw new Error("Unsupported image type");
    }

    // Never hand back something bigger than what came in (same format only)
    const kept = !toWebp && out.byteLength >= original.byteLength;
    const result = kept ? original : out;
    const buf = exact(result);
    self.postMessage({ id, ok: true, bytes: buf, type: kept ? type : outType, kept }, [buf]);
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err && err.message || err) });
  }
};
