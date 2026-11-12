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

## First hosted run (2026-11-12): alpha was the cost

Backfill: 3 of 4 images stored; one died with `546 WORKER_RESOURCE_LIMIT`. It was a 1536×1024 (1.5 MP) PNG with
transparency on 68% of its pixels. Locally, decode 40 ms and resize 24 ms, but the WebP encode took 680–880 ms:
imagescript encodes the alpha plane losslessly by default (`alphaQuality: 100`).

| Encode of the 1080×720 thumbnail | Time | Size |
|---|---|---|
| q80, lossless alpha | 680–880 ms | 175 KB |
| q80, `alphaQuality: 50` (chosen) | 90–130 ms | 90 KB |
| q80, flattened onto the wall | 56–66 ms | 80 KB |

Chosen: lossy alpha, which keeps transparency so logos read on both light and dark walls.
