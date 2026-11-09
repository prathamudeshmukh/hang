# Spike 0a — Extraction results

**Date:** 2026-11-08 · **Bar (SPEC §8):** ≥ 85% of real links render as the correct card kind
with a usable title and image; failures fall back to `link`.

## Verdict: passes the bar, with three follow-ups

| Run | Set | Usable cards | Right kind |
|---|---|---|---|
| Sample (`links.txt`) | 14 hand-picked links of every kind | 12/14 | 14/14 (labelled) |
| **Main (`hn-links.txt`)** | 30 links from the Hacker News front page | **26/30 (87%)** | ~26/30 (judged by eye) |

"Usable" = has a title, and has an image unless it's an article or post (DESIGN.md gives
those a typeset card when there's no picture).

## What failed on the HN set, and why

| Link | Result | Cause | Follow-up |
|---|---|---|---|
| arstechnica.com | bare `link`, hostname as title | HTTP 405 to server requests | Share-title hint (below) |
| science.org | bare `link`, hostname as title | HTTP 403 (bot wall) | Share-title hint |
| newyorkfed.org PDF | `link`, no image | PDFs have no preview | Fixed: titled by file name. PDF thumbnails are v2 |
| clj.rs | `link`, no image | Site has no og:image | None: correct degraded card |

## Quality issues the score doesn't catch

- **Generic og:title.** apiiro.com's og:title is the company tagline, not the post's headline.
- **Site suffixes in titles** ("| max's place", "— LoreKit blog", "- Eli Bendersky's website").
  Both of these are what the AI title cleanup (SPEC §6) is for. The AI step should see `<h1>`
  and Readability's title as well as og:title.
- **Landing page read as an article** (scrine.io) and a GitHub README read as an article.
  Both are arguably fine, because the README reads well in the reader. Revisit if it bothers in daily use.

## Bugs found and fixed during the spike

1. Readability crashed on pages without `<html>/<body>` tags (danluu.com) → wrap tag soup before parsing.
2. Link-list pages (HN home) were classified as articles → reject link density > 50%.
3. TikTok/blocked oEmbed made the whole adapter fail → best-effort sources; it stays a `video` card.
4. Articles without og:image → fall back to the first image in the article body.

## Findings for the spec

1. **Send the share intent's title along with the URL.** Android shares from Chrome and most
   apps include the page title (`EXTRA_SUBJECT` / text before the URL). Sites that block
   servers (Ars, Science) would then still get a real title. Proposed: `items.shared_title`,
   used by `generic` when the fetch fails.
2. **Region matters.** TikTok redirects every request from India to `/in/about` (the country
   block), and this cannot be worked around from an Indian network or an Indian Supabase region.
   TikTok was dropped from the test set.
3. **Direct video files need a poster frame** (e.g. `ffmpeg` in a worker). Edge Functions
   can't do this, so it's v2, or a small worker service.
4. Timing per link: median ~0.6s, slowest ~2.8s. That fits comfortably inside the share sheet's
   ~1.5s window for the AI pick in most cases, once the AI call (~1s) is added.

## How to rerun

```bash
pnpm spike hn-links.txt   # or links.txt, or your own list
open out/report.html
```

## Code review (2026-11-08)

The review found 0 critical, 3 high, 9 medium and 7 low issues.

**Fixed, each with a test written first:**
- **High:** one deadline now covers every redirect hop, the DNS lookup and the body read.
- **High:** XSS tests for the report. The report is now included in coverage, has a strict CSP, never links `javascript:`, and no longer loads Google Fonts.
- **High:** an empty text body no longer crashes the fetcher.
- **High (Deno portability):** imports now use `.ts` (`allowImportingTsExtensions`), and `deno.json` maps the npm packages. Not yet checked with `deno check`, because Deno isn't installed.
- **Medium:** the SSRF guard now covers NAT64/6to4/Teredo/IPv4-compatible IPv6, the TEST-NET and benchmark ranges, and IPv4-mapped hex forms (explicit unmapping).
- **Medium:** image URLs from oEmbed and the post mirror are restricted to http(s).
- **Medium:** bodies of 3xx responses are drained.
- **Medium:** malformed `%` escapes in file names are handled.
- **Low:** `fetchJson` checks the content type.

**Deferred to the real Edge Function:**
- charset-aware decoding
- deduplicating repeated page-fetch errors
- passing errors from best-effort sources up into `errors`
- an explicit Pinterest TLD list
- run.ts's local array mutation

Tests: 75 passing · coverage 97% lines / 83% branches.
