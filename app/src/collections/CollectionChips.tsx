import { Pressable, View } from 'react-native';
import { ActionText, NoteText } from '@/theme/Text';
import { makeStyles, useTheme } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';

/** Hang's one question, at save time and when moving an item (DESIGN.md §8). */
export const HANG_PROMPT = 'Where does it hang?';

export interface ChipChoice<Id> {
  readonly id: Id;
  readonly name: string;
}

interface CollectionChipsProps<Id> {
  readonly choices: readonly ChipChoice<Id>[];
  readonly selected: Id | undefined;
  readonly onSelect: (id: Id) => void;
}

const CHIP_PADDING_X = 14;
const PROMPT_GAP = 18;
const CHIPS_GAP = 10;

const useStyles = makeStyles(({ color }) => ({
  prompt: { marginTop: PROMPT_GAP },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.chip, marginTop: CHIPS_GAP },
  chip: { minHeight: SPACE.touch, justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised, paddingHorizontal: CHIP_PADDING_X, overflow: 'hidden' },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
}));

/** The prompt and one pill per place; the selected one is filled with ink. Used by the share sheet and Move. */
export function CollectionChips<Id extends string | null>({ choices, selected, onSelect }: CollectionChipsProps<Id>) {
  const styles = useStyles();
  const { color } = useTheme();
  return (
    <>
      <NoteText token="prompt" color="ink" style={styles.prompt}>{HANG_PROMPT}</NoteText>
      <View style={styles.chips}>
        {choices.map(({ id, name }) => (
          <Pressable
            key={id ?? name}
            testID={`chip:${name}`}
            accessibilityRole="button"
            accessibilityState={{ selected: id === selected }}
            android_ripple={{ color: color.ripple }}
            onPress={() => onSelect(id)}
            style={[styles.chip, id === selected && styles.chipOn]}
          >
            <ActionText token="actionS" style={id === selected ? { color: color.wall } : null}>{name}</ActionText>
          </Pressable>
        ))}
      </View>
    </>
  );
}
