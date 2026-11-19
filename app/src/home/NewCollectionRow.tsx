import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { createAppCollection } from '@/collections/appCreateCollection';
import { COLLECTION_NAME_MAX } from '@/db/validation';
import { syncTriggers } from '@/sync/syncWiring';
import { ActionText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { useHomeStyles } from './homeStyles';

type Draft = { readonly kind: 'idle' } | { readonly kind: 'editing'; readonly error: string | null };

const IDLE: Draft = { kind: 'idle' };

/** "New collection" turns into a field in place: Enter creates, an empty name or tapping away cancels. */
export function NewCollectionRow() {
  const [draft, setDraft] = useState<Draft>(IDLE);
  const styles = useHomeStyles();
  const { color } = useTheme();

  function create(name: string) {
    if (name.trim().length === 0) return setDraft(IDLE);
    const outcome = createAppCollection(name);
    if (outcome.kind === 'invalid') return setDraft({ kind: 'editing', error: outcome.message });
    setDraft(IDLE);
    void syncTriggers.syncNow();
  }

  if (draft.kind === 'idle') {
    return (
      <Pressable testID="new-collection" accessibilityRole="button" android_ripple={{ color: color.ripple }} onPress={() => setDraft({ kind: 'editing', error: null })} style={styles.collectionRow}>
        <View style={styles.coverPlaceholder} />
        <ActionText token="action" color="ink3">New collection</ActionText>
      </Pressable>
    );
  }

  return (
    <View style={styles.collectionRow}>
      <View style={styles.coverPlaceholder} />
      <View style={styles.rowText}>
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
          style={styles.input}
        />
        {draft.error && <NoteText color="ink2">{draft.error}</NoteText>}
      </View>
    </View>
  );
}
