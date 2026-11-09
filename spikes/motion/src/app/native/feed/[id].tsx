import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { findItem, imageUri } from '@/spike/items';
import { printTag, printTransition } from '@/spike/native';
import { NativeBoundary } from '@/spike/NativeBoundary';
import { COLOR, FONT, LAYOUT, MOTION } from '@/spike/tokens';

export default function NativeFeed() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = findItem(id);
  const { width, height } = useWindowDimensions();
  if (!item) return null;

  return (
    <NativeBoundary>
    <View style={styles.room}>
      <Animated.View sharedTransitionTag={printTag(item.id)} sharedTransitionStyle={printTransition} style={{ width, height: height * LAYOUT.feedMediaRatio }}>
        <Image source={imageUri(item)} style={{ flex: 1 }} contentFit="cover" transition={0} />
      </Animated.View>
      <Animated.View entering={FadeIn.delay(MOTION.textDelayMs).duration(MOTION.baseMs)} style={styles.text}>
        <Text style={styles.note}>{item.note}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Pressable style={styles.read} onPress={() => router.push({ pathname: '/native/reader/[id]', params: { id: item.id } })}>
          <Text style={styles.readLabel}>Read</Text>
        </Pressable>
      </Animated.View>
    </View>
    </NativeBoundary>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1, backgroundColor: COLOR.screen },
  text: { paddingHorizontal: 18, paddingTop: 18 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: COLOR.screenInk, opacity: 0.65 },
  title: { fontFamily: FONT.serif, fontSize: 30, color: COLOR.screenInk, marginTop: 6, letterSpacing: -0.6 },
  read: { marginTop: 22, alignSelf: 'flex-start', backgroundColor: COLOR.screenInk, borderRadius: 99, paddingHorizontal: 28, paddingVertical: 12 },
  readLabel: { color: COLOR.screen, fontWeight: '600', fontSize: 15 },
});
