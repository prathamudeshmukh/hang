# Hang — Specification

**Status:** agreed, pre-implementation
**Date:** 2026-11-08
**Owner:** Prathamesh Deshmukh
**Design:** [DESIGN.md](./DESIGN.md) · approved sheet: [`design/design-language.html`](./design/design-language.html)

---

## 1. What this is

A personal gallery for things found online. Share a link (an article, video, post or
image) from any Android app into Hang, hang it in a collection, and later browse each
collection as a moodboard and a lean-back feed, with a beautiful reader for anything long.

> "Where does it hang?" is the only question Hang asks at save time.

### Audience

Personal first: one user, one Android phone. Every choice keeps the path to a public
release open (real auth, RLS, no secrets on device), but nothing is built *for* other
users in v1.

### The problems it solves

1. **Saving is a chore.** Most read-later apps make you file at save time, or file nothing.
   Hang asks once, pre-selects an answer, and lets you skip the question.
2. **Backlogs rot.** Saves are newest-first and never come back. Hang has Shuffle and a daily
   Rediscover.
3. **Mixed content looks bad together.** Articles, videos, posts and images each get a
   card designed for them, hung on the same wall.

---

## 2. Governing principles

### The app is the frame

Other people made the content and you chose it. Hang's job is to hang it well: the content
supplies the color, and the frame stays quiet. (Expanded in DESIGN.md.)

### Saving never waits

The share sheet appears instantly and never blocks on network, extraction or AI. All
enrichment happens afterwards and fills in visibly.

### The server does the hard reading

Extraction is the riskiest part of the product, so it lives on the server, where it can be
retried, improved and fixed without shipping a new app build. The phone only ever sends a URL
or a file.

### Degrade to a good card, never to an error

Every saved link renders as *something* beautiful. If an adapter fails, the item falls
back to a generic link card (Open Graph image, title, site), never to a broken state.

---

## 3. Agreed decisions

| # | Area | Decision |
|---|---|---|
| 1 | Audience | Personal first; path to public kept open |
| 2 | Platform | **Expo, Android primary.** iOS later, if ever |
| 3 | Backend | Thin Supabase backend: Postgres, Auth, Storage, Edge Functions |
| 4 | Auth | Supabase Auth + **Google sign-in** (Credential Manager → `signInWithIdToken`); RLS on every table |
| 5 | Filing | **Inbox + one home collection per item.** No tags (as a user-facing concept) in v1 |
| 6 | Share flow | Translucent bottom sheet over the source app; last-used collection pre-selected; AI pick replaces it if ready in under ~1.5s; swipe down leaves it in the Inbox |
| 7 | Browsing | Home → collection **masonry grid** → full-screen **swipe feed** → reader. Shuffle on every collection |
| 8 | Reader | WebView + own CSS template; light, sepia and dark themes; font size; remembered position; finish moment. Highlights in v2 |
| 9 | Content sources | **ContentSource adapter registry.** One adapter per source; each resolves to one of five card kinds |
| 10 | Video | YouTube, Vimeo and direct files play inline (YouTube autoplays muted in the feed); everything else is a rich card that opens the platform's app. **No re-hosting** |
| 11 | Posts (X) | Saved as a copy at save time and rendered as a native card; falls back to "open in X" |
| 12 | Images | Both image links (Open Graph image extracted) and shared files (uploaded to Storage) |
| 13 | AI | **Claude Haiku 5.5**, one structured call per item → collection, title, summary, tags (with vision for images) |
| 14 | Offline | Local SQLite copy of metadata, article text and downscaled images; offline shares queue; simple pull-and-push sync |
| 15 | Search | On-device SQLite **FTS5** over title, site, summary, tags and article text; type filters |
| 16 | Home | Recently saved strip (holds the Inbox) → one Rediscover pick → collections list |
| 17 | Design | "Curious on a calm base": Gallery direction. Full detail in DESIGN.md |
| 18 | Name | **Hang** |

### Explicitly rejected

