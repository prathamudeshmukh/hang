import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import { imageUri, ITEMS } from '@/spike/items';
import { Masonry } from '@/spike/Masonry';
import { printTag, printTransition } from '@/spike/native';
import { NativeBoundary } from '@/spike/NativeBoundary';
import { LAYOUT } from '@/spike/tokens';

export default function NativeGrid() {
  return (
    <NativeBoundary>
    <Masonry
      title="Design inspo"
      items={ITEMS}
      renderPrint={(item, size) => (
        <Pressable onPress={() => router.push({ pathname: '/native/feed/[id]', params: { id: item.id } })}>
          <Animated.View sharedTransitionTag={printTag(item.id)} sharedTransitionStyle={printTransition} style={[size, { borderRadius: LAYOUT.printRadius, overflow: 'hidden' }]}>
            <Image source={imageUri(item)} style={{ flex: 1 }} contentFit="cover" transition={0} />
          </Animated.View>
        </Pressable>
      )}
    />
    </NativeBoundary>
  );
}
