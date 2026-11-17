import { useMemo } from 'react';
import { useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import type { FeedPageViewProps } from '../FeedPageView';
import type { ImageMedia } from '../feedPage';
import { PAGE_ACTIONS, stepOf } from '../pageA11y';
import { Shade } from '../Shade';
import { useFeedTextFade, useHiddenUnderFlyer } from '../useFeedHero';
import { useImagePageStyles } from './imagePageStyles';
import { useChromeFade, useImageChrome } from './useImageChrome';
import { ZoomableImage } from './ZoomableImage';

const TITLE_LINES = 2;

/** An image page (DESIGN.md §8): the image whole on the page; note, title and pills on a shade over it. */
export function ImagePageView({ page, image, height, bottomInset, onOpen, onMove, onStep, onMediaDrawn }: FeedPageViewProps & { readonly image: ImageMedia }) {
  const styles = useImagePageStyles();
  const { width } = useWindowDimensions();
  const { id } = page.card;
  const underFlyer = useHiddenUnderFlyer(id);
  const { hidden, zoomable, onTap, onZoomChange } = useImageChrome(id);
  const textFade = useFeedTextFade();
  const chromeFade = useChromeFade(hidden);
  const picture = { id, thumb: image.media.uri, original: image.original, ratio: image.media.naturalRatio };
  // The gestures are rebuilt when the page size changes, so keep it stable between renders.
  const pageSize = useMemo(() => ({ width, height }), [width, height]);

  return (
    <View style={[styles.page, { height }]}>
      <View
        style={underFlyer && styles.hidden}
        accessible
        accessibilityLabel={page.accessibilityLabel}
        accessibilityActions={PAGE_ACTIONS}
        onAccessibilityAction={(event) => {
          const step = stepOf(event);
          if (step) onStep(step);
        }}
      >
        <ZoomableImage ref={zoomable} picture={picture} page={pageSize} onTap={onTap} onZoomChange={onZoomChange} onDrawn={() => onMediaDrawn(id)} />
      </View>
      <Animated.View style={[styles.chrome, { paddingBottom: bottomInset }, textFade, chromeFade]} pointerEvents={hidden ? 'none' : 'box-none'}>
        <Shade edge="bottom" />
        <View style={styles.words} pointerEvents="none">
          <NoteText testID="feed-note" numberOfLines={1}>{page.note}</NoteText>
          {page.showTitle && page.card.title ? <NameText token="titleL" numberOfLines={TITLE_LINES}>{page.card.title}</NameText> : null}
        </View>
        <View style={styles.pills}>
          <Pill kind="filled" label="Move" testID="feed-move" onPress={() => onMove(page)} />
          <Pill label={page.action} testID="feed-open" onPress={() => onOpen(page)} />
        </View>
      </Animated.View>
    </View>
  );
}
