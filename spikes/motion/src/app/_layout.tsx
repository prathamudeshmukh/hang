import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { FrameMeter } from '@/spike/FrameMeter';
import { COLOR } from '@/spike/tokens';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLOR.wall } }}>
        <Stack.Screen name="native/feed/[id]" options={{ contentStyle: { backgroundColor: COLOR.screen } }} />
      </Stack>
      <FrameMeter />
    </GestureHandlerRootView>
  );
}
