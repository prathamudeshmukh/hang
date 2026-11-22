import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { createAppCollection } from '@/collections/appCreateCollection';
import { COLLECTION_NAME_MAX } from '@/db/validation';
import { syncTriggers } from '@/sync/syncWiring';
import { ActionText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { useRoomTileStyles } from './roomTileStyles';

type Draft = { readonly kind: 'idle' } | { readonly kind: 'editing'; readonly error: string | null };

const IDLE: Draft = { kind: 'idle' };

type NewRoomTileProps = { readonly width: number; readonly onNaming: (naming: boolean) => void };

/** The last place on the wall (#106): an empty frame whose label turns into a name field. Enter creates; an empty name or tapping away cancels. */
export function NewRoomTile({ width, onNaming }: NewRoomTileProps) {
  const [draft, setDraft] = useState<Draft>(IDLE);
  const styles = useRoomTileStyles();
  const { color } = useTheme();

  // The field unmounts on its way back to idle, and an unmounted field may never report its blur.
  function stopNaming() {
    onNaming(false);
    setDraft(IDLE);
  }

  function create(name: string) {
    if (name.trim().length === 0) return stopNaming();
    const outcome = createAppCollection(name);
    if (outcome.kind === 'invalid') return setDraft({ kind: 'editing', error: outcome.message });
    stopNaming();
    void syncTriggers.syncNow();
  }

  if (draft.kind === 'idle') {
    return (
      <Pressable testID="new-collection" accessibilityRole="button" android_ripple={{ color: color.ripple, foreground: true }} onPress={() => setDraft({ kind: 'editing', error: null })} style={{ width }}>
        <View style={styles.newFrame}>
          <ActionText token="action" color="ink3">＋ New room</ActionText>
        </View>
      </Pressable>
    );
  }

  return (
    <View style={{ width }}>
      <View style={styles.newFrame} />
      <View style={styles.newField}>
        <TextInput
          testID="new-collection-name"
          autoFocus
          placeholder="Name the room"
          placeholderTextColor={color.ink3}
          maxLength={COLLECTION_NAME_MAX}
          returnKeyType="done"
          submitBehavior="submit"
          onSubmitEditing={(event) => create(event.nativeEvent.text)}
          onFocus={() => onNaming(true)}
          onBlur={stopNaming}
          style={styles.input}
        />
        {draft.error && <NoteText color="ink2">{draft.error}</NoteText>}
      </View>
    </View>
  );
}
