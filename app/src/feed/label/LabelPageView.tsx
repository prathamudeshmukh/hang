import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrintPaper, useSwatch } from '@/grid/PrintPaper';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import type { FeedPageViewProps } from '../FeedPageView';
import { PAGE_ACTIONS, stepOf } from '../pageA11y';
import { textBlockTop } from '../text/textLayout';
import { useFeedTextFade, useHiddenUnderFlyer } from '../useFeedHero';
import { useLabelPageStyles } from './labelPageStyles';

const TITLE_LINES = 8;

/** A page whose media is its title (#109): its room colour edge to edge, the note on top, the label centred, the pills on it. */
export function LabelPageView({ page, height, bottomInset, onOpen, onMove, onStep, onMediaDrawn }: FeedPageViewProps) {
  const styles = useLabelPageStyles();
  const insets = useSafeAreaInsets();
  const textFade = useFeedTextFade();
  const swatch = useSwatch(page.card);
  const { id, title, site } = page.card;
  const hidden = useHiddenUnderFlyer(id);
  return (
    <PrintPaper swatch={swatch} style={[styles.page, { height, paddingTop: textBlockTop(insets.top), paddingBottom: bottomInset }, hidden && styles.hidden]}>
      <Animated.View style={textFade}>
        <NoteText testID="feed-note" numberOfLines={1}>{page.note}</NoteText>
      </Animated.View>
      <View style={styles.room} onLayout={() => onMediaDrawn(id)}>
        <Animated.View
          style={[styles.label, textFade]}
          accessible
          accessibilityLabel={page.accessibilityLabel}
          accessibilityActions={PAGE_ACTIONS}
          onAccessibilityAction={(event) => {
            const step = stepOf(event);
            if (step) onStep(step);
          }}
        >
          <NameText token="display" numberOfLines={TITLE_LINES}>{title ?? site}</NameText>
          {page.summary ? <NameText token="bodyRead" color="ink2" numberOfLines={page.summaryLines}>{page.summary}</NameText> : null}
        </Animated.View>
      </View>
      <Animated.View style={[styles.pills, textFade]}>
        <Pill kind="filled" label={page.action} testID="feed-open" onPress={() => onOpen(page)} />
        <Pill label="Move" testID="feed-move" onPress={() => onMove(page)} />
      </Animated.View>
    </PrintPaper>
  );
}
