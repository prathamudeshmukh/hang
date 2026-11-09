import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { SharedTransitionBoundary } from 'react-native-reanimated';

/**
 * Reanimated 4.7 registers a native SharedTransitionBoundary that the docs don't mention.
 * Spike hypothesis: shared transitions only fire inside an *active* boundary, scoped to the
 * focused screen. If the print still doesn't fly with this, native SET is ruled out for v1.
 */
export function NativeBoundary({ children }: { readonly children: ReactNode }) {
  const isFocused = useIsFocused();
  return <SharedTransitionBoundary isActive={isFocused}>{children}</SharedTransitionBoundary>;
}
