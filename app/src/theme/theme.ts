import { createContext, useContext } from 'react';
import { useColorScheme, type ColorSchemeName, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { PALETTES, PAPER, PAPER_INK, SCREENING_ROOM, type Palette, type Scheme } from './tokens.ts';

/** `screen` is the screening room: the feed and anything opened over it. `paper*` is a room-coloured print (#85). */
export type ThemeName = Scheme | 'screen' | 'paperDarkInk' | 'paperLightInk';

export interface Theme {
  readonly name: ThemeName;
  readonly scheme: Scheme;
  readonly color: Palette;
}

const THEMES: Readonly<Record<ThemeName, Theme>> = {
  light: { name: 'light', scheme: 'light', color: PALETTES.light },
  dark: { name: 'dark', scheme: 'dark', color: PALETTES.dark },
  screen: { name: 'screen', scheme: 'dark', color: SCREENING_ROOM },
  paperDarkInk: { name: 'paperDarkInk', scheme: 'light', color: PAPER.dark },
  paperLightInk: { name: 'paperLightInk', scheme: 'dark', color: PAPER.light },
};

/** The theme for drawing on a fill whose ink is `ink`. */
export const paperTheme = (ink: string): Theme => (ink === PAPER_INK.light ? THEMES.paperLightInk : THEMES.paperDarkInk);

export const SCREEN_THEME = THEMES.screen;

/** Set by `ScreeningRoom`; null follows the system. */
export const ThemeOverride = createContext<Theme | null>(null);

/** Light or dark follows the system setting (DESIGN.md §3); unknown means light. */
export function themeFor(scheme: ColorSchemeName | null | undefined): Theme {
  return scheme === 'dark' ? THEMES.dark : THEMES.light;
}

export function useTheme(): Theme {
  const system = themeFor(useColorScheme());
  return useContext(ThemeOverride) ?? system;
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/** Styles as a function of the theme, built once per theme. Returns a hook for components. */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new Map<ThemeName, T>();
  const stylesFor = (theme: Theme): T => {
    const cached = cache.get(theme.name);
    if (cached) return cached;
    const built = factory(theme);
    cache.set(theme.name, built);
    return built;
  };
  return () => stylesFor(useTheme());
}
