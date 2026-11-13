import { memo } from 'react';
import { View, type AccessibilityActionEvent } from 'react-native';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import { samePage, type FeedPage } from './feedPage';
import { FeedMediaView } from './FeedMediaView';
import { MEDIA_SHARE, useFeedStyles } from './feedStyles';

const LINES = { title: 3, summary: 2 } as const;
const PAGE_ACTIONS = [
  { name: 'next', label: 'Next' },
  { name: 'previous', label: 'Previous' },
] as const;

export type PageStep = 'next' | 'previous';

export interface FeedPageViewProps {
  readonly page: FeedPage;
  readonly height: number;
  /** Space kept clear under the pills for the system bar. */
  readonly bottomInset: number;
  readonly onOpen: (page: FeedPage) => void;
  readonly onMove: (page: FeedPage) => void;
  /** TalkBack's way to swipe (#31). */
  readonly onStep: (step: PageStep) => void;
}

function stepOf(event: AccessibilityActionEvent): PageStep | null {
  const { actionName } = event.nativeEvent;
  return actionName === 'next' || actionName === 'previous' ? actionName : null;
}

/** One screen of the feed: media, then note, title, summary and the Read/Watch/Open and Move pills (DESIGN.md §8). */
export const FeedPageView = memo(function FeedPageView({ page, height, bottomInset, onOpen, onMove, onStep }: FeedPageViewProps) {
  const styles = useFeedStyles();
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
        <FeedMediaView page={page} height={Math.round(height * MEDIA_SHARE)} />
      </View>
      <View style={[styles.text, { paddingBottom: bottomInset }]}>
        <View style={styles.words}>
          <NoteText testID="feed-note" numberOfLines={1}>{page.note}</NoteText>
          {page.showTitle && page.card.title ? <NameText token="titleL" numberOfLines={LINES.title}>{page.card.title}</NameText> : null}
          {page.summary ? <NameText token="bodyRead" color="ink2" numberOfLines={LINES.summary}>{page.summary}</NameText> : null}
        </View>
        <View style={styles.pills}>
          <Pill kind="filled" label={page.action} testID="feed-open" onPress={() => onOpen(page)} />
          <Pill label="Move" testID="feed-move" onPress={() => onMove(page)} />
        </View>
      </View>
    </View>
  );
}, (previous, next) => {
  const { page, ...handlers } = previous;
  const { page: nextPage, ...nextHandlers } = next;
  return samePage(page, nextPage) && (Object.keys(handlers) as (keyof typeof handlers)[]).every((key) => handlers[key] === nextHandlers[key]);
});
