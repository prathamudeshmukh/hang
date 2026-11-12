import { ScrollView, View } from 'react-native';
import { Pill } from '@/theme/Pill';
import { NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';
import { chipLabel, MIN_KINDS_FOR_CHIPS, type KindFilter } from './kindFilter';
import type { PlaceViewControls } from './usePlaceView';

const SHUFFLE = 'Shuffle';

const useStyles = makeStyles(() => ({
  countLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: SPACE.touch },
  /** Bleeds past the right margin so a cut-off chip says the row scrolls. */
  chipsRow: { marginRight: -SPACE.margin },
  /** As tall as a touch target, so the chips' hitSlop isn't clipped by the row. */
  chips: { gap: SPACE.chip, paddingRight: SPACE.margin, minHeight: SPACE.touch, alignItems: 'center' },
}));

function KindChips({ view, choose }: Pick<PlaceViewControls, 'view' | 'choose'>) {
  const styles = useStyles();
  const filters: readonly KindFilter[] = ['all', ...view.kinds];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chips} accessibilityRole="radiogroup">
      {filters.map((filter) => (
        <Pill
          key={filter}
          size="s"
          label={chipLabel(filter)}
          kind={filter === view.filter ? 'filled' : 'outline'}
          accessibilityRole="radio"
          accessibilityState={{ checked: filter === view.filter }}
          onPress={() => choose(filter)}
        />
      ))}
    </ScrollView>
  );
}

/** Under the title (DESIGN.md §8, #42): the count and Shuffle on one line, the kind chips below. */
export function PlaceControls({ view, shuffled, choose, toggleShuffle }: PlaceViewControls) {
  const styles = useStyles();
  if (view.count === null) return null;
  return (
    <>
      <View style={styles.countLine}>
        <NoteText accessibilityLiveRegion="polite">{view.count}</NoteText>
        {view.canShuffle ? (
          <Pill
            size="s"
            label={SHUFFLE}
            kind={shuffled ? 'filled' : 'outline'}
            accessibilityRole="togglebutton"
            accessibilityState={{ checked: shuffled }}
            onPress={toggleShuffle}
          />
        ) : null}
      </View>
      {view.kinds.length >= MIN_KINDS_FOR_CHIPS ? <KindChips view={view} choose={choose} /> : null}
    </>
  );
}
