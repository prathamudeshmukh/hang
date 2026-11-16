import { memo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import { samePage, type FeedPage } from './feedPage';
import { FeedMediaView } from './FeedMediaView';
import { mediaHeight } from './feedLayout';
import { useFeedStyles } from './feedStyles';
import { PAGE_ACTIONS, stepOf, type PageStep } from './pageA11y';
import { PostPageView } from './post/PostPageView';
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

/** Media, then note, title, summary and the Read/Watch/Open and Move pills (DESIGN.md §8). */
function MediaPageView({ page, height, bottomInset, onOpen, onMove, onStep, onMediaDrawn }: FeedPageViewProps) {
  const styles = useFeedStyles();
  const textFade = useFeedTextFade();
  return (
    <View style={[styles.page, { height }]}>
      <View
        accessible
        accessibilityLabel={page.accessibilityLabel}
        accessibilityActions={PAGE_ACTIONS}
        onAccessibilityAction={(event) => {
          const step = stepOf(event);
          if (step) onStep(step);
        }}
      >
        <FeedMediaView page={page} height={mediaHeight(height)} onDrawn={onMediaDrawn} />
      </View>
      <Animated.View style={[styles.text, { paddingBottom: bottomInset }, textFade]}>
        <View style={styles.words}>
          <NoteText testID="feed-note" numberOfLines={1}>{page.note}</NoteText>
          {page.showTitle && page.card.title ? <NameText token="titleL" numberOfLines={TITLE_LINES}>{page.card.title}</NameText> : null}
          {page.summary ? <NameText token="bodyRead" color="ink2" numberOfLines={page.summaryLines}>{page.summary}</NameText> : null}
        </View>
        <View style={styles.pills}>
          <Pill kind="filled" label={page.action} testID="feed-open" onPress={() => onOpen(page)} />
          <Pill label="Move" testID="feed-move" onPress={() => onMove(page)} />
        </View>
      </Animated.View>
    </View>
  );
}

/** One screen of the feed; a post is its own page, set as a broadside (#59). */
export const FeedPageView = memo(function FeedPageView(props: FeedPageViewProps) {
  const { media } = props.page;
  return media.kind === 'post' ? <PostPageView {...props} post={media} /> : <MediaPageView {...props} />;
}, (previous, next) => {
  const { page, ...handlers } = previous;
  const { page: nextPage, ...nextHandlers } = next;
  return samePage(page, nextPage) && (Object.keys(handlers) as (keyof typeof handlers)[]).every((key) => handlers[key] === nextHandlers[key]);
});
