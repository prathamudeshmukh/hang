import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authSession, unclaimedCount } from '@/auth/appSession';
import { useAuth } from '@/auth/useAuth';
import { useLiveQuery } from '@/home/useLiveQuery';
import { signInTagline } from '@/signIn/signInCopy';
import { HangMark } from '@/theme/HangMark.tsx';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';

type Attempt = { readonly kind: 'idle' } | { readonly kind: 'busy' } | { readonly kind: 'failed'; readonly message: string };

const MARK_SIZE = 56;
const TOP_GAP = 64;
const MARK_GAP = 22;
const BOTTOM_GAP = 40;
const SIDE = 24;

const useStyles = makeStyles(({ color }) => ({
  wall: { flex: 1, backgroundColor: color.wall, paddingHorizontal: SIDE },
  mark: { marginBottom: MARK_GAP },
  tagline: { marginTop: 6 },
  spacer: { flex: 1 },
  error: { marginBottom: 16 },
}));

/**
 * The router shows this route under the splash while the stored session is still restoring, when the database
 * may still be migrating. Only a settled, signed-out session gets the wall, which reads the database.
 */
export default function SignIn() {
  const styles = useStyles();
  const { status } = useAuth();
  if (status.kind === 'restoring') return <View style={styles.wall} />;
  return <SignInWall />;
}

/** The router swaps to Home once the session is signed in. The splash fades out over this, mark in place (#77). */
function SignInWall() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [attempt, setAttempt] = useState<Attempt>({ kind: 'idle' });
  const waiting = useLiveQuery(unclaimedCount, 'sign-in:waiting');

  async function continueWithGoogle() {
    setAttempt({ kind: 'busy' });
    const outcome = await authSession.signIn();
    setAttempt(outcome.kind === 'failed' ? { kind: 'failed', message: outcome.message } : { kind: 'idle' });
  }

  return (
    <View style={[styles.wall, { paddingTop: insets.top + TOP_GAP, paddingBottom: insets.bottom + BOTTOM_GAP }]}>
      <View style={styles.mark}>
        <HangMark size={MARK_SIZE} />
      </View>
      <NameText token="display">Hang</NameText>
      <NoteText testID="sign-in-tagline" token="prompt" style={styles.tagline}>{signInTagline(waiting)}</NoteText>
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
