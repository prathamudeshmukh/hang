import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { READER_BODY, type SpikeItem } from './items';
import { COLOR, FONT, MOTION } from './tokens';

export function ReaderBody({ item }: { readonly item: SpikeItem }) {
  return (
    <Animated.View entering={FadeIn.delay(MOTION.textDelayMs).duration(MOTION.baseMs)} style={styles.body}>
      <Text style={styles.note}>{item.note}</Text>
      <Text style={styles.title}>{item.title}</Text>
      {READER_BODY.map((paragraph) => (
        <Text key={paragraph.slice(0, 12)} style={styles.paragraph}>{paragraph}</Text>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingTop: 16 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: COLOR.ink3 },
  title: { fontFamily: FONT.serif, fontSize: 28, color: COLOR.ink, marginTop: 6, letterSpacing: -0.5 },
  paragraph: { fontFamily: FONT.serif, fontSize: 17, lineHeight: 27, color: COLOR.ink, marginTop: 14 },
});
