export interface SpikeItem {
  readonly id: string;
  readonly title: string;
  readonly note: string;
  /** width / height, so the masonry reserves the right space before the image loads. */
  readonly aspect: number;
}

const PICSUM_IDS = [10, 11, 15, 16, 17, 18, 20, 22, 24, 27, 28, 29, 36, 37, 39, 40] as const;
const ASPECTS = [0.75, 1.33, 1, 0.66, 1.5, 0.8, 1.2, 0.7] as const;
const TITLES = [
  'Swiss posters, 1955–1970',
  'The slow death of the hyperlink',
  'How Pentagram designs a logo',
  'On boredom, and why it matters',
  'Kitchen colour study',
  'A lecture on attention',
  'Reading slowly on purpose',
  'Notes on a quiet interface',
] as const;
const NOTES = ['9 min · Aeon', '14 min · YouTube', 'image · pinterest.com', 'screenshot', '11 min · essay'] as const;

export const ITEMS: readonly SpikeItem[] = PICSUM_IDS.map((picsumId, index) => ({
  id: String(picsumId),
  title: TITLES[index % TITLES.length] ?? 'Untitled',
  note: NOTES[index % NOTES.length] ?? '',
  aspect: ASPECTS[index % ASPECTS.length] ?? 1,
}));

const IMAGE_WIDTH = 900;

export function imageUri(item: SpikeItem): string {
  const height = Math.round(IMAGE_WIDTH / item.aspect);
  return `https://picsum.photos/id/${item.id}/${IMAGE_WIDTH}/${height}`;
}

export function findItem(id: string | undefined): SpikeItem | undefined {
  return ITEMS.find((item) => item.id === id);
}

export const READER_BODY = [
  'There was a time when the web pointed outward. Every page was a doorway, and following links was how you found the next thing worth reading.',
  'Somewhere along the way the doors started closing. Platforms discovered that every outbound link was a reader walking out, and they quietly began to discourage them.',
  'What we lost was not just traffic but a habit of mind. Following a link is an act of curiosity; it says the thing in front of you is not the whole story.',
] as const;
