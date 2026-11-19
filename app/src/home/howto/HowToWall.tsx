import { View } from 'react-native';
import { NameText, NoteText } from '@/theme/Text';
import { HOME_SIZE, useHomeStyles } from '../homeStyles';
import { HowToArt } from './HowToArt';
import { HOWTO_STEP_ORDER } from './howtoShapes';
import { HOWTO_HEADING, HOWTO_STEPS, stepLabel } from './howtoCopy';

/**
 * The empty wall (#75): how things get here, in three labelled prints. Shown whenever no live item is on the
 * device, so it comes back if the wall empties. Nothing here is tappable.
 */
export function HowToWall() {
  const styles = useHomeStyles();
  return (
    <View testID="home-howto">
      <View style={styles.sectionLabel} accessible accessibilityRole="header">
        <NameText token="titleS">{HOWTO_HEADING}</NameText>
      </View>
      <View style={styles.howto}>
        {HOWTO_STEP_ORDER.map((step) => (
          <View key={step} style={styles.howtoStep} accessible accessibilityLabel={stepLabel(step)}>
            <View style={styles.howtoPrint}>
              <HowToArt step={step} size={HOME_SIZE.howto} />
            </View>
            <View style={styles.rowText}>
              <NameText token="titleS">{HOWTO_STEPS[step].name}</NameText>
              <NoteText color="ink2">{HOWTO_STEPS[step].note}</NoteText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
