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
- 2026-11-11 · Slice 7 ✅: Home as plain lists (Recently saved + Inbox row → collections, inline "New collection" with duplicate names blocked), `/inbox` and `/collection/[id]`, pull-to-refresh everywhere; rows open in a Custom Tab. `src/sync/syncTriggers.ts` (foreground ≥ 30 s apart, reconnect via NetInfo, Realtime as a 1 s debounced signal, backoff timer; reconnect and refresh clear the backoff wait; reconnect also reopens a Realtime channel closed by an error). "Sync now" is gone from the account panel (pull to refresh instead). Realtime gotcha: `SUBSCRIBED` comes before the channel is attached to Postgres; changes flow only after the *"Subscribed to PostgreSQL"* system message (the foreground sync covers that gap). `npm test` 204/204 (99.8% lines); `npm run test:integration` 6/6, incl. user A's Realtime channel never carrying user B's rows. **Emulator:** new dev build (NetInfo) launches; it has no Google account, so the signed-in screens weren't seen there. Share sheet counting as a foreground: #20. **Phone (owner, 2026-11-11):** first launch caught `Link asChild` rejecting a style array (fixed); then all five checks passed: share lands in hosted `items` and the list, a dashboard edit to `title` shows up live (Realtime), an airplane-mode share pushes on reconnect, pull-to-refresh on every list, a new collection appears as a share-sheet chip and a duplicate name is refused. No `[sync]` warnings in logcat.
- 2026-11-11 · Slice 8 ✅: `supabase/functions/extract` + `_shared/extraction` (spike 0a registry moved, Deno tests, SSRF guard rewritten as pure TS CIDR matching + `Deno.resolveDns`); insert trigger → `pg_net` → shared secret from Vault. Blocked pages end `ready` as link cards titled by `shared_title`. `deno task test` 95 steps (98.7% lines), pgTAP 21/21, `deno task test:integration` 3/3; app 204/204 and 6/6 unchanged. Security review: pass; four more IPv6 ranges blocked; email sign-up turned off on the hosted project (the trigger makes any account a URL fetcher). **Hosted:** owner set `EXTRACT_SECRET` + Vault, deployed and pushed; backfill turned the 3 stuck items `ready` (DNS works in the hosted runtime). **Phone (owner, 2026-11-11):** a shared HN link turns `ready` with its title. Stuck-row sweep: #21.

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

### Slice 7 (list UI + sync triggers), agreed 2026-11-11

- **The remote half of #7 shipped in slice 5** (`supabaseRemote.ts`); this slice is the UI and the triggers.
- **The owner's Home shape (SPEC #16, DESIGN §1–2) as plain lists:** Recently saved (latest 12 by `created_at`,
  Inbox items marked, an "Inbox (n)" row) → collections (name, count). No Rediscover yet. Routes `/inbox` and
  `/collection/[id]`; Phase 2 restyles them and keeps the routes and queries.
- **New collection inline** at the end of the list; Enter creates, empty or blur cancels. Duplicate names are
  blocked locally, case-insensitively (the server allows them; the sheet's chips would be ambiguous).
  No rename, reorder, delete or item actions (build step 12).
- **Item rows:** title, host, and status only when it's worth saying (pending, failed, waiting to sync).
  Newest first. Tap opens the link in a Custom Tab (`expo-web-browser`) until the reader exists.
- **`src/sync/syncTriggers.ts`**, plain TS with injected ports, started by `_layout.tsx` while signed in and
  never by the share sheet:
  - foreground → `sync()`, at most once per 30 s;
  - offline → online (`@react-native-community/netinfo`) and pull-to-refresh clear the backoff wait on
    retryable outbox entries (attempts kept, `failed` untouched), then `sync()`;
  - one timer, while in the foreground, at the earliest `nextAttemptAt`;
  - Realtime on `items` is only a signal: any change → `sync()` debounced 1 s; subscribed while signed in and in
    the foreground; the echo of our own pushes is accepted; a channel error is logged, not retried in a loop.
- **Tests:** triggers with fake ports; list queries on better-sqlite3; an integration test that user A's Realtime
  channel never sees user B's rows.

### Slice 8 (minimal `extract`), agreed 2026-11-11

- **The spike 0a registry moved** to `supabase/functions/_shared/extraction/` with its tests, now `deno test` with
  `@std/expect`. The spike folder stays frozen as the record of what 0a measured.
- **Trigger:** `AFTER INSERT` on `items` when `status = 'pending'` → `net.http_post` with only `{ item_id }`. URL and
  secret come from Vault (`extract_url`, `extract_secret`); missing → a warning, the insert still succeeds.
- **Auth:** `verify_jwt = false`; the function checks `EXTRACT_SECRET` in constant time and writes with the
  service-role client, every write scoped to one id. SPEC §7 updated.
- **Writes** every derived column the registry fills: status, kind, adapter, canonical_url (tracking stripped),
  raw_title, title (extracted → `shared_title` → host), site_name, author, duration_s, reading_min, `embed` and
  `post` in snake_case (SPEC §5 `embed` now says `video_id`). Unknowns are written as null so a rerun overwrites.
  No `item_content` (needs the sanitiser, Phase 3), no thumbnail/palette.
- **Lifecycle:** claim = `pending → extracting` in one conditional update (nothing claimed → 200, no-op). A blocked
  page still ends `ready` as a link card (`shared_title` is now passed to adapters as a hint). `failed` only for our
  own crashes, with `extract_error = 'internal'`. Logs carry item ids and adapter names, never URLs or messages.
- **Stuck rows:** a backfill snippet now (below); a `pg_cron` sweep is #21.
- **SSRF guard ported** as pure TS CIDR matching with `Deno.resolveDns` (A + AAAA) behind a `Lookup` port. The
  DNS-rebinding gap is in SPEC §10.
- **Tests:** Deno unit tests; pgTAP for the trigger; an integration test where private addresses must end `ready`
  as link cards (proves the plumbing and the live guard, no internet).

**Hosted setup (owner).** Generate the secret and set it in both places, without pasting it anywhere else:

```bash
SECRET=$(openssl rand -hex 32)
npx supabase secrets set EXTRACT_SECRET="$SECRET"
echo "$SECRET" | pbcopy   # then paste it into the SQL below, in the dashboard SQL editor
```

```sql
select vault.create_secret('https://ffofgzyudtloekityjfw.supabase.co/functions/v1/extract', 'extract_url');
select vault.create_secret('<paste the secret>', 'extract_secret');
-- to change one later: select vault.update_secret(id, '<new value>') from vault.secrets where name = 'extract_secret';
```

**Backfill** (re-sends every live `pending` item; safe to rerun, the claim makes duplicates no-ops):

```sql
select net.http_post(
  url := (select decrypted_secret from vault.decrypted_secrets where name = 'extract_url'),
  body := jsonb_build_object('item_id', id),
  headers := jsonb_build_object('content-type', 'application/json', 'authorization',
    'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'extract_secret')),
  timeout_milliseconds := 60000)
from public.items where status = 'pending' and deleted_at is null;
```

## Open questions for the owner

1. Supabase region (Singapore `ap-southeast-1` is the nearest outside India).
