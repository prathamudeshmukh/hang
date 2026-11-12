/** What the bytes say they are, read from the first few bytes only: no decoding, no trust in Content-Type. */
export type ImageFormat = 'jpeg' | 'png' | 'gif' | 'webp';

export interface ImageHeader {
  readonly format: ImageFormat;
  readonly width: number;
  readonly height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

const ascii = (bytes: Uint8Array, at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length));
const startsWith = (bytes: Uint8Array, prefix: readonly number[]) => prefix.every((byte, i) => bytes[i] === byte);
const u16be = (b: Uint8Array, at: number) => ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);
const u16le = (b: Uint8Array, at: number) => (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8);
const u24le = (b: Uint8Array, at: number) => u16le(b, at) | ((b[at + 2] ?? 0) << 16);
const u32be = (b: Uint8Array, at: number) => ((u16be(b, at) << 16) >>> 0) + u16be(b, at + 2);

function header(format: ImageFormat, width: number, height: number): ImageHeader | null {
  return width > 0 && height > 0 ? { format, width, height } : null;
}

function readPng(b: Uint8Array): ImageHeader | null {
  return b.length >= 24 && ascii(b, 12, 4) === 'IHDR' ? header('png', u32be(b, 16), u32be(b, 20)) : null;
}

function readGif(b: Uint8Array): ImageHeader | null {
  return b.length >= 10 ? header('gif', u16le(b, 6), u16le(b, 8)) : null;
}

function readWebp(b: Uint8Array): ImageHeader | null {
  const chunk = ascii(b, 12, 4);
  if (chunk === 'VP8 ' && b.length >= 30) return header('webp', u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff);
  if (chunk === 'VP8L' && b.length >= 25 && b[20] === 0x2f) {
    const [b1, b2, b3, b4] = [b[21] ?? 0, b[22] ?? 0, b[23] ?? 0, b[24] ?? 0];
    return header('webp', 1 + (b1 | ((b2 & 0x3f) << 8)), 1 + ((b2 >> 6) | (b3 << 2) | ((b4 & 0x0f) << 10)));
  }
  if (chunk === 'VP8X' && b.length >= 30) return header('webp', 1 + u24le(b, 24), 1 + u24le(b, 27));
  return null;
}

/** Walks the marker segments to the first start-of-frame, which carries the size. */
function readJpeg(b: Uint8Array): ImageHeader | null {
  let at = 2;
  while (at + 9 <= b.length) {
    if (b[at] !== 0xff) return null;
    const marker = b[at + 1] ?? 0;
    if (marker === 0xff) {
      at += 1;
      continue;
    }
    if (JPEG_SOF_MARKERS.has(marker)) return header('jpeg', u16be(b, at + 7), u16be(b, at + 5));
    const standalone = marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9);
    at += standalone ? 2 : 2 + u16be(b, at + 2);
  }
  return null;
}

export function readImageHeader(bytes: Uint8Array): ImageHeader | null {
  if (startsWith(bytes, PNG_SIGNATURE)) return readPng(bytes);
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return readGif(bytes);
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return readWebp(bytes);
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return readJpeg(bytes);
  return null;
}
