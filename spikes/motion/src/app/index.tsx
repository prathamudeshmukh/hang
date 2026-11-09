import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLOR, FONT } from '@/spike/tokens';

const OPTIONS = [
  { href: '/native', name: 'A · Native shared transition', note: 'Reanimated sharedTransitionTag on the native stack (experimental flag on)' },
  { href: '/hero', name: 'B · Hand-built hero', note: 'Measure the print, fly a copy over the screen, swap underneath' },
] as const;

export default function Chooser() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wall, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Motion spike</Text>
      <Text style={styles.note}>
        Grid → feed → reader, then back. Watch the meter at the bottom: tap it to reset before each run.
      </Text>
      {OPTIONS.map((option) => (
        <Link key={option.href} href={option.href} asChild>
          <Pressable style={styles.option} android_ripple={{ color: 'rgba(27,26,23,0.08)' }}>
            <Text style={styles.optionName}>{option.name}</Text>
            <Text style={styles.note}>{option.note}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wall: { flex: 1, backgroundColor: COLOR.wall, paddingHorizontal: 16 },
  title: { fontFamily: FONT.serif, fontSize: 40, color: COLOR.ink, letterSpacing: -1 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 14, color: COLOR.ink3, marginTop: 6 },
  option: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLOR.rule, paddingVertical: 18, marginTop: 18 },
  optionName: { fontFamily: FONT.serif, fontSize: 22, color: COLOR.ink },
});
