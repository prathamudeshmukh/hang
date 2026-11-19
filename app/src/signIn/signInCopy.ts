/** The sign-in tagline (DESIGN.md §9): the pitch, or what a first sign-in would keep (#77). */
const PITCH = 'Your links, hung on one wall.';

export function signInTagline(waiting: number): string {
  if (waiting <= 0) return PITCH;
  if (waiting === 1) return '1 link waiting to hang. Sign in to keep it.';
  return `${waiting} links waiting to hang. Sign in to keep them.`;
}
