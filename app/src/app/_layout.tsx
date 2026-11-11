import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { authSession } from '@/auth/appSession';
import { useAuth } from '@/auth/useAuth';
import { useDatabaseReady } from '@/db/useDatabaseReady';
import { COLOR, FONT } from '@/share/tokens';

void SplashScreen.preventAutoHideAsync();

function DatabaseFailed({ error }: { readonly error: Error }) {
  return (
    <View style={styles.centered}>
      <Text style={styles.note}>{`Hang couldn't open its local database: ${error.message}`}</Text>
    </View>
  );
}

/** The splash stays up until the stored session is restored, so a signed-in user never sees the sign-in screen. */
export default function RootLayout() {
  const database = useDatabaseReady();
  const { status } = useAuth();
  const signedIn = status.kind === 'signedIn' || status.kind === 'signingOut';
  const settled = database.status === 'failed' || status.kind !== 'restoring';

  useEffect(() => {
    if (database.status === 'ready') void authSession.start();
  }, [database.status]);

  useEffect(() => {
    if (settled) SplashScreen.hide();
  }, [settled]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {database.status === 'failed' ? (
        <DatabaseFailed error={database.error} />
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLOR.wall } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="index" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: COLOR.wall },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 15, color: COLOR.ink3 },
});
