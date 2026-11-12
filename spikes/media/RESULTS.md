# Spike — media step (#26, 2026-11-12)

**Question:** can an Edge Function decode, resize to 1080px and encode WebP within its CPU limit?

**Library:** `imagescript@3.20.2` (WASM, Deno-ready): decodes JPEG/PNG/WebP/GIF (first frame), resizes, encodes
WebP, and takes a `maxPixels` decode limit. Note: `encodeWebP` takes `{ quality }`; a bare number means lossless.

## Hosted runtime (synthetic noise JPEGs; *lossless* WebP by mistake, so pessimistic)

| Input | Pipeline | Result |
|---|---|---|
| 1200×630 (0.8 MP) | 0.72–0.79 s | ok ×2 |
| 2400×1600 (3.8 MP) | ~1.5 s | ok ×2 |
| 4000×3000 (12 MP) | ~1.5 s | 1 of 2 hit `WORKER_RESOURCE_LIMIT` |
| 6000×4000 (24 MP) | — | `WORKER_RESOURCE_LIMIT` ×2 |

## Local (Apple Silicon), lossy WebP q80

| Input | Pipeline |
|---|---|
| 1200×630 | ~85 ms |
| 2400×1600 | ~170 ms |
| 4000×3000 | ~430 ms |

Lossy is 3–5× faster than the hosted numbers' lossless encode.

## Decisions (owner, 2026-11-12)

- A separate `media` function (own CPU budget), triggered by `image_url`; two writes (text first, then image).
- Cap at **6 MP**, read from the file header before decoding (also enforced by the decoder's `maxPixels`).
  Conservative given the lossy numbers; revisit with real logs (`media.unusable` reason `too_many_pixels`).

`probe.ts` is the local timing script (`deno run --no-prompt probe.ts`; needs no permissions).