| Rejected | Why |
|---|---|
| iOS-first | The owner only has an Android device |
| Fully on-device (no backend) | Extraction is too weak on device, with no sync and no recovery |
| PowerSync / ElectricSQL in v1 | One user on one device; plain pull-and-push is enough. Can replace the sync layer later |
| Tags in v1 | Filing friction; collections should feel like distinct rooms. AI tags exist only to power search |
| Downloading/re-hosting video (yt-dlp) | Legally grey, fragile, blocks going public |
| Embedding TikTok/Instagram/X video in v1 | Embeds are unreliable and hit login walls; they get a rich card that opens their app instead |
| Streaks, badges, gamification | Turns a read-later app into guilt |
| Social features | Not the product |
| Material You dynamic color | The wallpaper would dictate the frame for other people's art |
| Bottom tab bar, floating action button | Home is the hub; sharing *is* the add button |

### Deferred (roughly in priority order)

1. Semantic search (pgvector embeddings)
2. Highlights and notes in the reader
3. Smarter Rediscover: items gather "dust"; a "let go" action deletes them guilt-free
4. TikTok / Instagram / X video embeds; X threads
5. Custom cover and tint override per collection
6. iOS build, sharing a collection, export

---

## 4. Architecture

```
 Android app (Expo)                                Supabase
 ┌──────────────────────────────┐                  ┌───────────────────────────────┐
 │ Share sheet (translucent)    │── upsert item ──▶│ Postgres (RLS)                │
 │ Home / Grid / Feed / Reader  │◀─ pull changes ──│  items · collections ·        │
 │ Search (FTS5)                │                  │  item_content                 │
 │ SQLite (expo-sqlite+Drizzle) │                  │        │ insert trigger       │
 │ Image cache (expo-image)     │                  │        ▼                      │
 │ Outbox (queued writes)       │                  │ Edge Function `extract`       │
 └──────────────────────────────┘                  │  ContentSource registry       │
           ▲   Realtime: item status               │  → Readability / oEmbed /     │
           └───────────────────────────────────────│    post snapshot / OG         │
                                                   │  → palette + thumbnail        │
                                                   │  → Claude Haiku 5.5           │
                                                   │ Storage: thumbnails, uploads  │
                                                   └───────────────────────────────┘
```

### Save flow

1. A share intent arrives (via our `ShareActivity`, see Spike 0c). The sheet opens immediately.
2. The client creates the item **locally** with a client-generated UUIDv7, `status = pending`,
   `collection_id = null` (Inbox), and adds it to the outbox. If the intent carries a title
   (`EXTRA_SUBJECT`, or the text before the URL in `EXTRA_TEXT`, which Chrome and most apps send),
   it's stored as `shared_title`. The sheet uses it right away for the preview instead of
   *"reading it now…"*. (Added after Spike 0a.)
3. If online, the outbox pushes the row (an idempotent upsert on `id`). A database trigger enqueues
   `extract` for it (via `pg_net`, or a Database Webhook).
4. The sheet subscribes to that row over Realtime. If `ai_collection_id` arrives within
   ~1.5s and the user hasn't touched a chip, it replaces the last-used pre-selection.
5. **Save** sets `collection_id`. **Swipe down** leaves it in the Inbox. Either way the sheet closes
   immediately.
6. Offline: steps 3–4 are skipped. The item shows as a dashed "fetching…" card and is pushed on
   reconnect.

### Extraction pipeline (`extract` Edge Function)

1. **Classify**: the registry picks the first adapter whose `matches(url)` is true; the generic adapter
   is last. `shared_title` is passed to every adapter as a hint. When a site blocks the server's
   request (Spike 0a: Ars Technica 405, Science 403), `generic` uses it instead of the hostname, and
   the AI step can still classify from the title alone.
2. **Extract**: the adapter returns a normalised `Extracted` record (see §5).
3. **Media**: the server downloads the lead image, stores a 1080px-wide WebP thumbnail in Storage,
   and computes the **palette** (dominant and muted colors).
4. **Enrich**: one Haiku 5.5 call (see §6).
5. **Write**: updates `items` and `item_content`, sets `status = ready` (or `failed` with
   `extract_error`, after which the generic adapter is retried as a fallback).
6. Idempotent: rerunning on the same item overwrites derived fields only, never
   `collection_id` or reading state.

### ContentSource adapters (v1)

