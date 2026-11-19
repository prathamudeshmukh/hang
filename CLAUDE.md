# CLAUDE.md

Guidance for Claude Code when working in this project.

## Project links

| What | Link |
|---|---|
| Spec | [SPEC.md](./SPEC.md) |
| Design language | [DESIGN.md](./DESIGN.md) · [design/design-language.html](./design/design-language.html) |
| Design explorations | [design/explorations/](./design/explorations/) |
| Repo | [github.com/prathamudeshmukh/hang](https://github.com/prathamudeshmukh/hang) (public), `main` |
| Supabase project | `ffofgzyudtloekityjfw` (hosted, linked; `npx supabase … --remote`) |
| Play Console / internal testing | — |
| CI | [Actions](https://github.com/prathamudeshmukh/hang/actions) · `.github/workflows/ci.yml` |
| Kanban board | [GitHub Project #4 "Hang"](https://github.com/users/prathamudeshmukh/projects/4) |
| Error tracking | — |
| Analytics | — |

Secrets never go in this table. API keys live in env vars / Supabase secrets only.

## Backlog and work status

The **GitHub Project board is the source of truth** for what's planned, next, in progress and done.
Every work item is an issue in this repo, on the board, with a `phase-N` label (`follow-up` for things
found while building).

- Status columns: **Backlog → Ready → In progress → Done**.
- Starting work: move the issue to *In progress*. Finishing: commit with `Closes #N` (or close it) and
  move it to *Done*.
- New work found while building: open an issue (`follow-up` + phase label) and add it to the board
  instead of leaving a note in a doc.
- When a phase starts, break its epic issue into slice issues.
- `PHASE1.md` keeps the slice design and decisions; status lives on the board.

```bash
gh project item-list 4 --owner prathamudeshmukh          # board contents
gh project item-add 4 --owner prathamudeshmukh --url <issue-url>
# set status: gh project item-edit --project-id PVT_kwHOAfqYg84Bq0OP --id <item-id> \
#   --field-id PVTSSF_lAHOAfqYg84Bq0OPzhpJmpk --single-select-option-id <option>
# options: Backlog 6d5d489a · Ready f494413b · In progress 6d3f082b · Done d214da76
```

## What this is

**Hang**: share links from any Android app into collections, then browse them as a
gallery (masonry grid → swipe feed → reader). Personal first; Expo, Android primary.
Read SPEC.md before changing behaviour and DESIGN.md before changing anything visual.

## Status

**Phase 1 (Skeleton) done 2026-11-12** — see `PHASE1.md`. **Phase 2 (Gallery, #10) next.** All three spikes passed: **0a (extraction)** 87% on 30 HN links
(`spikes/extraction/RESULTS.md`); **0b (motion)** native Reanimated shared transitions ruled out, hand-built hero is the v1
approach, owner marked it passed 2026-11-09; gesture-driven predictive back moves to Phase 2 (`spikes/motion/SPIKE.md`);
**0c (share sheet)** passed on emulator and the owner's phone (`spikes/share/SPIKE.md`).

## Spike 0a — commands

```bash
cd spikes/extraction
pnpm install
pnpm test             # unit tests (Vitest)
pnpm test:coverage    # coverage (80% threshold)
pnpm typecheck
pnpm spike            # run links.txt → out/results.json + out/report.html
pnpm spike hn-links.txt   # main test set: 30 links from the HN front page (2026-11-08)
```

`links.txt` format: one URL per line, optional expected kind after `#`
(`https://youtu.be/abc  # video`). Blank lines and lines starting with `#` are ignored.

## Edge Functions — commands

```bash
cd supabase/functions
deno task test              # unit tests (Deno; @std/expect)
deno task test:coverage     # coverage report
deno task test:integration  # extract against the local stack (`npx supabase start` first); serves the
                            # function, points local Vault at it, secret in supabase/functions/.env
deno task check             # typecheck the entry point
deno lint
```

`_shared/extraction/` is the spike 0a registry, moved here (the spike folder stays frozen); `_shared/edge/` holds what
both functions share (trigger request check, secret, logger). Each function's `handler.ts` is plain TS with injected
ports; its `index.ts` is the only file that reads env or Deno globals. `extract` → `image_url` → trigger → `media`
(thumbnail via `imagescript`, palette). Both triggers read Vault (`extract_url`, `media_url`, shared `extract_secret`).
Deno is installed with `npm i -g deno` (Homebrew builds it from source). Don't run `deno fmt`: its style
differs from the repo's.

## App — commands

```bash
cd app
npm test               # node --test, all src/**/*.test.ts (Node 22.18+ strips types)
npm run test:coverage  # 80% threshold
npm run test:integration  # src/**/*.integration.ts against the local stack (`npx supabase start` first)
npm run typecheck
npm run db:generate    # after changing src/db/schema.ts: new SQLite migration in src/db/migrations
npm run icon           # after changing scripts/icon/iconArt.ts: re-renders the icon and splash PNGs
```

App icon (#74): the mosaic. Its tiles live in `src/theme/hangMark.ts`, shared by `<HangMark size>` (the four-tile
mark, for use inside the app) and `scripts/icon/iconArt.ts`, which is rendered with `@resvg/resvg-js` into
`assets/images` (icon, adaptive foreground over the wall colour, monochrome for themed icons, splash). The PNGs are
committed; prebuild copies them into `android/`, so re-render, prebuild and rebuild to see a change on the phone.

Design foundations (`src/theme/`, #28): tokens for light and dark (`tokens.ts`), the type scale (`typeScale.ts`), `useTheme()` and
`makeStyles()` (`theme.ts`), the three voices (`NameText`, `NoteText`, `ActionText`) and `Pill`. Nothing outside `src/theme`
hard-codes a color, font or size. Fonts are static cuts of Google's OFL variable fonts (Android can't set font axes):
`scripts/build-fonts.py` rebuilds `assets/fonts/` with fonttools 4.55. `android/` is generated: after changing `app.json`
plugins (fonts, `expo-navigation-bar`), run `npx expo prebuild --platform android --no-install` before a native build.
`plugins/withConfigChanges.js` (#65) keeps `MainActivity` alive through font scale, display size, language and bold-text
changes: a recreated activity mounts a second React root and leaves expo-router's global `router` unbound. The root
`<Stack>` is keyed on `fontScale` so text already on screen is laid out again. RN only reads a new font scale on resume,
so test it by leaving Hang, changing the setting and coming back. Plugin tests run with `npm test`.

Auth (`src/auth/`): `authSession.ts` is plain TS with injected ports (Google, Supabase auth, local account,
sync); `appSession.ts` wires the real ones and is the only file that imports native modules.

Thumbnails (`src/thumbs/`, #27): after every sync, `thumbSync` drops files whose item is gone and downloads missing
ones (signed links, 3 at a time, newest first) into `documentDirectory/thumbs/`; the local-only `thumb_files` table
records them and is wiped with the account. Each thumbnail is fetched once and never re-checked (see #37).

Home (`src/home/`, #30): `readHome(sources, now)` builds the strip prints, the Inbox count, today's Rediscover
pick (`rediscover.ts`, pure) and the collection rows with their covers; `homeCopy.ts` holds the greeting, date and
count words. Item taps open the swipe feed (below). `readHome(sources, { now, syncFailed })` also gives the feature
wall's state (#75, pure `homeWall.ts`): `hanging` with any live item; else `waiting` (*Bringing your wall over…*,
dashed frames) until the local `first_pull` row exists, which the sync engine writes after every error-free pull,
even an empty one (a `sync_state` cursor only appears when rows arrive); a failed sync shows `empty` instead.
`empty` is the how-to (`src/home/howto/`): geometry as plain shapes in `howtoShapes.ts`, drawn by `HowToArt` in the
`SKETCH` tokens, copy in `howtoCopy.ts`. Hang's mark is drawn there as its tiles (`markBounds`): `react-native-svg` ignores `x`/`y` on a
nested `<Svg>` and stops drawing after it. E2E waits on `testID="home-greeting"` (not `home`: Maestro also matches `android:id/home`); `inbox`
is the "Recently saved" label, present only while something is unsorted.

Feed (`src/feed/`, #31): grid cards, strip prints and Rediscover call `openFeed(ids, start)` (`appFeed.ts`); the ids go
through an in-memory `feedSession` (latest only; a restored route falls back to its start item), not the URL. `readFeed`
keeps that order and re-reads contents live; `originsOf` lets a moved item say *moved to X*. Pages show `summary ?? description`, except an article with reader text, which opens on its first lines (#61:
`db/contentRepository.ts` reads the start of `item_content.text`; an imageless one is a text page, `src/feed/text/`); a link's runs to five lines and its
note adds `savedNote` (*saved 3 days ago*, #54). Read/Watch/Open goes through
`openItem` (records `last_opened_at`, opens the Custom Tab) until Phase 3. A post page (`src/feed/post/`, #59) is its own layout, set as a broadside: `PostMeasure`
sets the words at all six `post-fit` steps unseen, pure `fitStep` picks the largest that fits the room `postLayout`
works out, and the hero flies the print to `wordsPlace` (the feed reports `wordsTop` with its size). Everything inside `ScreeningRoom`
(`src/theme/ScreeningRoom.tsx`) draws with the always-dark `SCREENING_ROOM` palette. `CollectionChips`
(`src/collections/`) is shared by the share sheet and Move, and ends in **+ New** (#76): the chip turns into a
name field (pure rules in `newCollectionDraft.ts`; a draft with text survives a blur). Enter calls `onCreate`: the
sheet selects the new collection (Save still files; a refused name shows in the footer hint), Move moves into it and
closes. Edge-to-edge means `adjustResize` doesn't lift the sheets: `useSheetLift` does. E2E waits on `testID="feed"`, `feed-counter`, `feed-move`.

Hero (`src/hero/`, #32): every way into the feed goes through `hero.open({ ids, card, scope })` (`appHero.ts`), and the
feed's `usePreventRemove` sends every way out through `hero.back`. `hero.ts` runs the trip (`trip.ts` reducer:
boarding → flying → settling → leaving, or a plain fading cross-fade) with injected ports; `HeroLayer` (above `<Stack>`)
is the only Reanimated part. Prints register as `HeroFace`s under a `HeroScope` (a place key, `home:strip`,
`home:rediscover`), and each wall registers an origin that reveals a print under the opaque feed (`useOrigins.ts`).
The feed route is `transparentModal` with no native animation, so the wall stays drawn under it.

Image pages (`src/feed/image/`, #60): `ImagePageView` draws the image whole on the page with a bottom `Shade`;
`ZoomableImage` (reusable, #64) does pinch, double-tap and pan through `useZoom`, whose math is pure in `zoom.ts`,
and loads `card.original` (the item's `image_url`) once zoomed. `imageChrome.ts` is the feed-wide viewer (one per
open feed, via context): which page's chrome is hidden and whether it's zoomed; the Pager hides the counter, top
shade and status bar from it, stops paging while zoomed, and `useFeedHero` asks it to zoom out before a back closes the feed.

Rewards (`src/rewards/`, #34): each reward's trigger is a pure function (`roomEntry`, `rediscoverEntry`;
`textJustArrived`/`thumbJustArrived` in `src/grid/arrival.ts`, kept per cell by `useArrival`). `RoomUnderline` draws
the ink underline once the push settles (`useAfterArrival`), `TextArrival` and `CardMediaBox` play "fetching fills in"
(the box stays dashed while `image_url` is set and no thumbnail has come, for at most 2 minutes), `Develop` runs
Rediscover's develop. No collection tint (DESIGN.md §3). Dev tools (`src/dev/`) exist only in builds made with
`EXPO_PUBLIC_HANG_DEV_TOOLS=1` (`e2e/run.sh` sets it): `hang://dev/rediscover` backdates the newest ready item on the
device so Rediscover has a pick.

Duplicate shares (#19): `supabase/functions/_shared/links/linkKey.ts` says when two links are the same thing; the app
imports it by relative path (Metro watches only that folder), so keep it dependency-free. `src/share/sameLink.ts`
finds the live item a share already is, and the capture opens on it (`kind: 'existing'`) instead of saving. The one-off
clean-up is `supabase/functions/scripts/dedupe/run.ts` (dry run unless `--apply`; needs the service-role key).

Reader text (#61): `extract` writes `item_content` for articles (`text` = the `<p>` paragraphs, blank-line separated,
without the title or byline; `_shared/extraction/paragraphs.ts`) before the item turns ready. Articles saved before
that get theirs from `supabase/functions/scripts/backfill-content/run.ts` (dry run unless `--apply`; service-role key).

Local store tests use better-sqlite3 with the real migrations (`src/db/testing/testDb.ts`); the device
uses expo-sqlite. Both are synchronous Drizzle drivers, typed as `HangDb`.

## E2E — commands

```bash
cd app
HANG_E2E_ACCOUNT=<test account email> e2e/run.sh emulator        # builds the release APK, runs both flows
HANG_E2E_ACCOUNT=<test account email> e2e/run.sh phone --i-know  # uninstalls your install; sign back in after
# HANG_E2E_EMPTY_ACCOUNT=<second account, never saves anything> adds 00-empty-home.yaml (the how-to, #75)
# 02 ends by re-sharing into a new collection, `E2E <run id>` (#76): one is left on the test account per run
# --skip-build reuses android/app/build/outputs/apk/release/app-release.apk
```

Maestro 2.12.1 lives in `~/.maestro` (pinned GitHub release zip, `cli-2.12.1`; Homebrew's tap needs a newer
Xcode). One-time per device: add the test Google account in Settings → Accounts. Flows are in `app/e2e/flows/`;
the numbered ones are entry points, the rest are subflows. The run uninstalls Hang and writes rows to the hosted
project as the test account. If Google's "Checking info" hangs on
the emulator, its DNS proxy has died: start it with `emulator -avd Pixel_6_API_30 -dns-server 8.8.8.8,1.1.1.1`.

## CI and deploys

`.github/workflows/ci.yml` runs on every push to `main` and on PRs: app typecheck, lint, coverage; functions
check, lint, coverage (80% threshold); then `supabase start` for pgTAP and both integration suites. On `main`,
once that passes, it deploys only what changed: `supabase/migrations/**` → `db push --dry-run` then `db push`;
`supabase/functions/**` (not tests/scripts) → `functions deploy`, after migrations, never after a failed push.
Migrations are forward-only: fix a bad one with a new migration.

- Credentials live in the GitHub Environment `production` (deploys from `main` only, no approval):
  `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`. Runtime secrets (`EXTRACT_SECRET`, Vault) stay manual.
- Versions are pinned in the workflow's `env`: Node 22, Deno 2.9.6, Supabase CLI 3.1.0.
- A change to `ci.yml` itself re-runs both deploys.
- Not in CI: E2E (#24), Android build (#25), `spikes/`.

## Architecture notes

- Imports use explicit `.ts` extensions (`allowImportingTsExtensions`) so the same files run in Deno;
  `deno.json` maps the npm packages.
- Extraction code is written **runtime-agnostic** (web `fetch`, `linkedom`, `@mozilla/readability`)
  so the adapters can move into a Supabase Edge Function (Deno) unchanged. Node-only code
  (DNS lookups for the SSRF guard, file IO) stays in `src/node/`.
- **ContentSource registry:** adapters are tried in order. URL adapters (`youtube`, `vimeo`, `xPost`,
  `externalVideo`, `directVideo`) match on the URL alone; content adapters (`directImage`,
  `imagePage`, `article`) look at the fetched page and may decline by returning `null`.
  `generic` always succeeds. An adapter that throws falls back to `generic`.
- Five card kinds: `article`, `video`, `post`, `image`, `link`.

## Conventions

- Follow the user's global rules (immutability, small files, max 3 params, TDD, 80% coverage).
- Every adapter needs fixture-based tests, including at least one failure path that proves the
  fallback to `generic`.
- Don't hit the network in unit tests; inject `fetch`.
