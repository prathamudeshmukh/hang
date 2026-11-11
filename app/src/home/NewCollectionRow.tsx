import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { COLLECTION_NAME_MAX } from '@/db/validation';
import { newId } from '@/db/deviceIds';
import { COLOR } from '@/share/tokens';
import { syncTriggers } from '@/sync/syncWiring';
import { appCollections } from './appListSources';
import { listStyles, RIPPLE } from './listStyles';

type Draft = { readonly kind: 'idle' } | { readonly kind: 'editing'; readonly error: string | null };

const IDLE: Draft = { kind: 'idle' };

/** "New collection" turns into a field in place: Enter creates, an empty name or tapping away cancels. */
export function NewCollectionRow() {
  const [draft, setDraft] = useState<Draft>(IDLE);

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
      <Pressable testID="new-collection" accessibilityRole="button" android_ripple={RIPPLE} onPress={() => setDraft({ kind: 'editing', error: null })} style={listStyles.row}>
        <Text style={listStyles.link}>New collection</Text>
      </Pressable>
    );
  }

  return (
    <View style={listStyles.row}>
      <TextInput
        testID="new-collection-name"
        autoFocus
        placeholder="Name"
        placeholderTextColor={COLOR.ink3}
        maxLength={COLLECTION_NAME_MAX}
        returnKeyType="done"
        submitBehavior="submit"
        onSubmitEditing={(event) => create(event.nativeEvent.text)}
        onBlur={() => setDraft(IDLE)}
        style={listStyles.input}
      />
      {draft.error && <Text style={listStyles.error}>{draft.error}</Text>}
    </View>
  );
}
