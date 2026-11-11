# Phase 1 — Skeleton

**Goal (SPEC §8):** auth, schema, RLS, sync, plain list UI.
**Done when:** share → item appears → syncs → survives reinstall.
**Started:** 2026-11-09

Out of scope here: the gallery (Phase 2), reader and video (Phase 3), AI enrichment, FTS.
The UI is a plain list. It must work, it doesn't need to look like DESIGN.md yet.

## Layout

```
hang/
  app/          Expo app (SDK 58, same pinned versions as the spikes), package com.prathamesh.hang
  supabase/     migrations, RLS tests (pgTAP), Edge Functions
  spikes/       kept for reference, not built
```

## Progress

Work status lives on the [board](https://github.com/users/prathamudeshmukh/projects/4) (issues #1–#9 are
slices 1–9). This log keeps what each slice actually delivered.

- 2026-11-09 · Slice 1: `app/` scaffolded from the share spike (`com.prathamesh.hang`), `npm test` 6/6, typecheck clean. Root git repo created 2026-11-09 (nested spike repos removed, owner chose option A). Dev build not run yet.
- 2026-11-09 · Slice 2: migration and pgTAP RLS tests written (`supabase/`). **Local `supabase test db`: 12/12 pass.** Pushed to the hosted project 2026-11-09; anon gets `42501` on all three tables.
- 2026-11-09 · Owner setup verified: hosted project `ffofgzyudtloekityjfw` linked, Google provider enabled, `app/.env` set (publishable key, web client id), debug keystore SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` (release builds are signed with it too).

- 2026-11-09 · Slice 3 ✅: `app/src/db/`: Drizzle schema mirroring the server tables (no `user_id`; timestamps kept as the server's strings), `outbox`, `sync_state`; migrations from `npm run db:generate` (drizzle-kit, `driver: 'expo'`). Collections and items repositories write the local row and its outbox entry in one transaction. Tests run the real migrations on better-sqlite3 in Node. **Migrations ran on the emulator** (dev build, `hang.db` has all five tables).
- 2026-11-09 · Slice 4 ✅: `app/src/sync/`: engine with an injected `SyncRemote` (the Supabase implementation comes with auth). Push first, strictly in order, 2 s → 5 min backoff; permanent errors set aside as `failed` (a failed create takes the row's later changes with it). Pull per table by an `(updated_at, id)` cursor with a 5 s overlap window (catches rows that commit late); pulled rows validated with Zod. Un-pushed local fields win over pulled ones; tombstones purge. A `sync()` during a run gets one follow-up run. New server migration: soft-deleting an item tombstones its `item_content` (local `supabase test db` 14/14; pushed to the hosted project 2026-11-09). `npm test` 59/59.
- 2026-11-11 · Slice 5 ✅: `app/src/auth/`: Google sign-in (`@react-native-google-signin`, no nonce) → `signInWithIdToken`; session in SecureStore (unreadable = signed out); `allowBackup: false`; main app behind `Stack.Protected`. `device_owner` table: first sign-in claims rows, same user resumes, a different user wipes first. Sign-out: one sync (≤ 5 s), warning if the outbox isn't empty, wipe in one transaction, local sign-out. `src/sync/supabaseRemote.ts`: PostgREST `SyncRemote` (0-row PATCH and other 4xx permanent; network, 401, 408, 429, 5xx, `PGRST204/205` retry; creates ignore duplicates); 30 s request timeout; one sync after sign-in and at launch. `npm test` 121/121 (coverage 99.7% lines), `npm run test:integration` 5/5 against the local stack (incl. user B can't read or overwrite user A's row). **Signed in on the phone: the Google account is in hosted `auth.users`.** The hosted row check (`user_id` = the signed-in user) moves to slice 6, since the share sheet doesn't write to SQLite until then. Failed outbox entries have no UI yet (#14).
- 2026-11-11 · Slice 6 ✅: `src/share/shareCapture.ts` saves a shared link to SQLite + outbox when the sheet opens; Save files it; closing runs `authSession.start()` + `sync()` (lazy-loaded). Chips are the device's collections. Sheet exits are first-wins, so a back press during Save's slide-out can't drop the filing. Home is a throwaway list of local items (`src/home/`). `npm test` 153/153 (99.7% lines). **Emulator:** item saved signed-out and offline; survives `force-stop` with the sheet still open; text-only share saves nothing. **Phone (owner, 2026-11-11):** signed-in share lands in hosted `items` with the right `user_id`; Save's `collection_id` arrives.

## Slices

Each slice ends tested and working. Order matters: later slices build on earlier ones.

| # | Slice | Done when | Needs from owner |
|---|---|---|---|
| 1 | **Repo + app scaffold.** `git init`, root `.gitignore`, `app/` from the share spike: `ShareActivity` plugin, `parseShare` + tests (`node --test`) | `npm test` green; dev build launches; sharing opens the sheet | — |
| 2 | **Server schema + RLS.** `collections`, `items`, `item_content` (SPEC §5); server-set `updated_at` trigger; soft deletes; RLS `user_id = auth.uid()` on every table; private `media` bucket with per-user folder policies | `supabase test db`: user A can't read or write user B's rows or objects | Supabase CLI installed, Docker running |
| 3 | **Local store.** `expo-sqlite` + Drizzle mirror of the three tables, plus `outbox` and `sync_state` | Migrations run on device; repository functions unit-tested | — |
| 4 | **Sync engine** (pure TS, injected remote). Pull per table by `updated_at` cursor; push outbox in order with backoff; idempotent upsert on `id`; user fields (`collection_id`, `read_at`, `progress`) win over server fields | Unit tests for merge rules, cursor, retry, tombstones | — |
| 5 | **Auth.** Google sign-in (`@react-native-google-signin`) → `signInWithIdToken`; session persisted; sign-out clears local data | Sign in on the phone; RLS sees the right `auth.uid()` | Supabase project (region outside India, see SPEC §10); Google Cloud OAuth clients (Web + Android with the debug and release SHA-1) |
| 6 | **Share → local → push.** Sheet writes the item to SQLite (UUIDv7, `pending`, `shared_title`) and to the outbox, before any network. Save sets `collection_id`, swipe down leaves it in the Inbox | Item is in SQLite even when offline or if the process dies after the sheet closes; once synced, it's in hosted `items` with the signed-in user's `user_id` | — |
| 7 | **Plain list UI + sync triggers.** Inbox and collections as lists; create a collection; pull on foreground, pull-to-refresh, reconnect, and Realtime on `items` | Item saved on the phone shows up in the Supabase table and back in the list | — |
| 8 | **Minimal `extract`.** Insert trigger → Edge Function → spike 0a registry (no AI, no thumbnails yet) → `status = ready`, title, site, kind | A shared HN link turns `ready` with a title | Supabase secrets set |
| 9 | **E2E (Maestro).** Share from Chrome → appears → uninstall → reinstall → sign in → still there | Passes on the emulator and the phone | — |

## Decisions made while planning

- **No `expo-share-intent`.** Spike 0c's own `ShareActivity` plugin replaces it (SPEC §4 updated).
- **Extraction in Phase 1 is minimal** (slice 8) so items don't sit at `pending` forever. AI enrichment
  and thumbnails/palette come later.
- **Package manager: npm for `app/`** (the spikes built with it; no hoisting surprises). The extraction code keeps pnpm.

### Slice 5 (auth), agreed 2026-11-09

- **Google sign-in via the free `@react-native-google-signin/google-signin`** (legacy Google Sign-In SDK on
  Android), behind a one-method `GoogleIdTokenProvider`. A local Credential Manager module was rejected as
  over-engineering for a one-user app; Credential Manager and custom nonces are paid-tier only, so **no nonce**.
  If Google drops the legacy SDK, swap the provider.
- **Session in `expo-secure-store`** (Keystore-encrypted). A value that can't be decrypted counts as signed out.
- **`android.allowBackup: false`.** After a reinstall, data comes back only through sync, so slice 9 proves sync.
- **Main app gated; the share sheet always saves locally.** Rows saved before any sign-in are unclaimed and the
  first sign-in claims them.
- **`device_owner` table** (one row, in SQLite) records whose data is on the device; it changes in the same
  transaction as the data.
- **Sign-out:** one `sync()` (~5 s), warn if the outbox still has entries, stop sync, wipe all local tables and
  `device_owner` in one transaction, then `signOut({ scope: 'local' })`.
- **Involuntary sign-out** (revoked/expired refresh token) keeps local data. Same user signs in → resume;
  different user → wipe first.
- **Slice 5 ships the Supabase `SyncRemote`** and one `sync()` after sign-in and at launch with a session;
  slice 7 adds the other triggers.
- **Tests:** unit tests with an injected `fetch`; `npm run test:integration` against local `supabase start` with
  two email/password users (local config only) for the round trip and RLS.
- **Gate:** `src/auth/` is plain TS exposed through `useAuth()`; `Stack.Protected` in expo-router.

### Slice 6 (share → local → push), agreed 2026-11-11

- **Saved when the sheet opens**, to the Inbox, so it survives the process dying mid-choice. Save adds a
  `file()` patch; swipe down adds nothing. There is no cancel.
- **Only links are saved.** Image files and text without a URL show a note and save nothing (images: #17).
- **Chips are the device's collections.** None → no chips and no Save. No pre-selection: Save is disabled
  until a chip is tapped (last-used: #18).
- **The sheet pushes on close**: it awaits the migration before writing, then `authSession.start()` +
  `sync()` after closing. Signed out or offline, the entry waits in the outbox.
- **Duplicates allowed** (#19).
- **UUIDv7 from `uuid`** with `expo-crypto` random bytes passed in (no global polyfill).
- **Failures:** on open, the sheet shows *"Couldn't save this: …"* and saves nothing; on Save, it closes
  and the item stays in the Inbox. Logs never carry the URL.
- **`src/share/shareCapture.ts`** holds the logic (plain TS); `shareSession.ts` wires it; the sheet only renders.
  The spike's in-memory `store.ts` is gone; Home is a throwaway list of local items until slice 7.

## Open questions for the owner

1. Supabase region (Singapore `ap-southeast-1` is the nearest outside India).
