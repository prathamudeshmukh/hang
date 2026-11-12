import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { ActionText, NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';
import { authSession } from './appSession';
import { lastSyncLabel } from './lastSyncLabel';
import { useAuth } from './useAuth';

const useStyles = makeStyles(() => ({
  panel: { marginTop: 8, gap: 4 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  action: { minHeight: SPACE.touch, justifyContent: 'center' },
}));

function confirmDiscard(unsynced: number): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      'Sign out?',
      `${unsynced} change(s) haven't synced and will be lost.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Sign out anyway', style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Phase 1 stand-in: who is signed in, how the last sync went, and sign-out. Pull down on a list to sync. */
export function AccountPanel() {
  const { status, lastSync } = useAuth();
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const user = status.kind === 'signedIn' || status.kind === 'signingOut' ? status.user : null;

  async function signOut() {
    setBusy(true);
    try {
      const { unsynced } = await authSession.checkSignOut();
      if (unsynced === 0 || (await confirmDiscard(unsynced))) await authSession.signOut();
    } catch (error) {
      Alert.alert('Sign-out failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.panel}>
      <NoteText testID="account-email">Signed in as {user?.email ?? 'unknown'}</NoteText>
      <NoteText testID="last-sync">{lastSyncLabel(lastSync)}</NoteText>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" testID="sign-out" onPress={signOut} disabled={busy} style={styles.action}>
          <ActionText token="action">{busy ? 'Signing out…' : 'Sign out'}</ActionText>
        </Pressable>
      </View>
    </View>
  );
}
