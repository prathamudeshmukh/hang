import { SharedTransition } from 'react-native-reanimated';
import { MOTION } from './tokens';

/**
 * Docs only list duration() and springify(); SharedTransition extends ComplexAnimationBuilder,
 * so easing() is attempted here. Part of what the spike checks.
 */
export const printTransition = SharedTransition.duration(MOTION.baseMs).easing(MOTION.easing);

export const printTag = (id: string) => `print-${id}`;
