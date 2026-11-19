import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', (event) => setHeight(event.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}

/**
 * A bottom sheet's place while + New is being named (#76): edge-to-edge means `adjustResize` no longer shrinks the
 * window, so the sheet sits on the keyboard itself. The nav-bar padding stays: on API 30+ the reported height can
 * leave out the nav bar, and a little air beats a footer under the keys.
 */
export function useSheetLift(padding: number) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  return { bottom: keyboardHeight, paddingBottom: insets.bottom + padding };
}
