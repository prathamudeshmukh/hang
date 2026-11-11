import { v7 } from 'uuid';
import type { Clock } from './types.ts';

const UUID_RANDOM_BYTES = 16;

export interface IdGeneratorDeps {
  /** Cryptographically secure bytes; Hermes has no `crypto.getRandomValues`, so the device passes expo-crypto's. */
  readonly randomBytes: (size: number) => Uint8Array;
  readonly clock: Clock;
}

/**
 * Client-generated UUIDv7 row ids (SPEC §5), ordered by millisecond. Passing our own bytes skips uuid's
 * in-millisecond counter, so two ids from the same millisecond are unique but not ordered.
 */
export function createIdGenerator({ randomBytes, clock }: IdGeneratorDeps): () => string {
  return () => v7({ random: randomBytes(UUID_RANDOM_BYTES), msecs: clock.now() });
}
