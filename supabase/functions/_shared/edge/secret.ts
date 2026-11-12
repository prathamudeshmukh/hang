const BEARER = 'Bearer ';

/** Constant-time over the longer of the two, so timing doesn't reveal a matching prefix or the length. */
function timingSafeEqual(a: string, b: string): boolean {
  const [left, right] = [new TextEncoder().encode(a), new TextEncoder().encode(b)];
  const length = Math.max(left.length, right.length);
  let diff = left.length ^ right.length;
  for (let i = 0; i < length; i += 1) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

/** Callers are DB triggers, not clients: they prove themselves with a shared secret (SPEC §7). */
export function hasBearerSecret(req: Request, secret: string): boolean {
  const header = req.headers.get('authorization') ?? '';
  if (secret.length === 0 || !header.startsWith(BEARER)) return false;
  return timingSafeEqual(header.slice(BEARER.length), secret);
}
