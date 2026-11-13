import { db } from '@/db/client';
import { createItemsRepository } from '@/db/itemsRepository';
import { systemClock } from '@/db/types';
import { createOpenItem, errorMessage } from './openItem';
import { openLink } from './openLink';

const items = createItemsRepository({ db, clock: systemClock });
const warn = (message: string) => console.warn(message);

/** The feed's Read/Watch/Open (#31); grid, strip and Rediscover taps open the feed instead. */
export const openItem = createOpenItem({ markOpened: items.markOpened, openUrl: openLink, warn });

/** Today's Rediscover pick, stamped on first show so it holds for the day (SPEC §5). */
export function stampRediscovered(id: string, day: string): void {
  try {
    items.markRediscovered(id, day);
  } catch (error) {
    warn(`Could not stamp today's Rediscover: ${errorMessage(error)}`);
  }
}
