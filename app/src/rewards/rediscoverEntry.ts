/** How today's Rediscover print appears (DESIGN.md §7 "Rediscover develops"). */
export type RediscoverEntry = 'develop' | 'developed';

export interface RediscoverSight {
  /** Whether the pick already carried today's stamp when this Home first drew it. */
  readonly stampedWhenFirstShown: boolean;
  readonly reduceMotion: boolean;
}

/** Develops once a day: on the sight that stamps the pick (SPEC §5), never again until tomorrow's pick. */
export function rediscoverEntry({ stampedWhenFirstShown, reduceMotion }: RediscoverSight): RediscoverEntry {
  return stampedWhenFirstShown || reduceMotion ? 'developed' : 'develop';
}
