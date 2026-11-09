export interface BackoffPolicy {
  readonly baseMs: number;
  readonly maxMs: number;
}

/** Delay before retry number `attempt` (1-based): base, 2×base, 4×base, … up to the cap. */
export function backoffMs(attempt: number, policy: BackoffPolicy): number {
  const exponent = Math.max(attempt, 1) - 1;
  return Math.min(policy.baseMs * 2 ** exponent, policy.maxMs);
}
