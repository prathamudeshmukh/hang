# Spike 0b — Motion

**Question:** can grid → feed → reader shared-element transitions run smoothly on an Android phone?
**Bar (SPEC §8):** runs at 60fps on the owner's phone; otherwise use the hand-built fallback.

## Two approaches, same flow

| Route | Approach |
|---|---|
| `/native` | Reanimated 4.7 `sharedTransitionTag` on the expo-router native stack. Needs the static flag `ENABLE_SHARED_ELEMENT_TRANSITIONS` (set in `package.json`), which is **experimental** and needs a dev build (not Expo Go) |
| `/hero` | Hand-built: measure the tapped print, fly a copy in an overlay on the UI thread, swap the real layer in underneath when it lands. Uses only stable APIs |

Both use DESIGN.md motion: 340ms, `cubic-bezier(.2,.7,.1,1)`, no bounce, text fading in 60ms behind.
`android.predictiveBackGestureEnabled` is on, so the back gesture can be judged too (Android 13+).

**Frame meter** (bottom pill): counts UI-thread frames slower than 1.5× the screen's best interval.
Tap it to reset before each transition. Pass ≈ 0 slow frames during a transition, worst under ~25ms.

## Run on your phone

1. Enable Developer options → USB debugging, connect over USB, accept the prompt. `adb devices` should list it.
2. `cd hang/spikes/motion && npx expo run:android` (first build ~5–10 min).
   If Gradle times out downloading (seen on this machine: Java connect timeouts while curl works),
   build in the cloud instead: `npx eas-cli@latest build --profile development --platform android`,
   then install the APK and run `npx expo start --dev-client`.

## What to try

- On each route: tap a print → feed → **Read** → reader → back → back. Reset the meter between runs.
- Scroll the grid first, then open a print lower down (the rect must be measured correctly).
- Back gesture from the screen edge (predictive back) vs. the back button.
- Native route only: does `.easing()` take effect (no linear or springy feel)?

## Results — emulator run (2026-11-09)

Pixel 6 emulator, Android 11 (API 30), 60 Hz, **debug build** (JS dev mode on, so timings are pessimistic).
Method: `adb` taps + `screenrecord` (it records every changed frame, ~60 fps while moving) +
`dumpsys gfxinfo` for frame stats. Contact sheets are in `.shots/` (gitignored).

### A · Native shared transition: **ruled out for v1**

- With the documented setup (flag on, `sharedTransitionTag` on both screens, native stack), **no element
  flies**. The whole screen does Android's default zoom + cross-fade, and the image just appears.
- Reanimated 4.7 also ships an undocumented `SharedTransitionBoundary`. Wrapping each screen in it (active
  when focused) made it **worse**: the tapped print vanishes at once, and the feed shows *no image* for ~300ms
  before it pops in. Reanimated takes the view but never draws the flight.
- Frame stats (before the boundary): 25–50% janky frames per transition, 90th percentile 24–34ms.
- Still marked experimental upstream. Not worth more time; revisit when it's stable.

### B · Hand-built hero: **works; this is the v1 approach**

The first version had two bugs, both visible in the recordings and both fixed:
1. **Late flyer.** It was mounted by the same state change that started the animation, so it appeared
   ~100ms late, already near full size (our ease-out does ~80% of the travel early). Fix: a *boarding*
   phase. The flyer is parked on the source rect, and the flight only launches on the flyer image's `onDisplay`.
2. **Black flash on landing.** The flyer was removed in the same render that mounted the destination image.
   Fix: a *settling* phase. The destination mounts under the flyer, and the flyer is removed on the
   destination's `onDisplay` (300ms safety timeout).

After the fixes, a full round trip (grid → feed → reader → feed → grid): **224 frames, 14.7% janky,
90th percentile 19ms, 99th 27ms**. That's on a debug build on an emulator; a release build on a
real phone should do better. All four transitions fly continuously, land on the right rect
(including back to the grid tile), and show no flash.

State machine: `idle → boarding → flying → settling → idle` in `src/spike/hero/useHeroScene.ts`.

## Verdict (2026-11-09): **passed**

The owner marked the spike passed. v1 uses the hand-built hero (B). The items below were not
recorded as measured here; they carry into Phase 2 (Gallery), where the transitions are built for real.

### Carried into Phase 2

- **60 fps bar on the owner's phone, release build** (`npx expo run:android --variant release`).
- **Predictive back** (needs Android 13+; this emulator is Android 11). B currently handles back via
  `BackHandler`, which runs the reverse flight *after* the gesture, not *driven by* it. A gesture-driven
  reverse flight is extra work and should be judged on the phone first.
- Design feel: the curve is front-loaded (most travel in the first ~130ms), and feed text disappears
  instantly on leaving instead of fading. Both are tuning calls, not blockers.

### Environment notes (for the next person)

- GitHub release downloads (Gradle) returned 504 from `centralindia`. The wrapper points at cached Gradle 9.5.1
  in the generated `android/`; `npx expo prebuild --clean` restores 9.4.1.
- Don't run Metro with `CI=1`: it disables file watching, so edits never reach the app.
- Background shells may pick up an old system Node; use the nvm Node 22 path explicitly.