| Adapter | Matches | Method | Card kind |
|---|---|---|---|
| `youtube` | youtube.com, youtu.be, Shorts | oEmbed + page metadata (duration) | `video` (inline) |
| `vimeo` | vimeo.com | oEmbed | `video` (inline) |
| `directVideo` | `.mp4`, `.webm`, `.m3u8` | HEAD + content type | `video` (inline, `expo-video`) |
| `xPost` | x.com, twitter.com `/status/` | Unofficial JSON mirror (fxtwitter-style), oEmbed fallback | `post` |
| `imageFile` | Shared file (not a URL) | Upload to Storage | `image` |
| `imagePage` | Direct image URLs; Pinterest, Dribbble, Behance, etc. | Content type / `og:image` | `image` |
| `article` | Pages where Readability finds an article | `@mozilla/readability` + `linkedom` | `article` |
| `externalVideo` | TikTok, Instagram Reels, X video | oEmbed / Open Graph | `video` (opens the platform's app) |
| `generic` | Anything else | Open Graph / Twitter-card meta | `link` |

Adding a source = one new adapter file + fixtures + tests. No other code changes.

### Sync

- The server is the source of truth. Every syncable row has `updated_at` (server-set) and
  `deleted_at` (a soft delete, also called a tombstone).
- **Pull:** `select … where updated_at > :cursor` per table, applied to SQLite; the cursor is stored
  locally.
- **Push:** outbox entries (`upsert` / `patch` / `delete`) are replayed in order and retried with
  backoff. Conflict rule: last write wins per field, and the user's own fields (`collection_id`,
  `read_at`, `progress`) always win over server enrichment.
- Triggers: app foreground, pull-to-refresh, Realtime change on `items`, connectivity regained.
- Article text and thumbnails are prefetched as soon as an item reaches `ready`, so everything saved
  is readable offline. Video never plays offline.

### Client stack

Expo (dev build, not Expo Go) · `expo-router` (native stack → predictive back) · edge-to-edge
· `expo-sqlite` + Drizzle · `@shopify/flash-list` (masonry) · `react-native-reanimated` +
`react-native-gesture-handler` · `expo-image` · `react-native-webview` ·
`react-native-youtube-iframe` · `expo-video` · own `ShareActivity` config plugin (Spike 0c; replaces `expo-share-intent`) ·
`@react-native-google-signin/google-signin` · `@supabase/supabase-js` · `phosphor-react-native`
· Newsreader + Hanken Grotesk via `expo-font`. Exact versions are pinned at scaffold time.

---

## 5. Data model

```sql
collections (
  id            uuid pk,             -- client-generated v7
  user_id       uuid not null,       -- = auth.uid(), RLS
  name          text not null,
  position      int  not null,       -- order on Home
  tint          text,                -- hex, derived from recent items' palettes (server)
  cover_item_id uuid,                -- most recent image-bearing item (server)
  created_at, updated_at, deleted_at
)

items (
  id              uuid pk,           -- client-generated v7
  user_id         uuid not null,
  collection_id   uuid null,         -- null = Inbox
  source_url      text not null,     -- as shared
  shared_title    text,              -- title sent with the share intent, if any; fallback when fetch is blocked
  canonical_url   text,
  kind            text check (kind in ('article','video','post','image','link')),
  adapter         text,              -- 'youtube', 'article', ...
  status          text check (status in ('pending','extracting','ready','failed')),
  extract_error   text,

  title           text,              -- AI-cleaned, falls back to extracted
  raw_title       text,
  summary         text,              -- 1–2 lines, AI
  tags            text[],            -- AI, search-only
  site_name       text,
  author          text,
  published_at    timestamptz,
  duration_s      int,               -- video
  reading_min     int,               -- article
  thumb_path      text,              -- Storage
  thumb_w, thumb_h int,              -- masonry aspect ratio
  palette         jsonb,             -- { dominant, muted, onDominant }
  post            jsonb,             -- post snapshot: author, handle, avatar, text, media[], posted_at
  embed           jsonb,             -- { provider, videoId, playable_inline }

  ai_collection_id uuid,             -- suggestion, never applied silently after the sheet closes
  ai_confidence    real,

  read_at          timestamptz,      -- "finished"
  progress         real,             -- 0–1 reader scroll / video position fraction
  last_opened_at   timestamptz,
  rediscovered_on  date,             -- last day shown in Rediscover

  created_at, updated_at, deleted_at
)

item_content (                       -- separate so list queries stay light
  item_id    uuid pk references items,
  user_id    uuid not null,
  html       text,                   -- sanitised reader HTML
  text       text,                   -- plain text for FTS
  word_count int,
  updated_at, deleted_at
)
```

