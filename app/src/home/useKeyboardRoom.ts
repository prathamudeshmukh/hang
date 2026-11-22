import { useCallback, useEffect, useRef, type ComponentRef } from 'react';
import type { ScrollView } from 'react-native';
import { useKeyboardHeight } from '@/collections/useSheetLift';
import { keyboardRoom } from './keyboardRoom';

type PageHandle = ComponentRef<typeof ScrollView>;

/**
 * Room under Home's page while ＋ New room's name is typed (#106). Edge-to-edge means `adjustResize` no longer shrinks
 * the window, so the page pads itself by the keyboard and scrolls to its end, where that field sits, above the keys.
 * Any other keyboard leaves Home as it is (#111).
 */
export function useKeyboardRoom(attach: (view: PageHandle | null) => void, naming: boolean) {
  const page = useRef<PageHandle | null>(null);
  const { bottomPadding, scrollToEnd } = keyboardRoom({ naming, keyboardHeight: useKeyboardHeight() });
  useEffect(() => {
    if (scrollToEnd) page.current?.scrollToEnd({ animated: true });
  }, [scrollToEnd, bottomPadding]);
  const ref = useCallback((view: PageHandle | null) => {
    page.current = view;
    attach(view);
  }, [attach]);
  return { ref, bottomPadding };
}
