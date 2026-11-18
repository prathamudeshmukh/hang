import { createContext, useContext, useSyncExternalStore } from 'react';
import { createImageViewer, type ImageViewer, type ViewerState } from './imageChrome';

const ImageViewerContext = createContext<ImageViewer>(createImageViewer());

export const ImageViewerProvider = ImageViewerContext.Provider;

export function useImageViewer(): ImageViewer {
  return useContext(ImageViewerContext);
}

/** The feed's chrome and zoom, redrawn only when they change. */
export function useViewerState(viewer: ImageViewer): ViewerState {
  return useSyncExternalStore(viewer.subscribe, viewer.state);
}
