export type KeyboardRoomInput = { readonly naming: boolean; readonly keyboardHeight: number };
export type KeyboardRoom = { readonly bottomPadding: number; readonly scrollToEnd: boolean };

/**
 * Whether Home makes room for the keyboard (#106, #111). Only Home's own ＋ New room field counts: the share sheet's
 * and Move's fields raise the same keyboard over Home, and moving Home for them left it scrolled away from the greeting.
 */
export function keyboardRoom({ naming, keyboardHeight }: KeyboardRoomInput): KeyboardRoom {
  const lifting = naming && keyboardHeight > 0;
  return { bottomPadding: lifting ? keyboardHeight : 0, scrollToEnd: lifting };
}
