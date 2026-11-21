import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';
import { useKeyboardHeight } from '@/collections/useSheetLift';

type PageHandle = ComponentRef<typeof ScrollView>;

/**
 * Room under Home's page while the keyboard is up (#106). Edge-to-edge means `adjustResize` no longer shrinks the
 * window, so the page pads itself by the keyboard and scrolls to its end, where the one field on Home (＋ New room's
 * name) sits, above the keys.
 */
export function useKeyboardRoom(attach: (view: PageHandle | null) => void) {
  const page = useRef<PageHandle | null>(null);
  const keyboardHeight = useKeyboardHeight();
  useEffect(() => {
    if (keyboardHeight > 0) page.current?.scrollToEnd({ animated: true });
  }, [keyboardHeight]);
  const ref = useCallback((view: PageHandle | null) => {
    page.current = view;
    attach(view);
  }, [attach]);
  return { ref, keyboardHeight };
}
