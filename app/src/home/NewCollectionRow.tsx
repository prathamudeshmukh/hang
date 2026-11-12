import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { COLLECTION_NAME_MAX } from '@/db/validation';
import { newId } from '@/db/deviceIds';
import { syncTriggers } from '@/sync/syncWiring';
import { appCollections } from './appListSources';
import { ActionText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { useListStyles } from './listStyles';

type Draft = { readonly kind: 'idle' } | { readonly kind: 'editing'; readonly error: string | null };

const IDLE: Draft = { kind: 'idle' };

/** "New collection" turns into a field in place: Enter creates, an empty name or tapping away cancels. */
export function NewCollectionRow() {
  const [draft, setDraft] = useState<Draft>(IDLE);
  const listStyles = useListStyles();
  const { color } = useTheme();

  function create(name: string) {
    if (name.trim().length === 0) return setDraft(IDLE);
    try {
      appCollections.create({ id: newId(), name });
      setDraft(IDLE);
      void syncTriggers.syncNow();
    } catch (error) {
      setDraft({ kind: 'editing', error: error instanceof Error ? error.message : String(error) });
    }
  }

  if (draft.kind === 'idle') {
    return (
      <Pressable testID="new-collection" accessibilityRole="button" android_ripple={{ color: color.ripple }} onPress={() => setDraft({ kind: 'editing', error: null })} style={listStyles.row}>
        <ActionText token="action">New collection</ActionText>
      </Pressable>
    );
  }

  return (
    <View style={listStyles.row}>
      <View style={listStyles.rowText}>
        <TextInput
          testID="new-collection-name"
          autoFocus
          placeholder="Name"
          placeholderTextColor={color.ink3}
          maxLength={COLLECTION_NAME_MAX}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={(event) => create(event.nativeEvent.text)}
          onBlur={() => setDraft(IDLE)}
          style={listStyles.input}
        />
        {draft.error && <NoteText color="ink2">{draft.error}</NoteText>}
      </View>
    </View>
  );
}
