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

### Surfaces: the Sage room

The pale grey-green that print rooms paint their walls, with green-black ink. Green sits opposite vermilion, so the
accent carries further at the same small size. Chosen 2026-11-18 (#79) from four mocked directions
(`.lavish/color-directions.html`): *Tuned* (today's warm paper with the failures fixed), *Limewash* (chalky, warmer)
and *Ultramarine* (cool white, blue accent, dropping vermilion) were turned down.

| Token | Light | Dark | Use |
|---|---|---|---|
| `wall` | `#EDF0EA` | `#161C18` | Default background: Home, collections, search, sheets |
| `wallDeep` | `#E2E7DE` | `#111612` | The feature wall: Today on Home (greeting, Recently saved, Rediscover) |
| `raised` | `#F9FAF6` | `#202823` | Chips, inputs, the share sheet's selected state |
| `rule` | `#D6DCD2` | `#323C35` | Hairlines, dividers, unselected chip borders |
| `ink` | `#151D18` | `#E6ECE6` | Primary text, primary buttons |
| `ink-2` | `#46524A` | `#AAB6AD` | Secondary text |
| `ink-3` | `#5A665E` | `#8F9C92` | Catalogue notes, placeholders (≥ 4.5:1 on wall, raised and wallDeep) |
| `screen` | `#080A09` | `#080A09` | Screening room: swipe feed and video, **always dark** |
| `screen-ink` | `#EEF2EC` | `#EEF2EC` | Text in the screening room |
| `screen-rule` | screen-ink at 30% | same | Outlined pills and hairlines in the screening room |

Light or dark follows the system setting. Never pure black on the wall. The dark wall stays a clear step above
`screen` (≥ 1.12:1), so going into the feed still reads as entering another room in dark mode.

### The feature wall

Galleries paint the wall behind the main piece a shade deeper. On Home, Today (greeting, Recently saved,
Rediscover) sits on `wallDeep`, bleeding to the screen edges and up behind the status bar; the collections hang on
the plain wall below. It is a tone, never an accent, and appears nowhere else.

### Accent: vermilion

`accent = #C23B20` (dark mode: `#F0714F`). It's Hang's signature and is used only for:
- Save button in the share sheet
- Unsorted-Inbox dot on "Recently saved"
- Search caret and match underline
- The finish stroke on a read item
- Destructive confirmation (delete)

Nothing else. If something new "needs" an accent, use `ink` instead.

Text on the accent (the Save and Take down labels) is `onAccent`: white in light mode, the dark wall's green-black
in dark mode, ≥ 4.5:1 in both. (The old screen-ink label measured 3.9:1 and 3.2:1.)

### A collection's colour comes from its pictures

Each collection takes a rich colour from its own pictures (decided 2026-11-19, #85; reverses #34's "collections stay
ink"). The icon's tiles stand in for what you save; a room coloured by what you saved ties the app to its icon.
It avoids #34's problem because the colour is always a filled area with ink chosen for it, never a coloured line or
text that has to clear 3:1 on both walls.

**How it's chosen** (on the device, after every sync; `src/rooms/`): the collection's newest 12 live items with a
palette vote with `palette.vibrant ?? palette.dominant`. Greyish colours (saturation < 0.15, lightness < 0.08 or
> 0.92) are dropped; the rest group into 12 hue families of 30°. Weight = recency (newest 1.0, −0.05 per step) ×
kind (link previews 0.5, often logos; everything else 1.0). The heaviest family wins and its colours are averaged.
The current family stays until another outweighs it by 25%.
All grey → a grey room (the wall's grey-green). No pictures → one of the icon's colours (ochre, teal, rose, blue;
never vermilion, and not sage, which passes for a grey room), fixed by the collection's id.

**Made rich:** lightness 0.30–0.50 on the light wall; 0.22–0.38 with a little less saturation on the dark wall, so
it doesn't glow. **Reds** (hue 345°–25°) go deep to oxblood (saturation ≤ 0.5, lightness 0.22–0.32; dark 0.18–0.28) so a
red room never passes for vermilion. A room's three print colours are **shades of its one hue**: the colour, a
lighter and a darker one (0.08 apart, closer in a narrow range), so neighbours differ but a print's hue always says
which room it hangs in (decided 2026-11-20). Every fill is a gentle
gradient whose two ends both clear 4.5:1 with its ink: ink `#151D18` or screen ink `#EEF2EC`, whichever reads
better; a colour that can't is pushed away from its ink until it does. Inside a fill every ink is that one ink.

| Where | How |
|---|---|
| Home · collections | A 3dp frame of the colour round the cover; no picture → the cover is the colour |
| Collection header | The title painted in the colour from the top of the screen (behind the status bar) to just under the underline; the underline draws in its ink; the status bar icons follow it until it scrolls away. Kind filters, Shuffle and notes stay on the wall |
| Prints without a picture | Articles without an image, videos without a poster, wall-label links, failed reads: on one of the room's three shades, picked by the item's id, the same in the collection, Recently saved and Rediscover |
| Fetching | A print still being read, and a picture still downloading, wait on their colour with *fetching…* instead of a dashed outline; the picture cross-fades over it. One that never comes or fails to load leaves the colour |
| Hero | A text print's frame flies from its colour to the screening room's, and back |

**Never tinted:** a print's picture; posts (ruled, unboxed); unsorted items (plain paper and the dashed outline:
colour means "hung in a room"); chips, Shuffle, kind filters, the share sheet and Move; vermilion's five uses; the
screening room. Moving an item gives it the new room's colour.

Turned down along the way: a colour per item (a mosaic), the mark beside the greeting, a painted feature wall,
assigned icon colours per collection. A colour you choose stays a deferred idea (SPEC §3).

### Reader themes

| Theme | Background | Text |
|---|---|---|
| Light | `#EDF0EA` | `#151D18` |
| Sepia | `#EEE7D4` | `#33291C` |
| Dark | `#161C18` | `#E6ECE6` |

Light and dark are the Sage room's wall and ink; sepia is tuned to sit beside them. Defaults to the system mode;
your choice is remembered.

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

`11 min · Aeon` · `14 min · YouTube` · `post · 3 Nov` · `saved in March` · `read · 8 Nov`

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
- **App icon:** the mosaic (#74, chosen on the phone 2026-11-18): a masonry of colour tiles on wall-coloured
  gutters. What you keep supplies the colour, as in the app. Themed icons and the splash show the same masonry as
  four tiles inside the 66dp safe zone. Rejected: nail, frame, wire and letter marks; inked texture; a clothes peg.
  Explorations: `design/explorations/06`–`09`.

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
| `article` | Lead image at its real aspect ratio (no image → title set in Newsreader on `raised`, or its room's colour, §3) · card title · *note: `9 min · site`* |
| `video` | Thumbnail at its aspect ratio with a centred play triangle · title · *`14 min · YouTube`*. Cards that open another app show *`opens in TikTok`* |
| `post` | Between two hairline rules: the author's name in upright Newsreader (14), then the text in Newsreader italic; media below, if any · *`post · 3 Nov`* (when it was posted). No name → `@handle` in its place; no date → *`post · x.com`* (the site: the handle is already in the byline, #59) |
| `image` | Image at its aspect ratio · title, if any · *`image · pinterest.com`* / *`image · screenshot`* |
| `link` | Open Graph image · title · *`site`*. **No image: a wall label** on `raised`: the title in Newsreader (`title-s`, 4 lines), then the site's description in `label` (italic, `ink-2`, 4 lines); below it only *`site`*, so the site appears once. No description → the title alone |
| pending | Dashed `ink-3` outline at a 4:5 ratio (in a collection: its room's colour, §3) · *`fetching…`* · the raw URL below at 50% opacity |
| failed | Same as `link` from whatever was found; *`couldn't read this · retry`* |

Grid: 2 columns, 10dp gutter, 14dp vertical rhythm, 16dp screen margins.

Reviewed kind by kind on 2026-11-16 (`.lavish/print-kinds.html`). Posts gained their author and links their wall label.
Mocked and turned down: serif titles and a "first page" for articles; a film-black mat or a corner stamp instead of
the play disc on videos; a hanging quote mark for posts (breaks the ruled post); a bare print or source-only note for
images; the host as a nameplate for links (every link from one site still looks the same).

### Empty Home: the how-to (#75)

While no live item is on the device, the feature wall teaches the one thing nobody can discover: things get in by
sharing from another app. Under the heading *Things get here from other apps.* hang three 88dp square prints in a
column, each with its step beside it like a wall label (the name in `title-s`, a note in `note`, `ink-2`). The
drawings are flat blocks of ink at low alpha (`SKETCH` in `tokens.ts`): another app's page, the same page with its
Share button in solid ink under a tap halo, then a share sheet whose row holds Hang's mark in full colour. A washed-teal
picture travels from the page to the sheet's preview; it and the mark are the only colour. Nothing is tappable.
It returns whenever the wall empties.

While the first pull is still bringing an account's wall onto a new device: *Bringing your wall over…* over three
dashed strip-size frames, where a returning user's prints are about to land.

Chosen from four rounds of sheets (`design/explorations/10`–`13`); turned down: line drawings, numbered wall text,
strip-size prints in a row (too small, too busy), masonry, one large share sheet, a sideways strip.

### Sign-in (#77)

Hang's four-tile mark at 56dp, then *Hang* (`display`) and the tagline (`prompt`), the Google pill (filled) at the foot.
On a device nobody owns with links already shared, the tagline becomes the count: *3 links waiting to hang. Sign in to
keep them.* A session that ended on its own keeps its owner, so it shows the pitch.

The splash fades out over the screen with the mark already in place; nothing travels. A settle from the splash's
mark was built and dropped (2026-11-19): expo-splash-screen holds back the app's first frame until the splash is
released, so on the S23 the hand-over showed a blank frame or the mark already moving.

Chosen from `design/explorations/14-sign-in.html` (direction A, without its motion); turned down: the full mosaic
as the one piece on the wall, a dashed frame per waiting link, the waiting links as wall labels.

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
Actions are pills: **Read/Watch** (filled `screen-ink`), **Later**, **Move**.
**Projector spill** (#79): under a page with a picture, the picture itself, mirrored, blurred (radius 40) and at
32%, glows down the top 70% of the room below the media box and fades into `screen`, as if the screen were lit by
what's on it. The colour only ever comes from that page's picture; it leaves with the text on the way back. Not on
post, image or text pages. Swipe up
for the next item. The counter appears as a note in the top-right: *4 of 12*.

**By kind, once opened** (chosen 2026-11-16, `.lavish/print-opened.html`). The main pill keeps one plain word:
**Read**, **Watch** or **Open**, whether or not it leaves Hang.

| Kind | Feed page | Main pill |
|---|---|---|
| `article` | Its **opening lines** in `body-read` (`ink-2`) take the summary's place, so reading starts on the feed: as many whole lines as fit between title and pills, cut with an ellipsis, a blank line between paragraphs, no drop cap. With no picture it's a **text page**: no media box, the note and title (`title-l`) sit where a post's note does and the opening runs down to the pills; the print's frame lands on that text block. No reader text → the summary (#61) | **Read** (or a tap on the text) continues in the reader at the next line; no reader text → Custom Tab |
| `video` | Plays **muted** once its page settles, with a hairline progress line along the bottom of the frame; it stops when you swipe away | **Watch** (or a tap on the frame) goes full screen in the screening room, with sound. Videos that can't play inline open their app |
| `post` | **The post is the page, set as a broadside** (see *Post pages* below) | **Move** is filled; **Open** (to the post on its site) is the outlined pill, since the snapshot is usually enough |
| `image` | **Full bleed**: the image fills the page, fit whole on `screen`; the note and pills sit on a shade at the bottom. Tap hides them, pinch zooms (see *Image pages* below) | **Move** is filled; **Open** goes to the source |
| `link` | As above (#54) | **Open** → Custom Tab |

Turned down: Read going straight to the reader (an article first shows a summary), video playing only when asked, a
post with its media on top, a tap-to-zoom image on the usual split page, and pills that name their destination
(*Open in X*, *Watch in TikTok*).

**Image pages** (#60, decided 2026-11-17).

- **Zoom:** pinch, or double-tap at a spot: 2.5×, or until it fills the width for an image taller than the screen
  (a long screenshot becomes a readable column). Double-tap again → 1×. At most 5×. A pan stops at the image's
  edges with a little give, then eases back; no bounce.
- **Zoomed, the image holds the screen:** swipes pan instead of changing items, and back zooms out before it closes
  the feed.
- **Sharp when it matters:** past 1.2× the original image loads from its source and cross-fades over the thumbnail.
  Offline, or refused by the site, the thumbnail stays.
- **Chrome:** a tap hides everything (both shades, note, title, pills, counter, status bar); zooming hides it too.
  Only a tap brings it back; every new page starts with its chrome. Reduce motion: no fade.
- **Hero:** the flight lands on the image's rect fitted to the whole page.

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
  full screen, as image pages do. The words fit the space left above. For now only the first picture shows (#64).
- **No words** (a picture-only post): the picture takes the words' place, at its own shape in the room they'd have
  had, with no seam; the imprint signs under it.
- **A tap on the words does nothing:** they're already read whole, and Open sits at the foot.
- **No quote marks, boxes, avatars or counts.** The grid print's two rules fade out on the way in: the page has no frame.
- **Arrival:** the hero flight lands the print on the words' place (the measure, top-aligned under the note, at the
  print's own shape) and scales it on the flight curve; its rules
  fade, the words settle at their fitted size, and the imprint and pills fade in 120ms behind. Reduce motion: a
  120ms cross-fade.

Mocked and turned down for post pages: a pull quote (centred, no rules), the grid print scaled up between rules, a
signed letter with a square avatar, an epigraph (small, isolated) and subtitles over the picture.
The flight carries a blank print that fades into the screen as it lands (chosen 2026-11-16, #59); flying the print's own
words and scaling them into the page was turned down as not worth new flight code.

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
| Empty Home (how-to, #75) | Things get here from other apps. · **Open anything**: A page, a video, a post: whatever you’re looking at. · **Tap Share**: Usually in the top bar, or under ⋮. · **Pick Hang**: It may be under More. |
| First pull on a new device | Bringing your wall over… |
| Sign-in, shares waiting | 1 link waiting to hang. Sign in to keep it. / 3 links waiting to hang. Sign in to keep them. |
| New collection (sheet, Move) | **+ New** chip · placeholder: Name the room |
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
