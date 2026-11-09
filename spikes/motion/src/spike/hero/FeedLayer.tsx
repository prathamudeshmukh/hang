import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { imageUri, type SpikeItem } from '../items';
import { COLOR, FONT, MOTION } from '../tokens';
import type { Rect } from './useFlight';

interface Props {
  readonly item: SpikeItem;
  readonly mediaRect: Rect;
  readonly showMedia: boolean;
  readonly onRead: () => void;
  /** Fires once the media is actually drawn, so the flyer above it can be removed without a flash. */
  readonly onMediaDisplay: () => void;
}

export function FeedLayer({ item, mediaRect, showMedia, onRead, onMediaDisplay }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {showMedia && <Image source={imageUri(item)} style={{ position: 'absolute', left: mediaRect.x, top: mediaRect.y, width: mediaRect.width, height: mediaRect.height }} contentFit="cover" transition={0} onDisplay={onMediaDisplay} />}
      <Animated.View entering={FadeIn.delay(MOTION.textDelayMs).duration(MOTION.baseMs)} style={[styles.text, { top: mediaRect.y + mediaRect.height + 18 }]}>
        <Text style={styles.note}>{item.note}</Text>
        <Text style={styles.title}>{item.title}</Text>
        <Pressable style={styles.read} onPress={onRead}>
          <Text style={styles.readLabel}>Read</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  text: { position: 'absolute', left: 18, right: 18 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: COLOR.screenInk, opacity: 0.65 },
  title: { fontFamily: FONT.serif, fontSize: 30, color: COLOR.screenInk, marginTop: 6, letterSpacing: -0.6 },
  read: { marginTop: 22, alignSelf: 'flex-start', backgroundColor: COLOR.screenInk, borderRadius: 99, paddingHorizontal: 28, paddingVertical: 12 },
  readLabel: { color: COLOR.screen, fontWeight: '600', fontSize: 15 },
});
