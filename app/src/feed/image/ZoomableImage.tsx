import { Image } from 'expo-image';
import { useCallback, useImperativeHandle, useState, type Ref } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { MOTION } from '@/theme/tokens';
import { useZoom } from './useZoom';
import { fittedSize, type Size } from './zoom';

export interface ZoomablePicture {
  /** Keeps a recycled view from flashing the previous picture. */
  readonly id: string;
  /** The thumbnail on the device; null while it downloads. */
  readonly thumb: string | null;
  /** The full image at its source, fetched only once zoomed past the thumbnail. */
  readonly original: string | null;
  /** Height over width. */
  readonly ratio: number;
}

export interface ZoomableHandle {
  readonly zoomOut: () => void;
}

interface ZoomableImageProps {
  readonly picture: ZoomablePicture;
  readonly page: Size;
  readonly onTap: () => void;
  readonly onZoomChange: (zoomed: boolean) => void;
  /** The thumbnail is on screen, or there is none to wait for (#32 settling). */
  readonly onDrawn: () => void;
  readonly ref?: Ref<ZoomableHandle>;
}

/**
 * A picture drawn whole on the page that pinches and double-taps to zoom (#60). Zoomed, the original
 * loads over the thumbnail; if it can't (offline, or the site refuses, #57), the thumbnail stays.
 */
export function ZoomableImage({ picture, page, onTap, onZoomChange, onDrawn, ref }: ZoomableImageProps) {
  const [original, setOriginal] = useState<string | null>(null);
  const wantOriginal = useCallback(() => setOriginal(picture.original), [picture.original]);
  const { gesture, imageStyle, zoomOut } = useZoom(page, picture.ratio, { onTap, onZoomChange, onWantsOriginal: wantOriginal });
  useImperativeHandle(ref, () => ({ zoomOut }), [zoomOut]);
  const fitted = fittedSize(page, picture.ratio);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.page, page]} onLayout={picture.thumb ? undefined : onDrawn}>
        <Animated.View style={[fitted, imageStyle]}>
          {picture.thumb ? <Image source={{ uri: picture.thumb }} recyclingKey={picture.id} style={StyleSheet.absoluteFill} contentFit="contain" onDisplay={onDrawn} accessible={false} /> : null}
          {original ? (
            <Image
              source={{ uri: original }}
              style={StyleSheet.absoluteFill}
              contentFit="contain"
              allowDownscaling={false}
              cachePolicy="disk"
              transition={MOTION.baseMs}
              onError={({ error }) => console.warn('[feed] original image did not load', error)}
              accessible={false}
            />
          ) : null}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
