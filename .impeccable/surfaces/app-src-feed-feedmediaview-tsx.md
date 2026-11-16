---
version: 1
slug: "app-src-feed-feedmediaview-tsx"
primary_target: "app/src/feed/FeedMediaView.tsx"
related_targets: ["app/src/feed/FeedPageView.tsx","app/src/feed/feedStyles.ts",".lavish/post-feed-page.html"]
---

# Post feed page

Scope: one page of the swipe feed (screening room) when the item is a `post`. Mode: Experience; the words lead.
Audience and job: the owner, browsing a collection lean-back, meets a post they saved; they read it whole without
leaving Hang, then Move it or swipe on. Constraints: DESIGN.md is binding (screen palette, Newsreader/Hanken, 2px
print corners, pills); no scrolling inside a page (vertical swipe is navigation); system font scale to 200%; the
hero flight from the grid print lands on this page. Content: post snapshot (author, handle, text, media[], posted_at),
any of which except text may be missing.
Deliverable this round: a refined HTML mockup with every state, approved before code (#59).

## Direction contract

THESIS: The post is set like a broadside: its words are sized per post until they own the page, and the
author signs it in an imprint line. It refuses the social-card arrangement (avatar, name, text, media, counts) and
the generic "quote card" with a centred block.

OWN-WORLD: Hang's screening room unchanged: `screen` ground, `screen-ink` text, `rule` hairline, Newsreader italic
for the words at one fitted size, upright Newsreader for the author, notes in italic `screen-ink` at 64%, Hanken
pills (Move filled, Open outlined). No new colour, no quote marks, no boxes.

STORY: The owner sees the words first and large, reads them whole, sees who said it in the imprint, and if there's
a picture it answers the words across one hairline. Then Move or swipe.

FIRST VIEWPORT: Counter top right. Note (`post · yesterday`) top left at the content inset. The words fill the
measure margin to margin in Newsreader italic at the largest step (36/30/26/22/19sp) that fits the block between the
note and the imprint; the imprint (`Tom Hale @tomhale`) sits directly under the last line. With media: a single
hairline seam, then the picture at its own shape, and the words fit the space left above it. Pills at the foot.

FORM: Broadside, position 3 of 7 on the grounded list; raised by Brodovitch Bazaar spread (words pose, the picture
answers across one seam). seed:270728d6c8615ec7

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Resolved (#59, 2026-11-16): steps 40 · 36 · 30 · 26 · 22 · 19sp, clamp below 19; a strip in the design, the first
picture only until #64; the flight lands on the words' place (measure-wide, top-aligned under the note). Built in
`app/src/feed/post/` (`PostPageView.tsx`), not `FeedMediaView.tsx`.
