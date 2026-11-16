# Hang — Design Language

**Status:** approved 2026-11-08
**Reference:** [`design/design-language.html`](./design/design-language.html), the approved
sheet with live motion demos. Earlier explorations are in [`design/explorations/`](./design/explorations/).

---

## 1. Foundations

### The frame

Other people made the content and you chose it. **Hang is the frame.** Every decision below
comes from that.

### Four principles

| Principle | Means | Test |
|---|---|---|
| **The app is the frame** | The content supplies the color; the chrome stays neutral | Cover every image: the screen should feel nearly colorless |
| **Quiet by default** | Wall, ink, space. One accent, used rarely | Vermilion covers ≤ ~2% of Home's pixels |
| **Small rewards for exploring** | Rare, earned moments of delight | Nothing loops; nothing fires more than once per visit |
| **Square to look at, round to touch** | Content has square corners, controls are round | You can tell what's tappable by shape alone |

### Feeling

**Curious on a calm base.** A good bookshop: quiet, but something keeps pulling you
further in. Not a clinical museum, not a cosy desk, not a loud scrapbook.

### How the directions were chosen

Rejected directions, so they aren't tried again by accident:
- Desk (tactile, polaroid stacks)
- Zine (bold color blocks)
- Night Sky (dark, serendipity-led)
- Canvas (infinite map)
- Soft Glass (frosted, Stories-style)
- Issue (weekly magazine)

**Chosen:** Gallery, with the "Today, then collections" Home.

---

## 2. Platform posture

Hang has its own visual identity but follows **Android behaviors**:

- Predictive back gesture (native stack via `expo-router`)
- Edge-to-edge, with transparent system bars; content draws behind them with proper insets
- Touch ripples on pressable elements (subtle, ink at 8% opacity)
- Android sheet behaviour (drag handle, swipe to dismiss)
- Respects the system font scale and the **reduce motion** setting
- **No** Material You dynamic color, **no** bottom tab bar, **no** floating action button

Navigation is a hub: Home → (Collection | Search | Inbox) → Feed → Reader. Everything is
reachable within two levels.

---

## 3. Color

### Surfaces

| Token | Light | Dark | Use |
|---|---|---|---|
| `wall` | `#F7F5F0` | `#161514` | Default background: Home, collections, search, sheets |
| `raised` | `#FFFFFF` | `#1F1E1C` | Chips, inputs, the share sheet's selected state |
| `rule` | `#E4E0D7` | `#2C2A27` | Hairlines, dividers, unselected chip borders |
| `ink` | `#1B1A17` | `#EDEAE3` | Primary text, primary buttons |
| `ink-2` | `#55514A` | `#B4AEA3` | Secondary text |
| `ink-3` | `#736E66` | `#9A958B` | Catalogue notes, placeholders (≥ 4.5:1 on wall) |
| `screen` | `#0B0B0A` | `#0B0B0A` | Screening room: swipe feed and video, **always dark** |
| `screen-ink` | `#F2EFE8` | `#F2EFE8` | Text in the screening room |

Light or dark follows the system setting. Never pure black on the wall.

### Accent: vermilion

`accent = #D2462A` (dark mode: `#E25A3E`). It's Hang's signature and is used only for:
- Save button in the share sheet
- Unsorted-Inbox dot on "Recently saved"
- Search caret and match underline
- The finish stroke on a read item
- Destructive confirmation (delete)

Nothing else. If something new "needs" an accent, use `ink` instead.

### Collections stay ink

