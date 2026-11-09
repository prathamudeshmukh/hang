import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { findItem, imageUri } from '@/spike/items';
import { printTag, printTransition } from '@/spike/native';
import { ReaderBody } from '@/spike/ReaderBody';
import { NativeBoundary } from '@/spike/NativeBoundary';
import { COLOR, LAYOUT } from '@/spike/tokens';

export default function NativeReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const item = findItem(id);
  const { width } = useWindowDimensions();
  if (!item) return null;

  return (
    <NativeBoundary>
    <ScrollView style={styles.wall} contentContainerStyle={{ paddingBottom: 120 }}>
      <Animated.View sharedTransitionTag={printTag(item.id)} sharedTransitionStyle={printTransition} style={{ width, height: LAYOUT.readerHeroHeight }}>
        <Image source={imageUri(item)} style={{ flex: 1 }} contentFit="cover" transition={0} />
      </Animated.View>
      <ReaderBody item={item} />
    </ScrollView>
    </NativeBoundary>
  );
}

const styles = StyleSheet.create({ wall: { flex: 1, backgroundColor: COLOR.wall } });
