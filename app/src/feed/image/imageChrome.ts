/**
 * An image page's chrome and zoom, shared with the feed around it (#60): the counter and top shade
 * hide with the page's own chrome, and back zooms out before it closes the feed.
 */
export interface ViewerState {
  /** The page on screen; only its chrome hides. */
  readonly shownId: string | null;
  readonly chromeHidden: boolean;
  readonly zoomed: boolean;
}

export type ViewerEvent = 'tap' | 'zoomedIn' | 'zoomedOut';

export const AT_REST: ViewerState = { shownId: null, chromeHidden: false, zoomed: false };

const sameState = (a: ViewerState, b: ViewerState) => a.shownId === b.shownId && a.chromeHidden === b.chromeHidden && a.zoomed === b.zoomed;

/** A tap toggles the chrome; zooming hides it; only a tap brings it back. */
export function nextViewer(state: ViewerState, event: ViewerEvent): ViewerState {
  const next: Record<ViewerEvent, () => ViewerState> = {
    tap: () => ({ ...state, chromeHidden: !state.chromeHidden }),
    zoomedIn: () => ({ ...state, chromeHidden: true, zoomed: true }),
    zoomedOut: () => ({ ...state, zoomed: false }),
  };
  const changed = next[event]();
  return sameState(changed, state) ? state : changed;
}

/** A new page always starts with its chrome. */
export function showPage(state: ViewerState, id: string): ViewerState {
  return state.shownId === id ? state : { ...AT_REST, shownId: id };
}

export function chromeHiddenOn(state: ViewerState, id: string): boolean {
  return state.chromeHidden && state.shownId === id;
}

export type ImageViewer = ReturnType<typeof createImageViewer>;

/** One per open feed, read with useSyncExternalStore. */
export function createImageViewer() {
  let state = AT_REST;
  let zoomOut: (() => void) | null = null;
  const listeners = new Set<() => void>();
  const change = (next: ViewerState) => {
    if (next === state) return;
    state = next;
    listeners.forEach((listener) => listener());
  };
  return {
    state: () => state,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send(event: ViewerEvent): void {
      change(nextViewer(state, event));
    },
    show(id: string): void {
      change(showPage(state, id));
    },
    /** The page on screen hands over how to zoom it out; the returned function takes it back. */
    onZoomOut(handler: () => void): () => void {
      zoomOut = handler;
      return () => {
        if (zoomOut === handler) zoomOut = null;
      };
    },
    /** Back while zoomed zooms out instead of closing the feed. */
    backZoomsOut(): boolean {
      if (!state.zoomed || !zoomOut) return false;
      zoomOut();
      return true;
    },
  };
}