Storage bucket `media` (private): `{user_id}/thumbs/{item_id}.webp` and
`{user_id}/uploads/{item_id}.{ext}`. Clients read through signed URLs.

**Local SQLite** mirrors these tables, plus `outbox`, `sync_state` and an FTS5 virtual table
`items_fts(title, site_name, summary, tags, text)` kept in sync by triggers.

### Derived behaviour

- **Inbox** = `collection_id is null and deleted_at is null`.
- **Recently saved** = the latest 12 items by `created_at`; Inbox items are badged.
- **Rediscover** (one per day, deterministic for that date): `created_at < now() − 30d`, not
  opened in 30 days, `rediscovered_on` empty or more than 60 days ago; prefers unread items. If no
  item qualifies, the section is hidden.
- **Collection tint** = the most common muted palette color across the collection's last 10 items,
  adjusted to ≥ 3:1 contrast against the wall in both themes. Recomputed on item change.
- **Shuffle** = a seeded random order, stable for the session.

---

## 6. AI enrichment

One call per item, Claude **Haiku 5.5**, structured output, from the Edge Function. The
`ANTHROPIC_API_KEY` lives in Supabase secrets, never on the device.

**Input:** the extracted title, `shared_title`, the page's first `<h1>`, site, author, the first ~1,500 words or the description, the post text,
and the thumbnail image (vision) for `image`/`video`/`link`; plus the user's collections as
`{id, name, 5 recent titles}`.

**Output schema:**

```json
{
  "collection_id": "uuid | null",
  "confidence": 0.0,
  "title": "clean human title, no site suffix",
  "summary": "one or two plain sentences, no hype",
  "tags": ["lowercase", "max 8", "include visual subjects for images"]
}
```

**Rules:**
- `collection_id` must be one of the provided ids or null; it is validated server-side.
- The sheet pre-selects the suggestion only when `confidence ≥ 0.6`.
- On failure or timeout (8s), the item is still `ready` with its extracted fields; AI fields
  stay null, and a retry is queued once.
- Cost at personal scale is pennies a month; the token count is logged per call for visibility.

---

## 7. v1 scope

### In

1. Google sign-in; one account
2. Android share target → translucent share sheet ("Where does it hang?")
3. Extraction for all nine adapters in §4, with the generic fallback
4. AI enrichment (§6)
5. Home: Recently saved, Rediscover, Collections
6. Collection masonry grid with type filters and Shuffle
7. Swipe feed (screening room); inline YouTube/Vimeo/direct video
8. Reader: themes, font size, remembered position, finish moment
9. Native cards for posts and images; rich cards that open the platform's app for other video
10. Offline reading and saving; pull-and-push sync
11. Full-text search with type filters
12. Housekeeping: create, rename, reorder and delete collections; move, delete and mark items read;
    retry a failed extraction
13. Light and dark modes following the system setting; reduce-motion support

### Out of v1

Everything in *Deferred* (§3), plus: multi-device conflict handling beyond last write wins,
notifications, widgets, import from other apps (Pocket/Raindrop export), web app.

### Security requirements (non-negotiable)

- RLS on every table and the storage bucket: `user_id = auth.uid()`.
- No service keys or API keys in the app bundle; the app ships only the anon key.
- The Edge Function validates the JWT, and fetches only `http(s)` URLs with private IP ranges
  blocked (SSRF guard), a 10s timeout and a 5 MB body cap.
- Reader HTML is sanitised server-side (allow-list of tags and attributes, no scripts or iframes), and
  the WebView runs with JavaScript limited to our own injected bridge.
- Never log URLs together with user identity; log only item ids.

---

## 8. Build order

