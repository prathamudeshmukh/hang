/** Resolves on the next frame, after React Native has had a chance to lay out and draw. */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
