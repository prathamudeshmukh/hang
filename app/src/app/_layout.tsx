import { Stack } from 'expo-router';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as SystemUI from 'expo-system-ui';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { authSession } from '@/auth/appSession';
import { useAuth } from '@/auth/useAuth';
import { useDatabaseReady } from '@/db/useDatabaseReady';
import { syncTriggers } from '@/sync/syncWiring';
import { NoteText } from '@/theme/Text';
import { makeStyles, useTheme } from '@/theme/theme';

void SplashScreen.preventAutoHideAsync();

const useStyles = makeStyles(({ color }) => ({
  root: { flex: 1, backgroundColor: color.wall },
  centered: { flex: 1, justifyContent: 'center', padding: 24 },
}));

function DatabaseFailed({ error }: { readonly error: Error }) {
  const styles = useStyles();
  return (
    <View style={styles.centered}>
      <NoteText token="prompt">{`Hang couldn't open its local database: ${error.message}`}</NoteText>
    </View>
  );
}

/** The splash stays up until the stored session is restored, so a signed-in user never sees the sign-in screen. */
export default function RootLayout() {
  const styles = useStyles();
  const theme = useTheme();
  const database = useDatabaseReady();
  const { status } = useAuth();
  const signedIn = status.kind === 'signedIn' || status.kind === 'signingOut';
  const settled = database.status === 'failed' || status.kind !== 'restoring';

  // The window behind every screen, so a transition never flashes the other theme's color.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(theme.color.wall);
  }, [theme.color.wall]);

  useEffect(() => {
    if (database.status === 'ready') void authSession.start();
  }, [database.status]);

  useEffect(() => {
    if (settled) SplashScreen.hide();
  }, [settled]);

  // Only the main app syncs on foreground, reconnect, Realtime and retries; the share sheet syncs once on close.
  useEffect(() => {
    if (status.kind !== 'signedIn') return;
    syncTriggers.start();
    return () => syncTriggers.stop();
  }, [status.kind]);

  return (
    <GestureHandlerRootView style={styles.root}>
      {/* Both bars are transparent (edge-to-edge, no contrast scrim); their icons follow the theme. */}
      <StatusBar style="auto" />
      <NavigationBar style="auto" />
      {database.status === 'failed' ? (
        <DatabaseFailed error={database.error} />
      ) : (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.color.wall } }}>
          <Stack.Protected guard={signedIn}>
            <Stack.Screen name="index" />
            <Stack.Screen name="inbox" />
            <Stack.Screen name="collection/[id]" />
          </Stack.Protected>
          <Stack.Protected guard={!signedIn}>
            <Stack.Screen name="sign-in" />
          </Stack.Protected>
        </Stack>
      )}
    </GestureHandlerRootView>
  );
}
