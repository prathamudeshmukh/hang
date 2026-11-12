import { useColorScheme, type ColorSchemeName, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';
import { PALETTES, type Palette, type Scheme } from './tokens.ts';

export interface Theme {
  readonly scheme: Scheme;
  readonly color: Palette;
}

const THEMES: Readonly<Record<Scheme, Theme>> = {
  light: { scheme: 'light', color: PALETTES.light },
  dark: { scheme: 'dark', color: PALETTES.dark },
};

/** Light or dark follows the system setting (DESIGN.md §3); unknown means light. */
export function themeFor(scheme: ColorSchemeName | null | undefined): Theme {
  return scheme === 'dark' ? THEMES.dark : THEMES.light;
}

export function useTheme(): Theme {
  return themeFor(useColorScheme());
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/** Styles as a function of the theme, built once per scheme. Returns a hook for components. */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T): () => T {
  const cache = new Map<Scheme, T>();
  const stylesFor = (theme: Theme): T => {
    const cached = cache.get(theme.scheme);
    if (cached) return cached;
    const built = factory(theme);
    cache.set(theme.scheme, built);
    return built;
  };
  return () => stylesFor(useTheme());
}