Collections have no colour of their own (decided 2026-11-14, #34). A tint derived from their items was
dropped: it never showed on Home, where you choose between collections; keeping it ≥ 3:1 on both walls
flattened every tint into the same dusty mid-tones; and it competed with vermilion. A collection's title,
cover and prints already make it feel like its own room. Mocked and turned down along with it: a curated
set, a colour you pick, the cover flying in as a header, a wall label, staggered "lights", a contact sheet,
room numbers. A colour you choose stays a deferred idea (SPEC §3).

### Reader themes

| Theme | Background | Text |
|---|---|---|
| Light | `#F7F5F0` | `#1B1A17` |
| Sepia | `#F1E7D3` | `#3A2E1F` |
| Dark | `#161514` | `#E4DFD5` |

Defaults to the system mode; your choice is remembered.

---

## 4. Typography

**Two families, three voices.**

| Voice | Face | Rule |
|---|---|---|
| **Names** | Newsreader, upright | Anything with a name: collections, item titles, reader text |
| **Notes** | Newsreader, *italic* | Anything *about* a thing: durations, sources, dates, counts, empty states, prompts |
| **Actions** | Hanken Grotesk | Anything you *do*: buttons, filters, small card titles, inputs |

Newsreader's optical-size axis is set automatically from the point size.

### Scale

| Token | Face | Size / line | Weight | Use |
|---|---|---|---|---|
| `display` | Newsreader | 40 / 1.0, −3% | 350 | Collection title, "Good evening" |
| `title-l` | Newsreader | 30 / 1.05, −2% | 350 | Swipe feed title |
| `title` | Newsreader | 26 / 1.1, −2% | 400 | Reader headline |
| `title-s` | Newsreader | 18 / 1.15 | 400 | Section names, Rediscover, collection rows |
| `body-read` | Newsreader | 17 / 1.6 | 400 | Reader body (user can adjust 15–21) |
| `note` | Newsreader *italic* | 13 / 1.35 | 400 | Catalogue notes |
| `byline` | Newsreader | 14 / 1.3 | 400 | A post card's author, above its words |
| `label` | Newsreader *italic* | 14 / 1.35 | 400 | An imageless link's description on its wall label, in `ink-2` |
| `action` | Hanken Grotesk | 15 / 1.2 | 600 | Buttons |
| `action-s` | Hanken Grotesk | 13 / 1.2 | 600 | Chips, filters |
| `card` | Hanken Grotesk | 13 / 1.25 | 500 | Card titles in the masonry grid |
| `post-fit` | Newsreader *italic* | 40 · 36 · 30 · 26 · 22 · 19, leading 1.06–1.42 | 350 (40, 36) / 400 | A post page's words: the largest step that fits (§8) |

Minimum rendered size is 12sp for anything functional. Everything scales with the system font size.

### Catalogue notes: format

`11 min · Aeon` · `14 min · YouTube` · `post · @handle` · `saved in March` · `read · 8 Nov`

- Lowercase except proper nouns; parts separated by ` · `
- Durations: `N min` (round up); videos over an hour: `1 h 20`
- Relative dates in words ("in March", "yesterday"), never "3d ago"

---

## 5. Shape

| Element | Radius |
|---|---|
| Content (images, video frames, post cards, thumbnails, reader hero) | **2px** (`print`) |
| Buttons, chips, filters, search field | **full pill** |
| Bottom sheets | **24px** top corners (`sheet`) |
| Phone-level containers (screening room, reader) | 0 (full bleed) |

Elevation is nearly flat: no shadows on the wall. Only sheets cast one (`0 -8 24 / 25%`).
Post cards are drawn with **top and bottom rules**, not boxes.

---

## 6. Iconography and labels

- Controls are **words** in Hanken Grotesk ("Read", "Later", "Move", "Shuffle", "Save"), like
  gallery signage.
- Icons appear only for **back, search, more (⋯), play**. The set is **Phosphor Light**, 1.25px
  stroke, 22dp, colored `ink`.
- Never an icon and label together for the same action.

---

## 7. Motion

Durations: `quick 180ms` · `base 340ms` · `slow 600ms`. Easing: `cubic-bezier(.2,.7,.1,1)`
(calm ease-out). **No bounce or overshoot anywhere.**

### Continuity (the backbone)

The same print travels with you:

| From → To | Motion |
|---|---|
| Grid card → swipe feed | The tapped image grows from its grid position to full-bleed; the wall cross-fades to `screen` (340ms) |
| Feed → reader | The feed image settles into the reader's hero position; the text fades up 60ms behind |
| Back | Exact reverse, back to the item's *current* grid position |
| Home strip / Rediscover → feed | Same rule as grid cards |

The flyer moves on its own curve, `cubic-bezier(.3,0,.1,1)` over 340ms in both directions (`MOTION.flight`): the
calm ease-out made a long trip jump and then drift, so the print now lifts off before it travels. The ground under
it keeps the calm curve over the same 340ms: the wall cross-fading to `screen` going out, and the feed fading off
the wall coming back. Coming back, the feed's text leaves with the print (180ms) instead of blinking out. Chosen on
the owner's phone, 2026-11-13 (#33).

Implementation: a **hand-built hero** (Spike 0b ruled out Reanimated's native shared transitions on
Android). The flyer only launches once its image is drawn, and is only removed once the destination
image is drawn, so there's never a flash.

### Four rewards

| Moment | Motion | Frequency |
|---|---|---|
| **Rediscover develops** | Blur 8→0, saturation 0→1, brightness 1.3→1 over 1600ms | First view per day: the sight that stamps the pick |
| **Fetching fills in** | Two beats. Text lands: the card comes in from the fetching card's 50% ink (340ms); while an image is on its way its box stays dashed. Image lands: it cross-fades over the dashed box (700ms) | Once each, only while the card is on screen (grid and Recently saved) |
| **Entering a room** | A 2px ink underline draws left to right under the collection title (600ms), once the push has settled. Not in the Inbox | Each entry into a collection |
| **Finishing a read** | One vermilion stroke strikes through "unread", then *read · 8 Nov* fades in | Once, on reaching ~95% |

### Reduce motion

When the system setting is on: every transition becomes a 120ms crossfade, and the rewards
show their end state instantly. Nothing is lost except the movement itself.

### Haptics

Light tick on Save, on moving an item, and on the finish moment. Nowhere else.

---

## 8. Components

### Cards (masonry grid)

| Kind | Anatomy |
|---|---|
| `article` | Lead image at its real aspect ratio (no image → title set in Newsreader on `raised`) · card title · *note: `9 min · site`* |
| `video` | Thumbnail at its aspect ratio with a centred play triangle · title · *`14 min · YouTube`*. Cards that open another app show *`opens in TikTok`* |
| `post` | Between two hairline rules: the author's name in upright Newsreader (14), then the text in Newsreader italic; media below, if any · *`post · 3 Nov`* (when it was posted). No name → `@handle` in its place; no date → *`post · @handle`* |
| `image` | Image at its aspect ratio · title, if any · *`image · pinterest.com`* / *`image · screenshot`* |
| `link` | Open Graph image · title · *`site`*. **No image: a wall label** on `raised`: the title in Newsreader (`title-s`, 4 lines), then the site's description in `label` (italic, `ink-2`, 4 lines); below it only *`site`*, so the site appears once. No description → the title alone |
| pending | Dashed `ink-3` outline at a 4:5 ratio · *`fetching…`* · the raw URL below at 50% opacity |
| failed | Same as `link` from whatever was found; *`couldn't read this · retry`* |

Grid: 2 columns, 10dp gutter, 14dp vertical rhythm, 16dp screen margins.

Reviewed kind by kind on 2026-11-16 (`.lavish/print-kinds.html`). Posts gained their author and links their wall label.
Mocked and turned down: serif titles and a "first page" for articles; a film-black mat or a corner stamp instead of
the play disc on videos; a hanging quote mark for posts (breaks the ruled post); a bare print or source-only note for
images; the host as a nameplate for links (every link from one site still looks the same).

### Share sheet

Appears translucent over the source app, with a 40% black scrim.

1. Drag handle
2. Item preview: a 50dp print + title (Newsreader 17) + *`aeon.co · reading it now…`*
3. Prompt: **Where does it hang?** (Newsreader 15)
4. Collection chips (pills), last-used or AI pick selected (`ink` fill), plus a *＋ New* chip
5. Footer: *Swipe down to leave it in Inbox* (note) · **Save** (vermilion pill)

**A link it already has** (#19): the item's real print and title; the note says *already hanging in Tech · since
3 Nov* (or *already in your Inbox · since yesterday*), or for a read one the finish stroke through *unread* then
*read · 8 Nov · in Tech*. Its collection's chip is selected and there's no button: *Swipe down to leave it in Tech*.
Picking another chip brings Save and *Moves it from Tech*. Re-sharing doesn't bump it in Recently saved.

### Swipe feed (screening room)

Media fills the top ~56%; below it are the note, title (`title-l`) and a one-to-two-line summary.
**Link pages** (#54): a link has nothing behind *Open* but the site, so its page says more: the description runs to five
lines, and the note adds how long it has hung (*aeon.co · saved 3 days ago*: today, yesterday, 2–6 days ago, last
week, 2–4 weeks ago, then *in March*, or *in March 2025* from another year). Other kinds keep their note and two lines.
Actions are pills: **Read/Watch** (filled `screen-ink`), **Later**, **Move**. Swipe up
for the next item. The counter appears as a note in the top-right: *4 of 12*.

**By kind, once opened** (chosen 2026-11-16, `.lavish/print-opened.html`). The main pill keeps one plain word:
**Read**, **Watch** or **Open**, whether or not it leaves Hang.

| Kind | Feed page | Main pill |
|---|---|---|
| `article` | Its **opening lines** in `body-read` (`ink-2`) take the summary's place, so reading starts on the feed; no reader text → the summary | **Read** (or a tap on the text) continues in the reader at the next line; no reader text → Custom Tab |
| `video` | Plays **muted** once its page settles, with a hairline progress line along the bottom of the frame; it stops when you swipe away | **Watch** (or a tap on the frame) goes full screen in the screening room, with sound. Videos that can't play inline open their app |
| `post` | **The post is the page, set as a broadside** (see *Post pages* below) | **Move** is filled; **Open** (to the post on its site) is the outlined pill, since the snapshot is usually enough |
| `image` | **Full bleed**: the image fills the page, fit whole on `screen`; the note and pills sit on a shade at the bottom. Tap hides them, pinch zooms | **Move** is filled; **Open** goes to the source |
| `link` | As above (#54) | **Open** → Custom Tab |

Turned down: Read going straight to the reader (an article first shows a summary), video playing only when asked, a
post with its media on top, a tap-to-zoom image on the usual split page, and pills that name their destination
(*Open in X*, *Watch in TikTok*).

**Post pages: a broadside** (approved 2026-11-16, `.lavish/post-feed-page.html`; the contract is in
`.impeccable/surfaces/app-src-feed-feedmediaview-tsx.md`). The words are sized until they own the page.

- **Order, top to bottom:** the note (*post · 3 Nov*; no posted date → *post · x.com*), the words, the imprint,
  then (with media) one `rule` hairline seam and the pictures. Pills at the foot; the spare room sits above them.
- **One fitted size:** the words are Newsreader italic at the largest step of **40 · 36 · 30 · 26 · 22 · 19sp** that
  fits between the note and the imprint (the `post-fit` ladder, §4). 40 and 36 use the 350 weight. The ladder is the
  only freedom: sizes are never in-between.
- **Never scrolls:** swiping is the feed's navigation. Below 19sp the words stop with an ellipsis, and Open has the
  rest. At large system font scales the same ladder scales and clamps the same way.
- **Imprint, not a header:** directly under the last line, the author's name in upright Newsreader 16 then
  *@handle* in `screen-ink` at 64%. No name → *@handle* alone. Who said it signs the words; it never comes first.
- **The picture answers:** across the seam, at its own shape, capped at 40% of the page height (a tall picture sits
  narrower, left-aligned). Several pictures sit in one strip at one height, in posting order; tapping one opens it
  full screen, as image pages do. The words fit the space left above.
- **No quote marks, boxes, avatars or counts.** The grid print's two rules fade out on the way in: the page has no frame.
- **Arrival:** the hero flight lands the print on the words' place and scales it on the flight curve; its rules
  fade, the words settle at their fitted size, and the imprint and pills fade in 120ms behind. Reduce motion: a
  120ms cross-fade.

Mocked and turned down for post pages: a pull quote (centred, no rules), the grid print scaled up between rules, a
signed letter with a square avatar, an epigraph (small, isolated) and subtitles over the picture.

### Reader

Full-bleed hero image · note · headline · byline note · body in `body-read` with a drop cap
on the first paragraph · a 2px progress bar in the reader theme's text colour at the top. Long press
selects text (no highlights in v1). Theme and size controls sit in a bottom sheet opened by
tapping the page once.

---

## 9. Copy voice

Short, warm and literal. Gallery language used lightly: *hang*, *wall*, *room*, never forced.

| Context | Copy |
|---|---|
| Share prompt | Where does it hang? |
| Dismiss hint | Swipe down to leave it in Inbox |
| Greeting | Good morning / Good afternoon / Good evening |
| Empty collection | An empty wall. Share anything from another app to hang it here. |
| Empty search | Nothing hangs under that name yet. |
| Fetch failed | couldn't read this · retry |
| Offline share | fetching… |
| Delete confirm | Take it down? (vermilion **Take down**) |

---

## 10. Accessibility

- Text contrast meets AA (4.5:1 body; 3:1 large text and UI), verified for every token in both themes
- Touch targets ≥ 48dp, including chips
- Every card has a content description built as *"{kind}, {title}, {note}"*
- Supports system font scale up to 200%; the masonry grid drops to one column above 150%
- Reduce motion respected (§7)
- Video never autoplays with sound
