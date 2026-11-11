import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { COLOR, FONT } from '@/share/tokens';
import { authSession } from './appSession';
import { lastSyncLabel } from './lastSyncLabel';
import { useAuth } from './useAuth';

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
      <Text style={styles.note} testID="account-email">Signed in as {user?.email ?? 'unknown'}</Text>
      <Text style={styles.note} testID="last-sync">{lastSyncLabel(lastSync)}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" testID="sign-out" onPress={signOut} disabled={busy}>
          <Text style={styles.link}>{busy ? 'Signing out…' : 'Sign out'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginTop: 8 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: COLOR.ink3, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 20, marginTop: 8 },
  link: { fontSize: 14, fontWeight: '600', color: COLOR.accent },
});
