import { useCallback } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import type { FeedPageViewProps } from '../FeedPageView';
import type { Opening } from '../feedPage';
import { PAGE_ACTIONS, stepOf } from '../pageA11y';
import { useFeedTextFade, useHiddenUnderFlyer } from '../useFeedHero';
import { OpeningText } from './OpeningText';
import { textBlockTop } from './textLayout';
import { useTextPageStyles } from './textPageStyles';

const TITLE_LINES = 3;

/** An imageless article that has reader text (#61): no media box; note, title and its opening down to the pills. */
export function TextPageView({ page, opening, height, bottomInset, onOpen, onMove, onStep, onMediaDrawn }: FeedPageViewProps & { readonly opening: Opening }) {
  const styles = useTextPageStyles();
  const insets = useSafeAreaInsets();
  const textFade = useFeedTextFade();
  const { id } = page.card;
  const hidden = useHiddenUnderFlyer(id);
  const laidOut = useCallback(() => onMediaDrawn(id), [id, onMediaDrawn]);
  return (
    <View style={[styles.page, { height, paddingTop: textBlockTop(insets.top), paddingBottom: bottomInset }]}>
      <Animated.View style={[styles.block, textFade, hidden && styles.hidden]}>
        <View
          accessible
          accessibilityLabel={page.accessibilityLabel}
          accessibilityActions={PAGE_ACTIONS}
          onAccessibilityAction={(event) => {
            const step = stepOf(event);
            if (step) onStep(step);
          }}
        >
          <NoteText testID="feed-note" numberOfLines={1}>{page.note}</NoteText>
          {page.card.title ? <NameText token="titleL" numberOfLines={TITLE_LINES}>{page.card.title}</NameText> : null}
        </View>
        <OpeningText opening={opening} onPress={() => onOpen(page)} onLaidOut={laidOut} />
      </Animated.View>
      <Animated.View style={[styles.pills, textFade]}>
        <Pill kind="filled" label={page.action} testID="feed-open" onPress={() => onOpen(page)} />
        <Pill label="Move" testID="feed-move" onPress={() => onMove(page)} />
      </Animated.View>
    </View>
  );
}
