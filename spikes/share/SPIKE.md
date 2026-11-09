# Spike 0c — Share sheet

**Question:** can sharing to Hang open its sheet *over* the app you shared from, and close back to it?
**Bar (SPEC §8):** sharing from Chrome, YouTube and X opens the sheet over them and closes back to
the source app.

## Approach (no third-party share library)

| Piece | Where |
|---|---|
| `ShareActivity`: a second Android activity, translucent theme, own empty-affinity task, excluded from recents, `SEND` filter for `text/plain` and `image/*` | `plugins/withShareActivity.js` (config plugin; writes the Kotlin file, the theme and the manifest entry) |
| The share intent's `EXTRA_TEXT` / `EXTRA_SUBJECT` / `EXTRA_TITLE` / `EXTRA_STREAM` → **initial props** of the JS component `ShareSheet` | `ShareActivity.getLaunchOptions()` |
| URL and `shared_title` extraction | `src/share/parseShare.ts` (6 tests: `node --test src/share/parseShare.test.ts`) |
| The sheet UI (DESIGN.md §8) and its motion: slide up, swipe down = Inbox, scrim tap / back = Inbox, Save = chosen collection | `src/share/ShareSheet.tsx`, `src/share/useSheetMotion.ts` |
| Closing | `BackHandler.exitApp()` → `invokeDefaultOnBackPressed()`, overridden to `finish()`. The RN default would only move the task to the back on Android 12+ |

The sheet prints **"opened in N ms · cold/warm JS"**: from `ShareActivity.onCreate` to the sheet's first
layout. *Cold* = the JS runtime had to boot (the app process wasn't running).

## Protocol

For each source app (Chrome, YouTube, X):
1. **Cold:** force-stop Hang Share, then share from the source → note the open time and that the sheet sits over the source.
2. **Warm:** share again with the process alive.
3. Close every way: **Save**, **swipe down**, **tap the scrim**, **back** → you must land back in the source app, not in Hang.
4. Check the main app's list shows each share with the right URL, title and collection.

## Results — emulator (2026-11-09, Pixel 6 API 30, release build)

| Check | Result |
|---|---|
| Hang Share shows in **Chrome's real share sheet** | ✅ |
| Sheet opens **over Chrome** (page visible behind the scrim) | ✅ |
| Open time, **cold** (process killed first) | **307 ms** (direct intent), **322 ms** (via Chrome's share sheet) |
| Open time, **warm** | **50–56 ms** |
| Title comes from the share (`EXTRA_SUBJECT`) | ✅ "How to Do Great Work", before any fetch |
| Close → back in Chrome, for all four exits: **back, Save, swipe down, scrim tap** | ✅ 4/4 |
| ShareActivity **not in recents** | ✅ (only Chrome + Hang's main activity) |
| Main app sees the shares (same JS runtime), correct collection / Inbox | ✅ Save → "Long reads"; the other three → Inbox |

Measured by driving the emulator over adb (screenshots in `.shots/`, gitignored).

**Verdict so far:** the architecture works with no third-party share library. Even a cold start is
well inside "the sheet never waits" (~0.3 s), because the release build ships the JS bundle with the app.

### Phone (Galaxy S23 Ultra, Android 17, release build): owner tested 2026-11-09, "works fine"

**Spike 0c passed.** Detailed numbers weren't recorded on the phone. Checks it was meant to cover:

- **YouTube** and **X** as sources (not on the emulator / not signed in).
- **Predictive back** on the sheet (Android 13+).
- Samsung's share sheet (One UI) vs. stock Android.
- An **image** share (`image/*` from Gallery): preview from a `content://` URI.

### Known gaps (fine for a spike)

- Shares live in memory only: if the process dies they're gone. The real app writes to SQLite at
  share time (SPEC §4 save flow).
- The release APK is ~101 MB (arm64 + Hermes, unoptimised). Not a concern yet.
