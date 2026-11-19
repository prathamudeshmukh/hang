import { View } from 'react-native';
import { NoteText } from '@/theme/Text';
import { useHomeStyles } from '../homeStyles';
import { WAITING_LINE } from './howtoCopy';

const PLACES = ['first', 'second', 'third'] as const;

/**
 * While the first pull brings an account's wall onto this device (#75): the strip's places, dashed, where a
 * returning user's prints are about to land ("fetching fills in", DESIGN.md §7).
 */
export function WaitingWall() {
  const styles = useHomeStyles();
  return (
    <View testID="home-waiting">
      <View style={styles.sectionLabel}>
        <NoteText token="prompt" color="ink2">{WAITING_LINE}</NoteText>
      </View>
      <View style={styles.waitingStrip} accessible={false} importantForAccessibility="no-hide-descendants">
        {PLACES.map((place) => <View key={place} style={styles.stripPending} />)}
      </View>
    </View>
  );
}
