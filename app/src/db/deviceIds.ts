import { getRandomValues } from 'expo-crypto';
import { createIdGenerator } from './newId';
import { systemClock } from './types';

/** Row ids for anything created on this device. */
export const newId = createIdGenerator({
  randomBytes: (size) => getRandomValues(new Uint8Array(size)),
  clock: systemClock,
});
