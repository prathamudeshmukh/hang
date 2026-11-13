import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useHomeStyles } from '@/home/homeStyles';
import { ActionText, NoteText } from '@/theme/Text';
import { authSession } from './appSession';
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

/** The foot of Home, below the collections: who is signed in, and sign-out. A settings screen can take it later. */
export function AccountLine() {
  const { status } = useAuth();
  const styles = useHomeStyles();
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
    <View style={styles.footer}>
      <NoteText testID="account-email">{`signed in as ${user?.email ?? 'unknown'}  ·  `}</NoteText>
      <Pressable accessibilityRole="button" testID="sign-out" onPress={signOut} disabled={busy} style={styles.footerAction}>
        <ActionText token="actionS" color="ink2">{busy ? 'signing out…' : 'sign out'}</ActionText>
      </Pressable>
    </View>
  );
}
