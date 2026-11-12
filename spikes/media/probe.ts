// Spike: imagescript cost per thumbnail in Deno (decode → resize to 1080 wide → WebP q80). No permissions needed.
import { decode, Frame, GIF, Image } from "npm:imagescript@3.20.2";

const TARGET_WIDTH = 1080;
const WEBP_QUALITY = 80;

function photoLike(width: number, height: number): Image {
  const image = new Image(width, height);
  let seed = 7;
  const noise = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 64;
  const pixels = image.bitmap;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * 4;
      pixels[at] = ((x * 255) / width + noise()) & 255;
      pixels[at + 1] = ((y * 255) / height + noise()) & 255;
      pixels[at + 2] = (128 + noise()) & 255;
      pixels[at + 3] = 255;
    }
  }
  return image;
}

async function thumbnail(bytes: Uint8Array): Promise<{ ms: number; out: number; w: number; h: number }> {
  const start = performance.now();
  const decoded = await decode(bytes, true);
  const frame = decoded instanceof GIF ? decoded[0] : decoded;
  const resized = frame.width > TARGET_WIDTH ? frame.resize(TARGET_WIDTH, Image.RESIZE_AUTO) : frame;
  const webp = await resized.encodeWebP({ quality: WEBP_QUALITY });
  return { ms: Math.round(performance.now() - start), out: webp.length, w: resized.width, h: resized.height };
}

for (const [w, h] of [[1200, 630], [2400, 1600], [4000, 3000]]) {
  const jpeg = await photoLike(w, h).encodeJPEG(85);
  const runs = [await thumbnail(jpeg), await thumbnail(jpeg), await thumbnail(jpeg)];
  console.log(`jpeg ${w}x${h} (${Math.round(jpeg.length / 1024)} KB) →`, runs.map((r) => `${r.ms}ms`).join(" "), `→ ${runs[0].w}x${runs[0].h}, ${Math.round(runs[0].out / 1024)} KB webp`);
}

const small = photoLike(600, 400);
const webpIn = await small.encodeWebP({ quality: 80 });
console.log("webp decode:", (await thumbnail(webpIn)).w > 0);
const gif = new GIF([Frame.from(small)]);
console.log("gif decode (first frame):", (await thumbnail(await gif.encode())).w > 0);
