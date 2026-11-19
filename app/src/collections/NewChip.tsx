import { Pressable, TextInput, View } from 'react-native';
import { COLLECTION_NAME_MAX } from '@/db/validation';
import { ActionText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { useChipStyles } from './chipStyles';
import type { NewCollectionDraft } from './newCollectionDraft';

export const NEW_CHIP_LABEL = '+ New';
export const NEW_CHIP_PLACEHOLDER = 'Name the room';

interface NewChipProps {
  readonly draft: NewCollectionDraft;
  readonly onOpen: () => void;
  readonly field: {
    readonly onChangeText: (text: string) => void;
    /** With the field's own text: a keyboard can commit its last word on Enter. */
    readonly onSubmit: (text: string) => void;
    readonly onBlur: () => void;
  };
}

/** The last chip (DESIGN.md §9): it turns into a pill-shaped name field in place. */
export function NewChip({ draft, onOpen, field }: NewChipProps) {
  const styles = useChipStyles();
  const { color } = useTheme();
  if (draft.kind === 'closed') {
    return (
      <Pressable testID="new-chip" accessibilityRole="button" accessibilityLabel="New collection" android_ripple={{ color: color.ripple }} onPress={onOpen} style={styles.chip}>
        <ActionText token="actionS" color="ink2">{NEW_CHIP_LABEL}</ActionText>
      </Pressable>
    );
  }
  return (
    <View style={[styles.chip, styles.field]}>
      <TextInput
        testID="new-chip-name"
        autoFocus
        value={draft.text}
        placeholder={NEW_CHIP_PLACEHOLDER}
        placeholderTextColor={color.ink3}
        maxLength={COLLECTION_NAME_MAX}
        returnKeyType="done"
        submitBehavior="submit"
        accessibilityLabel="New collection name"
        onChangeText={field.onChangeText}
        onSubmitEditing={(event) => field.onSubmit(event.nativeEvent.text)}
        onBlur={field.onBlur}
        style={styles.input}
      />
    </View>
  );
}
