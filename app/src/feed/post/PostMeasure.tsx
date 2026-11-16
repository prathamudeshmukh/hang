import { View, type TextLayoutEvent } from 'react-native';
import { PostFitText } from '@/theme/Text';
import { POST_FIT } from '@/theme/typeScale';
import type { MeasuredStep } from './postFit';
import { usePostStyles } from './postStyles';

const measuredFrom = (size: number, event: TextLayoutEvent): MeasuredStep => {
  const { lines } = event.nativeEvent;
  return { size, lines: lines.length, height: lines.reduce((total, line) => total + line.height, 0) };
};

/** The words set at every `post-fit` step at once, unseen, so one layout pass says which fits (#59 decision 5). */
export function PostMeasure({ words, onMeasured }: { readonly words: string; readonly onMeasured: (at: number, step: MeasuredStep) => void }) {
  const styles = usePostStyles();
  return (
    <View style={styles.measuring} pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {POST_FIT.map((step, at) => (
        <PostFitText key={step.size} step={step} style={styles.measured} onTextLayout={(event) => onMeasured(at, measuredFrom(step.size, event))}>
          {words}
        </PostFitText>
      ))}
    </View>
  );
}