| Phase | Goal | Done when |
|---|---|---|
| **0a · Extraction spike** ✅ | Prove extraction quality | 30 real links (the HN front page, 2026-11-08) → ≥ 85% render as the correct card kind with a usable title and image; failures fall back to `link`. **Passed: 87%** (see `spikes/extraction/RESULTS.md`) |
| **0b · Motion spike** ✅ | Prove shared-element transitions on Android | Emulator, 2026-11-09: **native Reanimated SET ruled out** (no element flight, even with `SharedTransitionBoundary`); **hand-built hero works** (all 4 transitions, no flash, 90th percentile 19ms on a debug emulator). **Owner marked it passed, 2026-11-09.** Gesture-driven predictive back and curve tuning move to Phase 2. See `spikes/motion/SPIKE.md` |
| **0c · Share sheet spike** ✅ | Prove the translucent sheet over the source app | Emulator, 2026-11-09: **works with no third-party library**: `ShareActivity` via config plugin, intent as initial props. Over Chrome via Chrome's real share sheet; opens in ~0.3s cold / ~55ms warm; all 4 exits return to Chrome; not in recents. **Owner confirmed it works on their phone** (Galaxy S23 Ultra, Android 17). See `spikes/share/SPIKE.md` |
| 1 · Skeleton ◐ | Auth, schema, RLS, sync, plain list UI | Share → item appears → syncs → survives reinstall |
| 2 · Gallery | Home, grid, feed, design tokens | Matches the approved design sheet |
| 3 · Reader & video | Reader, inline players, cards that open other apps | All five card kinds complete |
| 4 · Search & polish | FTS, housekeeping, motion rewards, empty states | v1 scope complete |
| 5 · Hardening | Tests to coverage target, security review, crash and error reporting | Daily use for 2 weeks with no data loss |

---

## 9. Testing

Coverage target **80%** on all non-UI logic.

| Level | What | Tooling |
|---|---|---|
| Unit | Each adapter's `matches` + `extract` against saved HTML/JSON fixtures; URL canonicalisation; palette → tint contrast adjustment; Rediscover selection; sync merge rules; outbox replay; FTS query building | Vitest (Deno test for Edge Functions) |
| Integration | `extract` against a local Supabase (`supabase start`) with fixture HTTP server; RLS tests proving user A cannot read/write user B's rows or storage objects; AI call with a recorded response | Deno test + Supabase CLI |
| E2E | Share from Chrome → sheet → Save → appears in collection; offline share → reconnect → fills in; open article → read → finish note appears | Maestro on an Android emulator and a real device |

Every adapter must have at least one failure-path test (e.g. a 404, a blocked page, malformed oEmbed)
proving it falls back to `generic`.

---

## 10. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Sites block server fetches / return paywalls | High (confirmed in Spike 0a: 2/30) | `shared_title` from the share intent; generic card fallback; manual "retry"; headless browser service (e.g. Browserless) as an opt-in v2 adapter |
| Region blocks (TikTok redirects all of India to `/in/about`) | Confirmed | Unfixable from an Indian network or region; such platforms degrade to a rich card using `shared_title` that opens the app. Keep the Supabase region outside India if TikTok matters |
| Direct video files have no thumbnail | Confirmed | Poster-frame generation needs `ffmpeg`, which Edge Functions can't run. v2: a small worker service. v1: a typeset video card |
| Unofficial X mirror breaks | High | Post adapter isolated; oEmbed fallback; worst case it degrades to a `link` card |
| Shared-element transitions janky on Android | Confirmed for native SET | Spike 0b: native Reanimated SET doesn't fly on Android (4.7, experimental). v1 uses the hand-built hero (boarding → flying → settling) |
| Translucent share activity is hard in Expo | Retired (Spike 0c) | A ~150-line config plugin adds `ShareActivity`; no third-party share library needed |
| YouTube iframe autoplay restrictions in WebView | Medium | Muted autoplay only; tap to unmute; poster frame fallback |
| Edge Function limits (CPU time, memory) on large pages | Low–Med | 5 MB cap; stream parsing; move `extract` to a small worker service if needed |
| Storage growth from uploads | Low | Downscale uploads to 2048px long edge; originals not kept in v1 |
