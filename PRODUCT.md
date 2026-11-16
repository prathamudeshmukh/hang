# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

## Users

One user, the owner, on one Android phone. They come across articles, videos, posts and images in other
apps during the day and want to keep them without stopping to file them. Later, usually in a quieter moment,
they browse what they kept. Nothing is built for other users in v1, but auth, row-level security and no
on-device secrets keep a public release possible.

## Product Purpose

A personal gallery for things found online. Share a link from any Android app into Hang, hang it in a
collection, and later browse each collection as a moodboard (masonry grid) and a lean-back swipe feed, with a
reader for anything long. Success: saving takes one question at most ("Where does it hang?", which can be
skipped), and saved things come back instead of rotting in a backlog.

## Positioning

**The app is the frame.** Other people made the content and you chose it; Hang hangs it well. The content
supplies the colour and the frame stays quiet. Unlike read-later lists, mixed content (articles, videos,
posts, images, links) gets a print designed for each kind, hung together on one wall, and old saves resurface
through Shuffle and a daily Rediscover.

## Operating Context

- Saving happens from the Android share sheet, over whatever app the user is in; it must never wait on the
  network, extraction or AI.
- Browsing: Home → collection grid → swipe feed (always dark, the "screening room") → reader.
- A Supabase backend does extraction server-side; the phone only sends a URL or file and syncs results.

## Capabilities and Constraints

- Expo / React Native, Android primary; iOS later, if ever.
- Five card kinds: article, video, post, image, link. Posts (X) are stored as a snapshot (author, handle,
  avatar URL, text, media, posted date) at save time.
- Every saved link degrades to a good card, never to an error.
- No re-hosting of video; YouTube, Vimeo and direct files play inline, others open their app.
- Phase plan and status live on GitHub Project #4; SPEC.md holds the agreed decisions.

## Brand Commitments

- Name: Hang. Copy voice: short, warm, literal; gallery language (*hang*, *wall*, *room*) used lightly.
- "Where does it hang?" is the only question asked at save time.
- The approved design language (DESIGN.md, 2026-11-08) is binding.

## Evidence on Hand

- Real saved content on the owner's account; the extraction spike's 30 HN links (`spikes/extraction/hn-links.txt`).
- No users, testimonials or metrics beyond the owner. Do not invent any.

## Product Principles

1. The frame stays quiet; the content leads.
2. Saving never waits.
3. Degrade to a good card, never to an error.
4. Small, earned rewards for coming back; nothing loops or nags.

## Accessibility & Inclusion

Respects the system font scale (to 200%) and reduce-motion; AA contrast in both themes; 48dp touch targets;
every card has a spoken description.
