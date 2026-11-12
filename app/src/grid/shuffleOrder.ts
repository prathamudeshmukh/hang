const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const SEED_RANGE = 2 ** 32;

/** FNV-1a with a murmur finaliser, so neighbouring seeds give unrelated orders. */
function hash(text: string): number {
  let value = FNV_OFFSET;
  for (let index = 0; index < text.length; index += 1) {
    value = Math.imul(value ^ text.charCodeAt(index), FNV_PRIME);
  }
  value = Math.imul(value ^ (value >>> 16), 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35);
  return (value ^ (value >>> 16)) >>> 0;
}

export function newSeed(random: () => number = Math.random): number {
  return Math.floor(random() * SEED_RANGE);
}

/**
 * SPEC §5 Shuffle. Each card's place depends only on the seed and its own id, so a new card lands
 * somewhere without moving the rest, and a filtered wall keeps the shuffled wall's relative order.
 */
export function shuffleOrder<T extends { readonly id: string }>(cards: readonly T[], seed: number): readonly T[] {
  const keyed = cards.map((card) => ({ card, key: hash(`${seed}:${card.id}`) }));
  const sorted = [...keyed].sort((a, b) => a.key - b.key || (a.card.id < b.card.id ? -1 : 1));
  return sorted.map(({ card }) => card);
}
