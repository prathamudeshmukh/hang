import { useEffect, useState } from 'react';
import { Keyboard, Pressable, View } from 'react-native';
import { ActionText, NoteText } from '@/theme/Text';
import { makeStyles, useTheme } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';
import { useChipStyles } from './chipStyles';
import type { CreateOutcome } from './createCollection';
import { NewChip } from './NewChip';
import { blurred, CLOSED, discarded, failed, type NewCollectionDraft, opened, submitted, typed } from './newCollectionDraft';

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
  /** + New's Enter (#76). On `created` the sheet does what a pick means there: select it, or move into it. */
  readonly onCreate: (name: string) => CreateOutcome;
  /** Where a refused name's message goes (the share sheet's footer hint); without it, it shows under the chips. */
  readonly onDraftError?: (message: string | null) => void;
}

const PROMPT_GAP = 18;
const CHIPS_GAP = 10;

const useStyles = makeStyles(() => ({
  prompt: { marginTop: PROMPT_GAP },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.chip, marginTop: CHIPS_GAP },
  error: { marginTop: CHIPS_GAP },
}));

const errorOf = (draft: NewCollectionDraft) => (draft.kind === 'open' ? draft.error : null);

/** The prompt, one pill per place (the selected one filled with ink), then + New. Used by the share sheet and Move. */
export function CollectionChips<Id extends string | null>({ choices, selected, onSelect, onCreate, onDraftError }: CollectionChipsProps<Id>) {
  const styles = useStyles();
  const chipStyles = useChipStyles();
  const { color } = useTheme();
  const [draft, setDraft] = useState<NewCollectionDraft>(CLOSED);
  const error = errorOf(draft);

  useEffect(() => onDraftError?.(error), [error, onDraftError]);

  const pick = (id: Id) => {
    setDraft(discarded());
    onSelect(id);
  };

  const submit = (text: string) => {
    const intent = submitted(typed(text));
    if (intent.kind === 'cancel') return setDraft(CLOSED);
    const outcome = onCreate(intent.name);
    if (outcome.kind === 'invalid') return setDraft(failed(typed(text), outcome.message));
    setDraft(CLOSED);
    Keyboard.dismiss();
  };

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
            onPress={() => pick(id)}
            style={[chipStyles.chip, id === selected && chipStyles.chipOn]}
          >
            <ActionText token="actionS" style={id === selected ? { color: color.wall } : null}>{name}</ActionText>
          </Pressable>
        ))}
        <NewChip
          draft={draft}
          onOpen={() => setDraft(opened())}
          field={{ onChangeText: (text) => setDraft(typed(text)), onSubmit: submit, onBlur: () => setDraft(blurred) }}
        />
      </View>
      {error && !onDraftError && <NoteText color="ink2" style={styles.error}>{error}</NoteText>}
    </>
  );
}
