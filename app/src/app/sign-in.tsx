import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authSession } from '@/auth/appSession';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';

type Attempt = { readonly kind: 'idle' } | { readonly kind: 'busy' } | { readonly kind: 'failed'; readonly message: string };

const TOP_GAP = 96;
const BOTTOM_GAP = 40;
const SIDE = 24;

const useStyles = makeStyles(({ color }) => ({
  wall: { flex: 1, backgroundColor: color.wall, paddingHorizontal: SIDE },
  tagline: { marginTop: 6 },
  spacer: { flex: 1 },
  error: { marginBottom: 16 },
}));

/** The router swaps to Home once the session is signed in. */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [attempt, setAttempt] = useState<Attempt>({ kind: 'idle' });

  async function continueWithGoogle() {
    setAttempt({ kind: 'busy' });
    const outcome = await authSession.signIn();
    setAttempt(outcome.kind === 'failed' ? { kind: 'failed', message: outcome.message } : { kind: 'idle' });
  }

  return (
    <View style={[styles.wall, { paddingTop: insets.top + TOP_GAP, paddingBottom: insets.bottom + BOTTOM_GAP }]}>
      <NameText token="display">Hang</NameText>
      <NoteText token="prompt" style={styles.tagline}>Your links, hung on one wall.</NoteText>
      <View style={styles.spacer} />
      {attempt.kind === 'failed' && <NoteText color="ink2" style={styles.error}>{`Sign-in didn't work: ${attempt.message}`}</NoteText>}
      <Pill
        testID="sign-in-google"
        kind="filled"
        label={attempt.kind === 'busy' ? 'Signing in…' : 'Continue with Google'}
        disabled={attempt.kind === 'busy'}
        onPress={continueWithGoogle}
      />
    </View>
  );
}
