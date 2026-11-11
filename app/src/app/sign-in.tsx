import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authSession } from '@/auth/appSession';
import { COLOR, FONT } from '@/share/tokens';

type Attempt = { readonly kind: 'idle' } | { readonly kind: 'busy' } | { readonly kind: 'failed'; readonly message: string };

/** Plain Phase 1 screen; the router swaps to Home once the session is signed in. */
export default function SignIn() {
  const insets = useSafeAreaInsets();
  const [attempt, setAttempt] = useState<Attempt>({ kind: 'idle' });

  async function continueWithGoogle() {
    setAttempt({ kind: 'busy' });
    const outcome = await authSession.signIn();
    setAttempt(outcome.kind === 'failed' ? { kind: 'failed', message: outcome.message } : { kind: 'idle' });
  }

  return (
    <View style={[styles.wall, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + 40 }]}>
      <Text style={styles.title}>Hang</Text>
      <Text style={styles.note}>Your links, hung on one wall.</Text>
      <View style={styles.spacer} />
      {attempt.kind === 'failed' && <Text style={styles.error}>{`Sign-in didn't work: ${attempt.message}`}</Text>}
      <Pressable
        testID="sign-in-google"
        accessibilityRole="button"
        disabled={attempt.kind === 'busy'}
        onPress={continueWithGoogle}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        {attempt.kind === 'busy' ? <ActivityIndicator color={COLOR.raised} /> : <Text style={styles.buttonLabel}>Continue with Google</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wall: { flex: 1, backgroundColor: COLOR.wall, paddingHorizontal: 24 },
  title: { fontFamily: FONT.serif, fontSize: 56, color: COLOR.ink, letterSpacing: -1.5 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 17, color: COLOR.ink3, marginTop: 6 },
  spacer: { flex: 1 },
  error: { fontFamily: FONT.serif, fontSize: 15, color: COLOR.accent, marginBottom: 16 },
  button: { backgroundColor: COLOR.ink, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
  pressed: { opacity: 0.85 },
  buttonLabel: { fontSize: 16, fontWeight: '600', color: COLOR.raised },
});
