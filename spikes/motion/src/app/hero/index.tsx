import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { FeedLayer } from '@/spike/hero/FeedLayer';
import { measure, type Measurable, type Rect } from '@/spike/hero/useFlight';
import { useHeroScene } from '@/spike/hero/useHeroScene';
import { imageUri, ITEMS, type SpikeItem } from '@/spike/items';
import { Masonry } from '@/spike/Masonry';
import { ReaderBody } from '@/spike/ReaderBody';
import { COLOR, LAYOUT } from '@/spike/tokens';

const TO_FEED = { dark: 1, paper: 0 } as const;
const TO_READER = { dark: 1, paper: 1 } as const;
const TO_GRID = { dark: 0, paper: 0 } as const;

export default function HeroSpike() {
  const { width, height } = useWindowDimensions();
  const feedRect = useMemo<Rect>(() => ({ x: 0, y: 0, width, height: height * LAYOUT.feedMediaRatio }), [width, height]);
  const readerRect = useMemo<Rect>(() => ({ x: 0, y: 0, width, height: LAYOUT.readerHeroHeight }), [width]);
  const prints = useRef(new Map<string, Measurable | null>());
  const { scene, depart, onFlyerDrawn, onDestinationDrawn, flyerStyle, darkStyle, paperStyle } = useHeroScene();
  const { stage, item, phase } = scene;

  const openFeed = async (next: SpikeItem) => {
    const from = await measure(prints.current.get(next.id) ?? null);
    depart({ item: next, route: { from, to: feedRect }, stage: 'feed', backdrop: TO_FEED });
  };

  const openReader = (current: SpikeItem) => {
    depart({ item: current, route: { from: feedRect, to: readerRect }, stage: 'reader', backdrop: TO_READER });
  };

  const goBack = useCallback(async () => {
    if (!item || phase !== 'idle') return;
    if (stage === 'reader') {
      depart({ item, route: { from: readerRect, to: feedRect }, stage: 'feed', backdrop: TO_FEED });
      return;
    }
    const to = await measure(prints.current.get(item.id) ?? null);
    depart({ item, route: { from: feedRect, to }, stage: 'grid', backdrop: TO_GRID });
  }, [item, phase, stage, depart, feedRect, readerRect]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stage === 'grid' && phase === 'idle') return false;
      void goBack();
      return true;
    });
    return () => sub.remove();
  }, [stage, phase, goBack]);

  const printHidden = item !== undefined && phase !== 'boarding' && !(stage === 'grid' && phase === 'idle');
  const destinationMounted = phase === 'settling' || phase === 'idle';

  return (
    <View style={styles.root}>
      <Masonry
        title="Design inspo"
        items={ITEMS}
        renderPrint={(print, size) => (
          <Pressable onPress={() => openFeed(print)} disabled={phase !== 'idle'}>
            <View ref={(view) => { prints.current.set(print.id, view); }} collapsable={false} style={[size, styles.print, { opacity: printHidden && print.id === item?.id ? 0 : 1 }]}>
              <Image source={imageUri(print)} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} />
            </View>
          </Pressable>
        )}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: COLOR.screen }, darkStyle]} />
      {item && stage === 'feed' && destinationMounted && (
        <FeedLayer item={item} mediaRect={feedRect} showMedia onRead={() => openReader(item)} onMediaDisplay={onDestinationDrawn} />
      )}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: COLOR.wall }, paperStyle]} />
      {item && stage === 'reader' && destinationMounted && (
        <ScrollView style={StyleSheet.absoluteFill} contentContainerStyle={{ paddingBottom: 120 }}>
          <Image source={imageUri(item)} style={{ width, height: LAYOUT.readerHeroHeight }} contentFit="cover" transition={0} onDisplay={onDestinationDrawn} />
          <ReaderBody item={item} />
        </ScrollView>
      )}
      {item && (
        <Animated.View pointerEvents="none" style={[flyerStyle, styles.flyer, { opacity: phase === 'idle' ? 0 : 1 }]}>
          <Image source={imageUri(item)} style={StyleSheet.absoluteFill} contentFit="cover" transition={0} onDisplay={onFlyerDrawn} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLOR.wall },
  print: { borderRadius: LAYOUT.printRadius, overflow: 'hidden' },
  flyer: { overflow: 'hidden' },
});
