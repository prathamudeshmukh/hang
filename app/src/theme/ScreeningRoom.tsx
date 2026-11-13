import type { ReactNode } from 'react';
import { SCREEN_THEME, ThemeOverride } from './theme';

/** Everything inside draws on the always-dark screen colors, whatever the system theme (DESIGN.md §3). */
export function ScreeningRoom({ children }: { readonly children: ReactNode }) {
  return <ThemeOverride.Provider value={SCREEN_THEME}>{children}</ThemeOverride.Provider>;
}
