import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore, type ComponentRef, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { hero, heroOrigins } from './appHero';
import type { Rect } from './geometry';
import type { Scope } from './origins';
import { hidesFace } from './trip';

const NO_SCOPE: Scope = '';
const HIDDEN = { opacity: 0 } as const;
const ScopeContext = createContext<Scope>(NO_SCOPE);
const DrawnContext = createContext<(() => void) | undefined>(undefined);

/** Names the wall the prints inside sit on, so a flight back finds this one and not Home's copy. */
export function HeroScope({ scope, children }: { readonly scope: Scope; readonly children: ReactNode }) {
  return <ScopeContext.Provider value={scope}>{children}</ScopeContext.Provider>;
}

export const useHeroScope = () => useContext(ScopeContext);

/** For the image inside a face: call on display, so a flyer landing on it is removed without a flash. */
export const useFaceDrawn = () => useContext(DrawnContext);

/** Anything with measureInWindow: a host view ref (RN 0.88 types View as a function component). */
export interface Measurable {
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
}

export function measureView(view: Measurable | null): Promise<Rect | null> {
  return new Promise((resolve) => {
    if (!view) return resolve(null);
    view.measureInWindow((x, y, width, height) => resolve(width > 0 && height > 0 ? { x, y, width, height } : null));
  });
}

interface HeroFaceProps {
  readonly id: string;
  /** True for a face with no image to wait on: it counts as drawn once laid out. */
  readonly drawnOnLayout: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}

/** The part of a print that flies (#32): registered while mounted, so the hero can measure it. */
export function HeroFace({ id, drawnOnLayout, style, children }: HeroFaceProps) {
  const scope = useHeroScope();
  const view = useRef<ComponentRef<typeof View>>(null);
  const key = useMemo(() => ({ scope, id }), [scope, id]);
  useEffect(() => heroOrigins.addFace(key, () => measureView(view.current)), [key]);
  const markDrawn = useCallback(() => heroOrigins.markDrawn(key), [key]);
  const hidden = useSyncExternalStore(hero.subscribe, () => hidesFace(hero.trip(), key));
  return (
    <DrawnContext.Provider value={markDrawn}>
      <View ref={view} collapsable={false} style={[style, hidden && HIDDEN]} onLayout={drawnOnLayout ? markDrawn : undefined}>
        {children}
      </View>
    </DrawnContext.Provider>
  );
}
