# CLAUDE.md

Guidance for Claude Code when working in this project.

## Project links

| What | Link |
|---|---|
| Spec | [SPEC.md](./SPEC.md) |
| Design language | [DESIGN.md](./DESIGN.md) · [design/design-language.html](./design/design-language.html) |
| Design explorations | [design/explorations/](./design/explorations/) |
| Repo | local git, `main` (no remote yet) |
| Supabase project | — |
| Play Console / internal testing | — |
| Kanban board | — |
| Error tracking | — |
| Analytics | — |

Secrets never go in this table. API keys live in env vars / Supabase secrets only.

## What this is

**Hang**: share links from any Android app into collections, then browse them as a
gallery (masonry grid → swipe feed → reader). Personal first; Expo, Android primary.
Read SPEC.md before changing behaviour and DESIGN.md before changing anything visual.

## Status

**Phase 1 (Skeleton) in progress** — see `PHASE1.md`. All three spikes passed: **0a (extraction)** 87% on 30 HN links
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

## App — commands

```bash
cd app
npm test               # node --test, all src/**/*.test.ts (Node 22.18+ strips types)
npm run test:coverage  # 80% threshold
npm run typecheck
npm run db:generate    # after changing src/db/schema.ts: new SQLite migration in src/db/migrations
```

Local store tests use better-sqlite3 with the real migrations (`src/db/testing/testDb.ts`); the device
uses expo-sqlite. Both are synchronous Drizzle drivers, typed as `HangDb`.

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
