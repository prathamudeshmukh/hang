import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import { samePage, type FeedPage } from './feedPage';
import { FeedMediaView } from './FeedMediaView';
import { mediaHeight } from './feedLayout';
import { useFeedStyles } from './feedStyles';
import { PAGE_ACTIONS, stepOf, type PageStep } from './pageA11y';
import { ImagePageView } from './image/ImagePageView';
import { PostPageView } from './post/PostPageView';
import { PictureGlow, ProjectorSpill } from './ProjectorSpill';
import { usePictureFit } from './usePictureFit';
import { OpeningText } from './text/OpeningText';
import { TextPageView } from './text/TextPageView';
import { useFeedTextFade } from './useFeedHero';

const TITLE_LINES = 3;

export interface FeedPageViewProps {
  readonly page: FeedPage;
  readonly height: number;
  /** Space kept clear under the pills for the system bar. */
  readonly bottomInset: number;
  readonly onOpen: (page: FeedPage) => void;
  readonly onMove: (page: FeedPage) => void;
  /** TalkBack's way to swipe (#31). */
  readonly onStep: (step: PageStep) => void;
  readonly onMediaDrawn: (id: string) => void;
}

/** Media, then note, title, a video's channel (#108), summary (or an article's opening, #61) and the Read/Watch/Open and Move pills (DESIGN.md §8). */
function MediaPageView({ page, height, bottomInset, onOpen, onMove, onStep, onMediaDrawn }: FeedPageViewProps) {
  const styles = useFeedStyles();
  const textFade = useFeedTextFade();
  const media = mediaHeight(height);
  const spillUri = page.media.kind === 'picture' ? page.media.media.uri : null;
  const fit = usePictureFit(page.media, media);
  return (
    <View style={[styles.page, { height }]}>
      {spillUri ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, textFade]}>
          {fit.fit === 'whole' ? <PictureGlow uri={spillUri} mediaHeight={media} /> : null}
          <ProjectorSpill uri={spillUri} pageHeight={height} mediaHeight={media} />
        </Animated.View>
      ) : null}
      <View
        accessible
        accessibilityLabel={page.accessibilityLabel}
        accessibilityActions={PAGE_ACTIONS}
        onAccessibilityAction={(event) => {
          const step = stepOf(event);
          if (step) onStep(step);
        }}
      >
        <FeedMediaView page={page} height={media} fit={fit} onDrawn={onMediaDrawn} />
      </View>
      <Animated.View style={[styles.text, { paddingBottom: bottomInset }, textFade]}>
        <View style={[styles.words, page.opening && styles.wordsFilling]}>
          <NoteText testID="feed-note" numberOfLines={1}>{page.note}</NoteText>
          {page.showTitle && page.card.title ? <NameText token="titleL" numberOfLines={TITLE_LINES}>{page.card.title}</NameText> : null}
          {page.card.channel ? <NoteText testID="feed-channel" numberOfLines={1}>{page.card.channel}</NoteText> : null}
          {page.summary ? <NameText token="bodyRead" color="ink2" numberOfLines={page.summaryLines}>{page.summary}</NameText> : null}
          {page.opening ? <OpeningText opening={page.opening} onPress={() => onOpen(page)} /> : null}
        </View>
        <View style={styles.pills}>
          <Pill kind="filled" label={page.action} testID="feed-open" onPress={() => onOpen(page)} />
          <Pill label="Move" testID="feed-move" onPress={() => onMove(page)} />
        </View>
      </Animated.View>
    </View>
  );
}

/** One screen of the feed; a post is set as a broadside (#59), an image fills the page (#60), an imageless article is a text page (#61). */
export const FeedPageView = memo(function FeedPageView(props: FeedPageViewProps) {
  const { media, opening } = props.page;
  if (media.kind === 'post') return <PostPageView {...props} post={media} />;
  if (media.kind === 'image') return <ImagePageView {...props} image={media} />;
  if (media.kind === 'none' && opening) return <TextPageView {...props} opening={opening} />;
  return <MediaPageView {...props} />;
}, (previous, next) => {
  const { page, ...handlers } = previous;
  const { page: nextPage, ...nextHandlers } = next;
  return samePage(page, nextPage) && (Object.keys(handlers) as (keyof typeof handlers)[]).every((key) => handlers[key] === nextHandlers[key]);
});
