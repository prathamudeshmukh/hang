import { Image } from 'expo-image';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle } from 'react-native-reanimated';
import { useTheme } from '@/theme/theme';
import { RADIUS, SCREENING_ROOM } from '@/theme/tokens';
import { hero } from './appHero';
import type { Look } from './look';
import { inAir, type Flight } from './trip';
import { useStage, type StageValues } from './useStage';

const TOP_ANCHORED = 'top';

/** Input waits while anything is in the air (#32 decision 6); added last, so it runs before navigation's. */
function useBlockBack(blocked: boolean) {
  useEffect(() => {
    if (!blocked) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [blocked]);
}

function useFlyerStyles({ from, to, progress, flyerOpacity, colors, backdrop }: StageValues) {
  const flyer = useAnimatedStyle(() => {
    const t = progress.value;
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return {
      left: lerp(from.value.x, to.value.x),
      top: lerp(from.value.y, to.value.y),
      width: lerp(from.value.width, to.value.width),
      height: lerp(from.value.height, to.value.height),
      opacity: flyerOpacity.value,
    };
  });
  const frame = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(progress.value, [0, 1], [colors.value[0], colors.value[1]]) }));
  const room = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  return { flyer, frame, room };
}

/** Spike 0b's rule: the flight only launches once the flyer is drawn. */
function Flyer({ flight, look, styles }: { readonly flight: Flight; readonly look: Look; readonly styles: ReturnType<typeof useFlyerStyles> }) {
  if (look.kind === 'picture') {
    return (
      <Animated.View style={[layer.flyer, styles.flyer]}>
        <Image key={flight.id} source={{ uri: look.uri }} style={layer.fill} contentFit="cover" contentPosition={TOP_ANCHORED} transition={0} onDisplay={hero.flyerDrawn} />
      </Animated.View>
    );
  }
  return <Animated.View key={flight.id} style={[layer.flyer, styles.flyer, styles.frame]} onLayout={hero.flyerDrawn} />;
}

/** Over every screen: the backdrop and the one print in the air (#32). Draws nothing while idle. */
export function HeroLayer() {
  const trip = useSyncExternalStore(hero.subscribe, hero.trip);
  const { color } = useTheme();
  const wallRaised = useRef(color.raised);
  useEffect(() => {
    wallRaised.current = color.raised;
  }, [color.raised]);
  const { values, stage } = useStage(() => wallRaised.current);
  const styles = useFlyerStyles(values);
  useEffect(() => hero.attachStage(stage), [stage]);
  useBlockBack(inAir(trip));

  if (trip.phase === 'idle') return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {'flight' in trip ? (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, layer.room, styles.room]} />
          <Flyer flight={trip.flight} look={trip.flight.look} styles={styles} />
        </>
      ) : null}
    </View>
  );
}

const layer = StyleSheet.create({
  room: { backgroundColor: SCREENING_ROOM.wall },
  flyer: { position: 'absolute', borderRadius: RADIUS.print, overflow: 'hidden' },
  fill: { width: '100%', height: '100%' },
});
